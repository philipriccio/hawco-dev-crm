import { MaterialType, Prisma, ProjectOrigin, ProjectStatus, ContactType, CompanyType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logMcpActivity } from '@/lib/mcp-activity'
import type { McpActor } from '@/lib/mcp-auth'

type ContactTypeValue = keyof typeof ContactType
type CompanyTypeValue = keyof typeof CompanyType
type MaterialTypeValue = keyof typeof MaterialType
type ProjectStatusValue = keyof typeof ProjectStatus
type ProjectOriginValue = keyof typeof ProjectOrigin

const DEFAULT_PROJECT_SELECT = {
  id: true,
  title: true,
  status: true,
  origin: true,
  format: true,
  genre: true,
  logline: true,
  synopsis: true,
  comps: true,
  dateReceived: true,
  firstReadAt: true,
  sourceContactId: true,
  submissionThreadId: true,
  notes: true,
  contacts: { include: { contact: { select: { id: true, name: true, type: true, email: true } } } },
  materials: { select: { id: true, title: true, type: true, filename: true, submittedById: true, writerId: true, readAt: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ProjectSelect

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function enumValue<T extends Record<string, string>>(source: T, value: unknown, fallback?: keyof T): keyof T | null {
  const normalized = cleanString(value)?.toUpperCase().replace(/[ -]/g, '_')
  if (normalized && Object.prototype.hasOwnProperty.call(source, normalized)) return normalized as keyof T
  return fallback ?? null
}

function asDate(value: unknown): Date | null {
  const text = cleanString(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function coerceTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(cleanString).filter((tag): tag is string => Boolean(tag)).map((tag) => tag.toLowerCase()))]
}

export async function findOrCreateCompany(actor: McpActor, input: { name: unknown; type?: unknown; website?: unknown; notes?: unknown }) {
  const name = cleanString(input.name)
  if (!name) throw new Error('company name is required')

  const existing = await prisma.company.findFirst({ where: { name: { equals: name, mode: Prisma.QueryMode.insensitive } } })
  if (existing) return { company: existing, created: false }

  const company = await prisma.company.create({
    data: {
      name,
      type: (enumValue(CompanyType, input.type, 'OTHER') as CompanyTypeValue) || 'OTHER',
      website: cleanString(input.website),
      notes: cleanString(input.notes),
    },
  })
  await logMcpActivity({ actor, action: 'created', entityType: 'company', entityId: company.id, entityName: company.name, tool: 'find_or_create_company', changes: input })
  return { company, created: true }
}

export async function findOrCreateContact(actor: McpActor, input: {
  name: unknown
  email?: unknown
  type?: unknown
  companyId?: unknown
  companyName?: unknown
  phone?: unknown
  notes?: unknown
}) {
  const name = cleanString(input.name)
  if (!name) throw new Error('contact name is required')
  const email = cleanString(input.email)
  let companyId = cleanString(input.companyId)

  if (!companyId) {
    const companyName = cleanString(input.companyName)
    if (companyName) companyId = (await findOrCreateCompany(actor, { name: companyName })).company.id
  }

  const existing = await prisma.contact.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      OR: [
        ...(email ? [{ email: { equals: email, mode: Prisma.QueryMode.insensitive } }] : []),
        ...(companyId ? [{ companyId }] : []),
      ],
    },
    include: { company: true },
  })
  if (existing) return { contact: existing, created: false }

  const contact = await prisma.contact.create({
    data: {
      name,
      email,
      phone: cleanString(input.phone),
      notes: cleanString(input.notes),
      companyId,
      type: (enumValue(ContactType, input.type, 'OTHER') as ContactTypeValue) || 'OTHER',
    },
    include: { company: true },
  })
  await logMcpActivity({ actor, action: 'created', entityType: 'contact', entityId: contact.id, entityName: contact.name, tool: 'find_or_create_contact', changes: input })
  return { contact, created: true }
}

