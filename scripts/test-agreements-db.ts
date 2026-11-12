import strict from 'node:assert/strict'
import { prisma } from '../src/lib/db'
import {
  changeDeal,
  createDeal,
  getDeal,
  stageImport,
  runReminders,
  syncIp,
} from '../src/lib/agreements/service'
import { emptyMoney, type Workspace } from '../src/lib/agreements/domain'
const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/')
strict.ok(
  ['localhost', '127.0.0.1'].includes(url.hostname) &&
    url.pathname === '/hawco_agreements_dev_20261112',
  'Synthetic loopback DB only',
)
const actor = { id: 'agreements-synthetic-owner' }
process.env.AGREEMENTS_PHILIP_USER_ID = actor.id
const s = { reference: 'SYNTHETIC evidence', locator: 'clause 1' }
async function main() {
  const oldIds = (
    await prisma.projectAgreement.findMany({
      where: { projectId: 'agreements-synthetic-project' },
      select: { id: true },
    })
  ).map((a) => a.id)
  for (const model of [
    prisma.agreementEvent,
    prisma.agreementDocument,
    prisma.agreementLegal,
    prisma.agreementReminder,
    prisma.agreementImport,
  ])
    await (model as typeof prisma.agreementEvent).deleteMany({
      where: { agreementId: { in: oldIds } },
    })
  await prisma.agreementWorkspace.deleteMany({ where: { id: { in: oldIds } } })
  await prisma.projectAgreement.deleteMany({ where: { id: { in: oldIds } } })
  await prisma.user.upsert({
    where: { id: actor.id },
    create: {
      id: actor.id,
      email: 'agreements-owner@example.invalid',
      name: 'Synthetic Owner',
      password: 'NO_LOGIN',
      role: 'MEMBER',
    },
    update: {},
  })
  const project = await prisma.project.upsert({
    where: { id: 'agreements-synthetic-project' },
    create: {
      id: 'agreements-synthetic-project',
      title: 'Synthetic Agreements Project',
    },
    update: {},
  })
  const contact = await prisma.contact.upsert({
    where: { id: 'agreements-synthetic-contact' },
    create: {
      id: 'agreements-synthetic-contact',
      name: 'Synthetic Writer',
      type: 'WRITER',
    },
    update: {},
  })
  const ip = await prisma.ipProperty.upsert({
    where: { id: 'agreements-synthetic-ip' },
    create: {
      id: 'agreements-synthetic-ip',
      title: 'Synthetic Underlying Work',
      type: 'BOOK',
    },
    update: { status: 'TO_RESEARCH' },
  })
  const created = await createDeal(actor, {
    classification: 'BUSINESS',
    title: 'Synthetic Three-Period Literary Deal',
    projectId: project.id,
    type: 'LITERARY_OPTION',
    ipIds: [ip.id],
  })
  const id = created.id
  let version = 1
  async function change(action: string, value: unknown) {
    const result = await changeDeal(actor, id, {
      classification: 'BUSINESS',
      version,
      action,
      value,
    })
    version = result.version!
    return result
  }
  await change('overview', {
    ballHolder: 'Synthetic producer',
    ballSince: '2026-11-12',
    nextAction: 'Review signatures',
    parties: [
      {
        id: 'party-a',
        name: 'Synthetic Owner A',
        role: 'owner',
        contactId: contact.id,
        loanOut: 'Synthetic Loanout',
        agent: 'Synthetic agent',
        lawyer: 'Synthetic lawyer',
        payee: 'A',
        requiredSignature: true,
      },
      {
        id: 'party-b',
        name: 'Synthetic Owner B',
        role: 'owner',
        contactId: '',
        loanOut: '',
        agent: '',
        lawyer: '',
        payee: 'B',
        requiredSignature: true,
      },
    ],
  })
  for (let n = 1; n <= 3; n++)
    await change('period', {
      id: 'period-' + n,
      label: 'Period ' + n,
      anchor: n === 1 ? 'effective date' : 'previous expiry',
      duration: '12 months',
      fee: {
        ...emptyMoney(),
        amount: String(n * 100),
        currency: 'CAD',
        tax: 'plus applicable tax',
        basis: 'flat period fee',
      },
      creditable: n === 3 ? 'NO' : 'YES',
      prerequisites: 'written notice and payment',
      automaticExtension: 'none agreed',
      source: s,
    })
  await strict.rejects(() =>
    change('term', {
      field: 'author_owner_publisher',
      state: 'KNOWN',
      status: 'PROPOSED',
      text: 'A and B',
      source: { reference: '', locator: '' },
    }),
  )
  await change('term', {
    field: 'author_owner_publisher',
    state: 'KNOWN',
    status: 'PROPOSED',
    text: 'Two coowners',
    allocations: [
      {
        partyId: 'party-a',
        share: '50',
        basis: 'gross purchase amount',
        source: s,
      },
      {
        partyId: 'party-b',
        share: '50',
        basis: 'gross purchase amount',
        source: s,
      },
    ],
    source: s,
  })
  await strict.rejects(() =>
    changeDeal(actor, id, {
      classification: 'BUSINESS',
      version: 1,
      action: 'overview',
      value: { nextAction: 'stale overwrite' },
    }),
  )
  const concurrently = await Promise.allSettled([
    changeDeal(actor, id, {
      classification: 'BUSINESS',
      version,
      action: 'overview',
      value: { nextAction: 'Concurrent A' },
    }),
    changeDeal(actor, id, {
      classification: 'BUSINESS',
      version,
      action: 'overview',
      value: { nextAction: 'Concurrent B' },
    }),
  ])
  strict.equal(concurrently.filter((r) => r.status === 'fulfilled').length, 1)
  version = (await getDeal(id)).version
  await strict.rejects(() =>
    change('stage', { stage: 'EXECUTED_COPY_FILED', source: s }),
  )
  const doc = await prisma.agreementDocument.create({
    data: {
      agreementId: id,
      name: 'synthetic-executed.txt',
      mimeType: 'text/plain',
      hash: 'synthetic-test-hash',
      classification: 'BUSINESS',
      source: 'Synthetic fixture',
      bytes: Buffer.from('SYNTHETIC signature copy'),
      actorId: actor.id,
    },
  })
  await strict.rejects(() =>
    change('execution', {
      documentId: doc.id,
      signatures: [{ partyId: 'party-a', source: s }],
      effectiveBasis: s,
      conditions: 'SATISFIED',
      conditionEvidence: s,
    }),
  )
  await change('execution', {
    documentId: doc.id,
    signatures: [
      { partyId: 'party-a', source: s },
      { partyId: 'party-b', source: s },
    ],
    effectiveBasis: s,
    conditions: 'SATISFIED',
    conditionEvidence: s,
  })
  await change('stage', { stage: 'EXECUTED_COPY_FILED', source: s })
  await change('term', {
    field: 'purchase_budget_exclusions_currency',
    state: 'KNOWN',
    status: 'EXECUTED',
    text: 'Sourced purchase formula',
    money: {
      ...emptyMoney(),
      formula: '2% of defined budget',
      inputs: 'approved budget less exclusions',
      currency: 'CAD',
      tax: 'exclusive',
      basis: 'defined production budget',
      exclusions: 'financing and contingency',
      floor: '1000',
      cap: '10000',
      credits: 'first and second period fees',
    },
    source: s,
  })
  await change('check', {
    id: 'title',
    label: 'Ownership and reservations',
    state: 'CONFIRMED',
    source: s,
  })
  await change('date', {
    id: 'expiry',
    label: 'Option expiry',
    absolute: '2026-12-01',
    anchorId: '',
    offset: 0,
    rule: 'CALENDAR',
    timezone: 'America/Toronto',
    holidays: [],
    notice: 'written notice',
    owner: 'Synthetic producer',
    source: s,
    reviewed: true,
  })
  const before = await prisma.ipProperty.findUniqueOrThrow({
    where: { id: ip.id },
  })
  const synced = await syncIp(actor, id, {
    classification: 'BUSINESS',
    reviewed: true,
    source: s,
    version,
    ipId: ip.id,
    ipVersion: before.updatedAt.toISOString(),
    status: 'OPTIONED',
    dates: { optionExpiryDate: 'expiry' },
  })
  version = synced.version
  const after = await prisma.ipProperty.findUniqueOrThrow({
    where: { id: ip.id },
  })
  strict.equal(after.status, 'OPTIONED')
  strict.equal(after.chainOfTitleStatus, 'UNKNOWN')
  strict.equal(after.optionExpiryDate?.toISOString().slice(0, 10), '2026-12-01')
  await strict.rejects(() =>
    syncIp(actor, id, {
      classification: 'BUSINESS',
      reviewed: true,
      source: s,
      version,
      ipId: ip.id,
      ipVersion: before.updatedAt.toISOString(),
      status: 'SECURED',
    }),
  )
  const imp = {
    classification: 'BUSINESS',
    version,
    requestId: 'synthetic-import-' + id,
    terms: [
      {
        field: 'reservations',
        state: 'KNOWN',
        status: 'PROPOSED',
        text: 'Synthetic reservation',
        source: s,
      },
    ],
  }
  const staged = await stageImport(actor, id, imp)
  strict.equal((await stageImport(actor, id, imp)).id, staged.id)
  await strict.rejects(() =>
    stageImport(actor, id, {
      ...imp,
      terms: [{ ...imp.terms[0], text: 'different' }],
    }),
  )
  await strict.rejects(() =>
    changeDeal({ id: 'generic-admin' }, id, {
      classification: 'BUSINESS',
      version,
      action: 'applyImport',
      value: staged.id,
    }),
  )
  await change('applyImport', staged.id)
  const replay = await changeDeal(actor, id, {
    classification: 'BUSINESS',
    version: 1,
    action: 'applyImport',
    value: staged.id,
  })
  strict.equal(replay.replayed, true)
  await runReminders(id, new Date('2026-11-12T12:00:00Z'))
  const count = await prisma.agreementReminder.count({
    where: { agreementId: id },
  })
  strict.equal(count, 3)
  await runReminders(id, new Date('2026-11-12T12:00:00Z'))
  strict.equal(
    await prisma.agreementReminder.count({ where: { agreementId: id } }),
    count,
  )
  const rem = await prisma.agreementReminder.findFirstOrThrow({
    where: { agreementId: id },
  })
  await prisma.agreementReminder.update({
    where: { id: rem.id },
    data: { state: 'SNOOZED', snoozedUntil: new Date('2026-11-11') },
  })
  await runReminders(id, new Date('2026-11-12T12:00:00Z'))
  strict.equal(
    (
      await prisma.agreementReminder.findUniqueOrThrow({
        where: { id: rem.id },
      })
    ).state,
    'DELIVERED',
  )
  await strict.rejects(() => change('overview', { parties: [] }))
  await change('date', {
    id: 'expiry',
    label: 'Reviewed option extension',
    absolute: '2027-01-31',
    anchorId: '',
    offset: 1,
    unit: 'MONTH',
    monthEnd: 'CLAMP',
    rule: 'CALENDAR',
    timezone: 'America/Toronto',
    holidays: [],
    notice: 'reviewed extension notice',
    owner: 'Synthetic producer',
    source: s,
    reviewed: true,
  })
  strict.equal(
    await prisma.agreementReminder.count({
      where: { agreementId: id, state: 'SUPERSEDED' },
    }),
    count,
  )
  const priorEvents = await prisma.agreementEvent.findMany({
    where: { agreementId: id },
  })
  strict.ok(
    priorEvents.some((e) => JSON.stringify(e.data).includes('2026-12-01')),
  )
  const data = await getDeal(id)
  strict.equal(data.workspace?.periods.length, 3)
  strict.ok(
    data.legacy.contacts.some((link) => link.contactId === contact.id),
    'new linked party appears in existing contact agreement directory',
  )
  strict.equal(
    data.workspace?.terms.filter((t) => t.field === 'reservations').length,
    1,
  )
  strict.equal(data.events.length, data.version)
  strict.equal(data.legacy.id, id)
  await prisma.agreementLegal.create({
    data: {
      agreementId: id,
      kind: 'NOTE',
      name: 'Private canary',
      body: 'RESTRICTED-CANARY-NEVER-BUSINESS',
      actorId: actor.id,
    },
  })
  strict.ok(!JSON.stringify(await getDeal(id)).includes('RESTRICTED-CANARY'))
  const legacy = await prisma.projectAgreement.create({
    data: {
      title: 'Synthetic unsigned legacy',
      projectId: project.id,
      status: 'unsigned',
      notes: 'Preserve legacy business note',
      fileUrl: '/api/files/synthetic-old.txt',
    },
  })
  const original = await getDeal(legacy.id)
  strict.equal(original.workspace, null)
  await changeDeal(actor, legacy.id, {
    classification: 'BUSINESS',
    version: 0,
    action: 'initialize',
    type: 'ASSIGNMENT',
  })
  const initialized = await getDeal(legacy.id)
  strict.equal(initialized.workspace?.stage, 'DISCUSSION')
  strict.equal(initialized.legacy.status, 'unsigned')
  strict.equal(initialized.legacy.notes, 'Preserve legacy business note')
  strict.equal(initialized.legacy.fileUrl, '/api/files/synthetic-old.txt')
  // Competing executed claims fail atomically, leaving IP untouched.
  const second = await createDeal(actor, {
    classification: 'BUSINESS',
    title: 'Synthetic competing claim',
    projectId: project.id,
    type: 'LITERARY_OPTION',
    ipIds: [ip.id],
  })
  await prisma.agreementWorkspace.update({
    where: { id: second.id },
    data: { data: JSON.parse(JSON.stringify(data.workspace)) },
  })
  const ipCurrent = await prisma.ipProperty.findUniqueOrThrow({
    where: { id: ip.id },
  })
  await strict.rejects(() =>
    syncIp(actor, id, {
      classification: 'BUSINESS',
      version,
      reviewed: true,
      source: s,
      ipId: ip.id,
      ipVersion: ipCurrent.updatedAt.toISOString(),
      status: 'SECURED',
    }),
  )
  strict.equal(
    (await prisma.ipProperty.findUniqueOrThrow({ where: { id: ip.id } }))
      .status,
    'OPTIONED',
  )
  await prisma.agreementWorkspace.update({
    where: { id: second.id },
    data: {
      data: JSON.parse(
        JSON.stringify({ ...data.workspace, stage: 'DISCUSSION' } as Workspace),
      ),
    },
  })
  console.log(
    'PASS synthetic DB: periods/coowners, citations, stale/concurrent writes, signatures/conditions, IP sync & competing claims, staged import/replay, reminders/snooze, legacy preservation, private separation',
  )
  console.log('Synthetic preview agreement: /agreements/' + id)
}
main().finally(() => prisma.$disconnect())
