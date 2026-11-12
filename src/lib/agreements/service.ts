import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import {
  assert,
  DealError,
  fresh,
  mayReadLegal,
  resolveDate,
  sourceValid,
  validateWorkspace,
  validateTerm,
  executionBlockers,
  type Workspace,
  type DealType,
  type Term,
  type Issue,
} from './domain'
export type Actor = { id: string }
export const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue
export const digest = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex')
export function privateAccess(actor: Actor) {
  if (!mayReadLegal(actor.id))
    throw new DealError(403, 'Restricted legal access denied')
}
export function businessOnly(body: Record<string, unknown>) {
  assert(
    body.classification === 'BUSINESS',
    'Confirm business-only content. Advice, mixed/redlines and sensitive identifiers belong in restricted Legal.',
  )
  assert(JSON.stringify(body).length <= 500000, 'Request too large')
}
export async function getDeal(id: string) {
  const [legacy, row, documents, events, reminders, imports] =
    await Promise.all([
      prisma.projectAgreement.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, title: true } },
          contacts: {
            include: { contact: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.agreementWorkspace.findUnique({ where: { id } }),
      prisma.agreementDocument.findMany({
        where: { agreementId: id },
        select: {
          id: true,
          name: true,
          mimeType: true,
          hash: true,
          parentId: true,
          classification: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agreementEvent.findMany({
        where: { agreementId: id },
        orderBy: { version: 'desc' },
        take: 100,
      }),
      prisma.agreementReminder.findMany({
        where: { agreementId: id },
        orderBy: { dueAt: 'asc' },
      }),
      prisma.agreementImport.findMany({
        where: { agreementId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])
  if (!legacy) throw new DealError(404, 'Agreement not found')
  return {
    legacy,
    version: row?.version ?? 0,
    workspace: (row?.data ?? null) as unknown as Workspace | null,
    documents,
    events,
    reminders,
    imports,
  }
}
export async function createDeal(actor: Actor, body: Record<string, unknown>) {
  businessOnly(body)
  assert(
    typeof body.title === 'string' &&
      body.title.trim() &&
      body.title.length <= 300,
    'Title required',
  )
  assert(typeof body.projectId === 'string', 'Project required')
  const w = fresh(body.type as DealType)
  if (Array.isArray(body.ipIds)) w.ipIds = body.ipIds as string[]
  if (Array.isArray(body.parties))
    w.parties = body.parties as Workspace['parties']
  validateWorkspace(w)
  return prisma.$transaction(
    async (tx) => {
      if (body.templateVersion)
        await selectTemplate(tx, w, String(body.templateVersion))
      validateWorkspace(w)
      await validateLinks(tx, w)
      const legacy = await tx.projectAgreement.create({
        data: {
          title: body.title as string,
          projectId: body.projectId as string,
          agreementType: w.type,
        },
      })
      await tx.agreementWorkspace.create({
        data: { id: legacy.id, data: json(w) },
      })
      await linkPartyContacts(tx, legacy.id, w)
      await tx.agreementEvent.create({
        data: {
          agreementId: legacy.id,
          version: 1,
          actorId: actor.id,
          action: 'CREATED',
          data: json(w),
        },
      })
      return { id: legacy.id }
    },
    { isolationLevel: 'Serializable' },
  )
}
async function validateLinks(tx: Prisma.TransactionClient, w: Workspace) {
  assert(
    w.ipIds.every((id) => typeof id === 'string'),
    'Invalid IP links',
  )
  assert(new Set(w.ipIds).size === w.ipIds.length, 'Duplicate IP link')
  assert(
    (await tx.ipProperty.count({ where: { id: { in: w.ipIds } } })) ===
      w.ipIds.length,
    'IP link not found',
  )
  for (const p of w.parties) {
    assert(p.id && p.name && p.role, 'Party name and role required')
    if (p.contactId)
      assert(
        (await tx.contact.count({ where: { id: p.contactId } })) === 1,
        'Contact not found',
      )
  }
}
function cleanKeys(obj: object, keys: string[]) {
  assert(
    obj && typeof obj === 'object' && !Array.isArray(obj),
    'Object required',
  )
  assert(
    Object.keys(obj).every((k) => keys.includes(k)),
    'Unexpected field',
  )
}
function stamp() {
  return new Date().toISOString()
}
export async function changeDeal(
  actor: Actor,
  id: string,
  body: Record<string, unknown>,
) {
  businessOnly(body)
  assert(Number.isInteger(body.version), 'Expected version required')
  assert(typeof body.action === 'string', 'Action required')
  return prisma.$transaction(
    async (tx) => {
      if (body.action === 'applyImport') {
        privateAccess(actor)
        const prior = await tx.agreementImport.findUnique({
          where: { id: String(body.value) },
        })
        if (prior?.agreementId === id && prior.state === 'APPLIED')
          return {
            replayed: true,
            version: (await tx.agreementWorkspace.findUnique({ where: { id } }))
              ?.version,
          }
      }
      const row = await tx.agreementWorkspace.findUnique({ where: { id } })
      const legacy = await tx.projectAgreement.findUnique({ where: { id } })
      if (!legacy) throw new DealError(404, 'Agreement not found')
      if ((row?.version ?? 0) !== body.version)
        throw new DealError(
          409,
          'Agreement changed. Reload before reconciling your edits.',
        )
      let w: Workspace = row
        ? JSON.parse(JSON.stringify(row.data))
        : fresh(body.type as DealType)
      const at = stamp()
      switch (body.action) {
        case 'initialize':
          assert(!row, 'Already initialized')
          if (body.templateVersion)
            await selectTemplate(tx, w, String(body.templateVersion))
          break
        case 'template':
          assert(
            w.stage !== 'EXECUTED_COPY_FILED' &&
              !w.terms.some((t) => t.status === 'EXECUTED'),
            'Do not change template lineage after operative execution; use an amendment record',
          )
          await selectTemplate(tx, w, String(body.value))
          break
        case 'overview': {
          const v = body.value as Partial<Workspace>
          cleanKeys(v, [
            'ballHolder',
            'ballSince',
            'nextAction',
            'businessNotes',
            'parties',
            'ipIds',
            'leadDays',
          ])
          w = { ...w, ...v }
          if (v.parties) w.execution = null
          break
        }
        case 'stage': {
          const v = body.value as {
            stage: Workspace['stage']
            source: { reference: string; locator: string }
          }
          assert(sourceValid(v.source), 'Stage change source required')
          w.stage = v.stage
          break
        }
        case 'term': {
          const t = {
            ...(body.value as Term),
            id: randomUUID(),
            actorId: actor.id,
            createdAt: at,
          }
          cleanKeys(t, [
            'id',
            'field',
            'state',
            'status',
            'text',
            'money',
            'percentage',
            'allocations',
            'source',
            'supersedes',
            'actorId',
            'createdAt',
          ])
          validateTerm(t, w.type)
          if (t.supersedes)
            assert(
              w.terms.some(
                (old) => old.id === t.supersedes && old.field === t.field,
              ),
              'Superseded term must exist with same field',
            )
          if (t.status === 'EXECUTED')
            assert(
              w.execution && executionBlockers(w).length === 0,
              'Review execution before recording operative terms',
            )
          w.terms.push(t)
          break
        }
        case 'period': {
          const v = body.value as Workspace['periods'][number]
          cleanKeys(v, [
            'id',
            'label',
            'anchor',
            'duration',
            'fee',
            'creditable',
            'prerequisites',
            'automaticExtension',
            'source',
          ])
          assert(
            !w.periods.some((x) => x.id === v.id),
            'Periods are immutable; add a reviewed replacement period',
          )
          w.periods.push({ ...v, id: v.id || randomUUID() })
          break
        }
        case 'date': {
          const v = body.value as Workspace['dates'][number]
          cleanKeys(v, [
            'id',
            'label',
            'absolute',
            'anchorId',
            'offset',
            'unit',
            'monthEnd',
            'rule',
            'timezone',
            'holidays',
            'notice',
            'owner',
            'source',
            'reviewed',
          ])
          assert(
            v.label && Array.isArray(v.holidays),
            'Date label and holiday calendar required',
          )
          w.dates = w.dates.filter((x) => x.id !== v.id)
          w.dates.push({ ...v, id: v.id || randomUUID() })
          break
        }
        case 'payment': {
          const v = body.value as Workspace['payments'][number]
          cleanKeys(v, [
            'id',
            'label',
            'money',
            'payee',
            'trigger',
            'conditions',
            'exclusions',
            'offsets',
            'dueDateId',
            'state',
            'paidEvidence',
            'source',
          ])
          w.payments = w.payments.filter((x) => x.id !== v.id)
          w.payments.push({ ...v, id: v.id || randomUUID() })
          break
        }
        case 'issue': {
          const v = body.value as Issue
          cleanKeys(v, [
            'id',
            'title',
            'ask',
            'counter',
            'current',
            'outcome',
            'state',
            'source',
          ])
          assert(
            sourceValid(v.source) && ['OPEN', 'RESOLVED'].includes(v.state),
            'Issue state and evidence required',
          )
          const old = w.issues.find((x) => x.id === v.id)
          w.issues = w.issues.filter((x) => x.id !== v.id)
          w.issues.push({
            ...v,
            id: v.id || randomUUID(),
            history: [
              ...(old?.history ?? []),
              { at, actorId: actor.id, state: v.state, outcome: v.outcome },
            ],
          })
          break
        }
        case 'check': {
          const v = body.value as Workspace['checks'][number]
          cleanKeys(v, ['id', 'label', 'state', 'source'])
          w.checks = w.checks.filter((x) => x.id !== v.id)
          w.checks.push({ ...v, id: v.id || randomUUID() })
          break
        }
        case 'approval': {
          privateAccess(actor)
          const v = body.value as Workspace['approval']
          assert(
            ['APPROVED', 'DECLINED'].includes(v.decision) &&
              sourceValid(v.source),
            'Approval decision and evidence required',
          )
          w.approval = {
            decision: v.decision,
            source: v.source,
            actorId: actor.id,
            at,
          }
          break
        }
        case 'execution': {
          const v = body.value as Workspace['execution']
          assert(v, 'Execution review required')
          cleanKeys(v, [
            'documentId',
            'signatures',
            'effectiveBasis',
            'conditions',
            'conditionEvidence',
          ])
          assert(
            (await tx.agreementDocument.count({
              where: { id: v.documentId, agreementId: id },
            })) === 1,
            'Choose a business-classified executed copy; never expose a restricted file',
          )
          w.execution = v
          assert(
            executionBlockers(w).length === 0,
            executionBlockers(w).join('; '),
          )
          break
        }
        case 'applyImport': {
          privateAccess(actor)
          const proposal = await tx.agreementImport.findUnique({
            where: { id: String(body.value) },
          })
          assert(proposal && proposal.agreementId === id, 'Proposal not found')
          if (proposal.state === 'APPLIED')
            throw new DealError(409, 'Proposal already applied')
          assert(
            proposal.expectedVersion === body.version,
            'Proposal is stale; stage a new reviewed proposal',
          )
          const terms = proposal.data as unknown as Term[]
          for (const term of terms) {
            assert(
              term.status === 'PROPOSED',
              'Backfill may only propose terms',
            )
            validateTerm(term, w.type)
            w.terms.push({
              ...term,
              id: randomUUID(),
              actorId: actor.id,
              createdAt: at,
            })
          }
          await tx.agreementImport.update({
            where: { id: proposal.id },
            data: { state: 'APPLIED', reviewedBy: actor.id },
          })
          break
        }
        default:
          throw new DealError(400, 'Unsupported action')
      }
      validateWorkspace(w)
      await validateLinks(tx, w)
      await linkPartyContacts(tx, id, w)
      if (body.action === 'date') {
        for (const d of w.dates) {
          const due = resolveDate(d.id, w.dates)
          await tx.agreementReminder.updateMany({
            where: {
              agreementId: id,
              dateId: d.id,
              ...(due ? { dueAt: { not: new Date(due + 'T12:00:00Z') } } : {}),
            },
            data: {
              state: 'SUPERSEDED',
              error:
                'Prior date calculation retained; a reviewed extension/revision changed or unresolved this due date.',
            },
          })
        }
      }
      const version = (row?.version ?? 0) + 1
      if (row) {
        const changed = await tx.agreementWorkspace.updateMany({
          where: { id, version: row.version },
          data: { version, data: json(w) },
        })
        if (changed.count !== 1)
          throw new DealError(409, 'Concurrent edit; reload')
      } else
        await tx.agreementWorkspace.create({
          data: { id, version, data: json(w) },
        })
      await tx.agreementEvent.create({
        data: {
          agreementId: id,
          version,
          actorId: actor.id,
          action: body.action as string,
          data: json({
            snapshot: w,
            source: (body.value as { source?: unknown })?.source ?? null,
          }),
        },
      })
      return { version }
    },
    { isolationLevel: 'Serializable' },
  )
}
export async function stageImport(
  actor: Actor,
  id: string,
  body: Record<string, unknown>,
) {
  businessOnly(body)
  assert(
    typeof body.requestId === 'string' &&
      /^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId),
    'Stable request ID required',
  )
  assert(
    Array.isArray(body.terms) &&
      body.terms.length > 0 &&
      body.terms.length <= 100,
    '1–100 business terms required',
  )
  const row = await prisma.agreementWorkspace.findUnique({ where: { id } })
  assert(
    row && row.version === body.version,
    'Current expected version required',
  )
  const w = row.data as unknown as Workspace
  for (const t of body.terms as Term[]) {
    assert(t.status === 'PROPOSED', 'Imports are proposals only')
    validateTerm(t, w.type)
    assert(sourceValid(t.source), 'Per-field citation required')
  }
  const fingerprint = digest(body)
  const key = 'import-' + digest([actor.id, body.requestId])
  const existing = await prisma.agreementImport.findUnique({
    where: { id: key },
  })
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw new DealError(409, 'Request ID reused with different content')
    return existing
  }
  return prisma.agreementImport.create({
    data: {
      id: key,
      fingerprint,
      agreementId: id,
      expectedVersion: row.version,
      data: json(body.terms),
      actorId: actor.id,
    },
  })
}
export async function runReminders(id: string, now = new Date()) {
  return prisma.$transaction(
    async (tx) => {
      const row = await tx.agreementWorkspace.findUnique({ where: { id } })
      assert(row, 'Initialize agreement first')
      const w = row.data as unknown as Workspace
      let created = 0
      for (const d of w.dates) {
        const date = resolveDate(d.id, w.dates)
        if (!date) continue
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: d.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now)
        for (const lead of w.leadDays) {
          const trigger = new Date(date + 'T12:00:00Z')
          trigger.setUTCDate(trigger.getUTCDate() - lead)
          if (trigger.toISOString().slice(0, 10) > today) continue
          const key = digest([id, d.id, date, lead])
          const result = await tx.agreementReminder.upsert({
            where: { id: key },
            create: {
              id: key,
              agreementId: id,
              dateId: d.id,
              dueAt: new Date(date + 'T12:00:00Z'),
            },
            update: {},
          })
          if (
            result.state === 'SNOOZED' &&
            result.snoozedUntil &&
            result.snoozedUntil <= now
          )
            await tx.agreementReminder.update({
              where: { id: key },
              data: {
                state: 'DELIVERED',
                snoozedUntil: null,
                attempts: { increment: 1 },
              },
            })
          if (result.createdAt.getTime() >= now.getTime()) created++
        }
      }
      return { created, channel: 'IN_APP', external: 'DISABLED' }
    },
    { isolationLevel: 'Serializable' },
  )
}
export async function syncIp(
  actor: Actor,
  id: string,
  body: Record<string, unknown>,
) {
  privateAccess(actor)
  businessOnly(body)
  assert(
    body.reviewed === true && sourceValid(body.source as never),
    'Explicit review and source required',
  )
  assert(
    ['OPTIONED', 'SECURED'].includes(String(body.status)),
    'Choose optioned or acquired (SECURED)',
  )
  return prisma.$transaction(
    async (tx) => {
      const row = await tx.agreementWorkspace.findUnique({ where: { id } })
      assert(row && row.version === body.version, 'Agreement changed')
      const w = row.data as unknown as Workspace
      assert(
        w.stage === 'EXECUTED_COPY_FILED' && executionBlockers(w).length === 0,
        'Verified execution required',
      )
      assert(
        w.checks.length > 0 &&
          w.checks.every(
            (c) => c.state === 'CONFIRMED' && sourceValid(c.source),
          ),
        'All title checks need explicit evidence',
      )
      assert(
        typeof body.ipId === 'string' && w.ipIds.includes(body.ipId),
        'Linked IP required',
      )
      const ip = await tx.ipProperty.findUnique({ where: { id: body.ipId } })
      assert(
        ip && ip.updatedAt.toISOString() === body.ipVersion,
        'IP changed; review current value',
      )
      const others = await tx.agreementWorkspace.findMany({
        where: { id: { not: id } },
      })
      const conflicts = others.filter((x) => {
        const a = x.data as unknown as Workspace
        return (
          a.ipIds.includes(body.ipId as string) &&
          a.stage === 'EXECUTED_COPY_FILED'
        )
      })
      assert(
        !conflicts.length,
        'Competing executed agreement claims require reconciliation; no sync performed',
      )
      const dates: Record<string, Date | null> = {}
      for (const field of [
        'optionStartDate',
        'optionExpiryDate',
        'extensionDeadline',
      ]) {
        const dateId = (body.dates as Record<string, string> | undefined)?.[
          field
        ]
        if (dateId) {
          const date = resolveDate(dateId, w.dates)
          assert(date, 'Unresolved dates cannot sync')
          dates[field] = new Date(date + 'T00:00:00Z')
        }
      }
      const changed = await tx.ipProperty.updateMany({
        where: { id: ip.id, updatedAt: ip.updatedAt },
        data: { status: body.status as 'OPTIONED' | 'SECURED', ...dates },
      })
      assert(changed.count === 1, 'IP concurrent change')
      const version = row.version + 1
      await tx.agreementWorkspace.update({
        where: { id, version: row.version },
        data: { version },
      })
      await tx.agreementEvent.create({
        data: {
          agreementId: id,
          version,
          actorId: actor.id,
          action: 'IP_SYNC',
          data: json({
            ipId: ip.id,
            before: {
              status: ip.status,
              optionStartDate: ip.optionStartDate,
              optionExpiryDate: ip.optionExpiryDate,
              extensionDeadline: ip.extensionDeadline,
            },
            after: { status: body.status, ...dates },
            source: body.source,
          }),
        },
      })
      return { version, chainOfTitle: 'UNCHANGED' }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function selectTemplate(
  tx: Prisma.TransactionClient,
  w: Workspace,
  id: string,
) {
  const template = await tx.agreementTemplate.findUnique({ where: { id } })
  assert(
    template && template.type === w.type && template.status === 'APPROVED',
    'Selected template version is unavailable, unapproved or for another agreement type',
  )
  w.templateVersion = template.id
  w.templateStatus = 'APPROVED'
  w.templateLineage = [
    ...(w.templateLineage ?? []),
    {
      id: template.id,
      versionLabel: template.versionLabel,
      hash: template.hash,
      selectedAt: new Date().toISOString(),
    },
  ]
}

// Add contact-directory visibility without deleting or rewriting legacy links.
async function linkPartyContacts(
  tx: Prisma.TransactionClient,
  id: string,
  w: Workspace,
) {
  for (const contactId of new Set(
    w.parties.map((p) => p.contactId).filter(Boolean),
  )) {
    const role = w.parties
      .filter((p) => p.contactId === contactId)
      .map((p) => p.role)
      .join('; ')
    await tx.projectAgreementContact.upsert({
      where: { agreementId_contactId: { agreementId: id, contactId } },
      create: { agreementId: id, contactId, role },
      update: {},
    })
  }
}