export async function createIntakeProject(actor: McpActor, input: {
  title: unknown
  origin?: unknown
  status?: unknown
  format?: unknown
  genre?: unknown
  tags?: unknown
  dateReceived?: unknown
  sourceContactId?: unknown
  writerIds?: unknown
  logline?: unknown
  synopsis?: unknown
  comps?: unknown
  notes?: unknown
  submissionThreadId?: unknown
}) {
  const title = cleanString(input.title)
  if (!title) throw new Error('project title is required')

  const sourceContactId = cleanString(input.sourceContactId)
  const writerIds = Array.isArray(input.writerIds)
    ? [...new Set(input.writerIds.map(cleanString).filter((id): id is string => Boolean(id)))]
    : []
  const tagNames = coerceTags(input.tags)

  const project = await prisma.project.create({
    data: {
      title,
      origin: (enumValue(ProjectOrigin, input.origin, 'EXTERNAL') as ProjectOriginValue) || 'EXTERNAL',
      status: (enumValue(ProjectStatus, input.status, 'SUBMITTED') as ProjectStatusValue) || 'SUBMITTED',
      format: cleanString(input.format),
      genre: tagNames.length ? tagNames.join(', ') : cleanString(input.genre),
      dateReceived: asDate(input.dateReceived),
      sourceContactId,
      logline: cleanString(input.logline),
      synopsis: cleanString(input.synopsis),
      comps: cleanString(input.comps),
      notes: cleanString(input.notes),
      submissionThreadId: cleanString(input.submissionThreadId),
      contacts: {
        create: [
          ...writerIds.map((contactId) => ({ contactId, role: 'WRITER' as const })),
          ...(sourceContactId ? [{ contactId: sourceContactId, role: 'SOURCE' as const }] : []),
        ],
      },
      tags: tagNames.length
        ? {
            create: tagNames.map((name) => ({
              tag: { connectOrCreate: { where: { name }, create: { name, category: 'genre' } } },
            })),
          }
        : undefined,
    },
    select: DEFAULT_PROJECT_SELECT,
  })

  await logMcpActivity({ actor, action: 'created', entityType: 'project', entityId: project.id, entityName: project.title, tool: 'create_project', changes: input })
  return project
}

export async function uploadIntakeMaterial(actor: McpActor, input: {
  type: unknown
  title: unknown
  filename?: unknown
  fileUrl?: unknown
  fileSize?: unknown
  mimeType?: unknown
  notes?: unknown
  writerId?: unknown
  submittedById?: unknown
  projectId?: unknown
}) {
  const title = cleanString(input.title)
  const fileUrl = cleanString(input.fileUrl)
  if (!title || !fileUrl) throw new Error('material title and fileUrl are required')

  const material = await prisma.material.create({
    data: {
      type: (enumValue(MaterialType, input.type, 'OTHER') as MaterialTypeValue) || 'OTHER',
      title,
      filename: cleanString(input.filename) || title,
      fileUrl,
      fileSize: typeof input.fileSize === 'number' ? input.fileSize : null,
      mimeType: cleanString(input.mimeType),
      notes: cleanString(input.notes),
      writerId: cleanString(input.writerId),
      submittedById: cleanString(input.submittedById),
      projectId: cleanString(input.projectId),
    },
    include: {
      project: { select: { id: true, title: true } },
      submittedBy: { select: { id: true, name: true, type: true } },
      writer: { select: { id: true, name: true, type: true } },
    },
  })
  await logMcpActivity({ actor, action: 'created', entityType: 'material', entityId: material.id, entityName: material.title, tool: 'upload_material', changes: input })
  return material
}

export async function linkWriterAgent(actor: McpActor, input: { writerId: unknown; agentId?: unknown; managerId?: unknown }) {
  const writerId = cleanString(input.writerId)
  if (!writerId) throw new Error('writerId is required')
  const agentId = cleanString(input.agentId)
  const managerId = cleanString(input.managerId)
  if (!agentId && !managerId) throw new Error('agentId or managerId is required')

  const writer = await prisma.contact.update({
    where: { id: writerId },
    data: { ...(agentId ? { agentId } : {}), ...(managerId ? { managerId } : {}) },
    include: {
      agent: { select: { id: true, name: true, type: true } },
      manager: { select: { id: true, name: true, type: true } },
    },
  })
  await logMcpActivity({ actor, action: 'linked', entityType: 'contact', entityId: writer.id, entityName: writer.name, tool: 'link_writer_agent', changes: input })
  return writer
}

export async function intakeSubmission(actor: McpActor, input: {
  title: unknown
  format?: unknown
  genre?: unknown
  tags?: unknown
  dateReceived?: unknown
  logline?: unknown
  synopsis?: unknown
  comps?: unknown
  notes?: unknown
  submissionThreadId?: unknown
  source?: Record<string, unknown>
  writers?: Array<Record<string, unknown>>
  material?: Record<string, unknown>
  followUpNote?: unknown
}) {
  const result = await prisma.$transaction(async (tx) => {
    const created: Record<string, unknown> = {}

    let sourceContactId: string | null = null
    if (input.source) {
      const name = cleanString(input.source.name)
      if (name) {
        const existing = await tx.contact.findFirst({
          where: {
            name: { equals: name, mode: Prisma.QueryMode.insensitive },
            OR: [
              ...(cleanString(input.source.email) ? [{ email: { equals: cleanString(input.source.email)!, mode: Prisma.QueryMode.insensitive } }] : []),
              ...(cleanString(input.source.companyId) ? [{ companyId: cleanString(input.source.companyId)! }] : []),
            ],
          },
        })
        const contact = existing || await tx.contact.create({
          data: {
            name,
            email: cleanString(input.source.email),
            type: (enumValue(ContactType, input.source.type, 'OTHER') as ContactTypeValue) || 'OTHER',
            companyId: cleanString(input.source.companyId),
            notes: cleanString(input.source.notes),
          },
        })
        sourceContactId = contact.id
        created.sourceContact = contact
      }
    }

    const writerIds: string[] = []
    for (const writerInput of Array.isArray(input.writers) ? input.writers : []) {
      const name = cleanString(writerInput.name)
      if (!name) continue
      const existing = await tx.contact.findFirst({
        where: {
          name: { equals: name, mode: Prisma.QueryMode.insensitive },
          OR: [
            ...(cleanString(writerInput.email) ? [{ email: { equals: cleanString(writerInput.email)!, mode: Prisma.QueryMode.insensitive } }] : []),
            { type: 'WRITER' },
          ],
        },
      })
      const writer = existing || await tx.contact.create({
        data: {
          name,
          email: cleanString(writerInput.email),
          type: 'WRITER',
          notes: cleanString(writerInput.notes),
        },
      })
      writerIds.push(writer.id)
    }

    const tagNames = coerceTags(input.tags)
    const project = await tx.project.create({
      data: {
        title: cleanString(input.title) || 'Untitled submission',
        origin: 'EXTERNAL',
        status: 'SUBMITTED',
        format: cleanString(input.format),
        genre: tagNames.length ? tagNames.join(', ') : cleanString(input.genre),
        dateReceived: asDate(input.dateReceived) || new Date(),
        sourceContactId,
        logline: cleanString(input.logline),
        synopsis: cleanString(input.synopsis),
        comps: cleanString(input.comps),
        notes: cleanString(input.notes),
        submissionThreadId: cleanString(input.submissionThreadId),
        contacts: { create: [
          ...writerIds.map((contactId) => ({ contactId, role: 'WRITER' as const })),
          ...(sourceContactId ? [{ contactId: sourceContactId, role: 'SOURCE' as const }] : []),
        ] },
        tags: tagNames.length
          ? { create: tagNames.map((name) => ({ tag: { connectOrCreate: { where: { name }, create: { name, category: 'genre' } } } })) }
          : undefined,
      },
      select: DEFAULT_PROJECT_SELECT,
    })

    let material = null
    if (input.material) {
      const title = cleanString(input.material.title) || project.title
      const fileUrl = cleanString(input.material.fileUrl)
      if (fileUrl) {
        material = await tx.material.create({
          data: {
            type: (enumValue(MaterialType, input.material.type, 'OTHER') as MaterialTypeValue) || 'OTHER',
            title,
            filename: cleanString(input.material.filename) || title,
            fileUrl,
            fileSize: typeof input.material.fileSize === 'number' ? input.material.fileSize : null,
            mimeType: cleanString(input.material.mimeType),
            notes: cleanString(input.material.notes),
            projectId: project.id,
            writerId: cleanString(input.material.writerId) || writerIds[0] || null,
            submittedById: cleanString(input.material.submittedById) || sourceContactId,
          },
        })
      }
    }

    let followUp = null
    const followUpNote = cleanString(input.followUpNote) || `Read ${project.title}`
    if (sourceContactId) {
      followUp = await tx.followUp.create({ data: { contactId: sourceContactId, note: followUpNote } })
    }

    return { project, material, followUp, writerIds, sourceContactId, created }
  })
  await logMcpActivity({ actor, action: 'created', entityType: 'project', entityId: result.project.id, entityName: result.project.title, tool: 'intake_submission', changes: input, extra: { materialId: result.material?.id, followUpId: result.followUp?.id, writerIds: result.writerIds, sourceContactId: result.sourceContactId } })
  return result
}
