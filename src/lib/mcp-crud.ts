import { ContactType, CompanyType, MaterialType, Prisma, ProjectOrigin, ProjectStatus, UserRole, WriterLevel, WriterTier } from '@prisma/client'
import { prisma } from '@/lib/db'
import { calculateChanges } from '@/lib/activity'
import { logMcpActivity } from '@/lib/mcp-activity'
import type { McpActor } from '@/lib/mcp-auth'

type JsonBody = Record<string, unknown>

function clean(value: unknown) {
  return value === '' ? null : value
}

function pick<T extends string>(body: JsonBody, fields: readonly T[]) {
  const output: Record<string, unknown> = {}
  for (const field of fields) if (field in body) output[field] = clean(body[field])
  return output
}

function normalizeEnum<T extends Record<string, string>>(source: T, value: unknown, fallback?: keyof T) {
  const text = typeof value === 'string' ? value.trim().toUpperCase().replace(/[ -]/g, '_') : ''
  if (text && Object.prototype.hasOwnProperty.call(source, text)) return text as keyof T
  return fallback ?? null
}

function parseDate(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function createMcpContact(actor: McpActor, body: JsonBody) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw new Error('name is required')
  const contactType = normalizeEnum(ContactType, body.type, 'OTHER') as ContactType
  const data = {
    type: contactType,
    name,
    email: clean(body.email) as string | null,
    phone: clean(body.phone) as string | null,
    imdbUrl: clean(body.imdbUrl) as string | null,
    notes: clean(body.notes) as string | null,
    writerLevel: normalizeEnum(WriterLevel, body.writerLevel) as WriterLevel | null,
    writerTier: contactType === 'WRITER' ? normalizeEnum(WriterTier, body.writerTier, 'CONSIDER_WORKING_WITH') as WriterTier | null : null,
    writerGenres: clean(body.writerGenres) as string | null,
    writerVoice: clean(body.writerVoice) as string | null,
    citizenship: clean(body.citizenship) as string | null,
    isCanadian: Boolean(body.isCanadian),
    unionMembership: clean(body.unionMembership) as string | null,
    agentVibe: clean(body.agentVibe) as string | null,
    execTitle: clean(body.execTitle) as string | null,
    execRole: clean(body.execRole) as string | null,
    lookingFor: clean(body.lookingFor) as string | null,
    agentId: clean(body.agentId) as string | null,
    managerId: clean(body.managerId) as string | null,
    companyId: clean(body.companyId) as string | null,
  }
  const contact = await prisma.contact.create({ data, include: { company: true, agent: true, manager: true } })
  await logMcpActivity({ actor, action: 'created', entityType: 'contact', entityId: contact.id, entityName: contact.name, tool: 'create_contact', changes: data })
  return contact
}

export async function updateMcpContact(actor: McpActor, id: string, body: JsonBody) {
  const existing = await prisma.contact.findUnique({ where: { id } })
  if (!existing) throw new Error('contact not found')
  const fields = ['type', 'name', 'email', 'phone', 'imdbUrl', 'notes', 'writerLevel', 'writerTier', 'writerGenres', 'writerVoice', 'citizenship', 'isCanadian', 'unionMembership', 'agentVibe', 'execTitle', 'execRole', 'lookingFor', 'agentId', 'managerId', 'companyId'] as const
  const data = pick(body, fields)
  if ('type' in data) data.type = normalizeEnum(ContactType, data.type, existing.type) as ContactType
  if ('writerLevel' in data) data.writerLevel = normalizeEnum(WriterLevel, data.writerLevel) as WriterLevel | null
  if ('writerTier' in data) data.writerTier = normalizeEnum(WriterTier, data.writerTier, 'CONSIDER_WORKING_WITH') as WriterTier | null
  if (data.type && data.type !== 'WRITER') data.writerTier = null
  if (data.type === 'WRITER' && !data.writerTier && !existing.writerTier) data.writerTier = 'CONSIDER_WORKING_WITH'
  if (!Object.keys(data).length) throw new Error('no valid fields to update')
  const contact = await prisma.contact.update({ where: { id }, data, include: { company: true, agent: true, manager: true } })
  await logMcpActivity({ actor, action: 'updated', entityType: 'contact', entityId: id, entityName: contact.name, tool: 'update_contact', changes: calculateChanges(existing as unknown as Record<string, unknown>, data) })
  return contact
}

export async function deleteMcpContact(actor: McpActor, id: string) {
  const existing = await prisma.contact.findUnique({ where: { id }, select: { id: true, name: true } })
  if (!existing) throw new Error('contact not found')
  await prisma.contact.delete({ where: { id } })
  await logMcpActivity({ actor, action: 'deleted', entityType: 'contact', entityId: id, entityName: existing.name, tool: 'delete_contact' })
  return { id, deleted: true }
}

export async function createMcpCompany(actor: McpActor, body: JsonBody) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw new Error('name is required')
  const data = {
    name,
    type: normalizeEnum(CompanyType, body.type, 'OTHER') as CompanyType,
    website: clean(body.website) as string | null,
    notes: clean(body.notes) as string | null,
  }
  const company = await prisma.company.create({ data })
  await logMcpActivity({ actor, action: 'created', entityType: 'company', entityId: company.id, entityName: company.name, tool: 'create_company', changes: data })
  return company
}

export async function updateMcpCompany(actor: McpActor, id: string, body: JsonBody) {
  const existing = await prisma.company.findUnique({ where: { id } })
  if (!existing) throw new Error('company not found')
  const data = pick(body, ['name', 'type', 'website', 'notes'] as const)
  if ('type' in data) data.type = normalizeEnum(CompanyType, data.type, existing.type) as CompanyType
  if (!Object.keys(data).length) throw new Error('no valid fields to update')
  const company = await prisma.company.update({ where: { id }, data })
  await logMcpActivity({ actor, action: 'updated', entityType: 'company', entityId: id, entityName: company.name, tool: 'update_company', changes: calculateChanges(existing as unknown as Record<string, unknown>, data) })
  return company
}

export async function deleteMcpCompany(actor: McpActor, id: string) {
  const existing = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true } })
  if (!existing) throw new Error('company not found')
  await prisma.company.delete({ where: { id } })
  await logMcpActivity({ actor, action: 'deleted', entityType: 'company', entityId: id, entityName: existing.name, tool: 'delete_company' })
  return { id, deleted: true }
}

export async function createMcpProject(actor: McpActor, body: JsonBody) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) throw new Error('title is required')
  const data: Prisma.ProjectCreateInput = {
    title,
    logline: clean(body.logline) as string | null,
    synopsis: clean(body.synopsis) as string | null,
    format: clean(body.format) as string | null,
    genre: clean(body.genre) as string | null,
    comps: clean(body.comps) as string | null,
    status: normalizeEnum(ProjectStatus, body.status, 'SUBMITTED') as ProjectStatus,
    origin: normalizeEnum(ProjectOrigin, body.origin, 'EXTERNAL') as ProjectOrigin,
    verdict: clean(body.verdict) as string | null,
    dateReceived: parseDate(body.dateReceived),
    firstReadAt: parseDate(body.firstReadAt),
    optionExpiryDate: parseDate(body.optionExpiryDate),
    readPriority: typeof body.readPriority === 'number' ? body.readPriority : null,
    considerRelationship: Boolean(body.considerRelationship),
    rewriteStatus: clean(body.rewriteStatus) as string | null,
    pitchReady: typeof body.pitchReady === 'boolean' ? body.pitchReady : null,
    pitchChecklist: (body.pitchChecklist ?? null) as Prisma.InputJsonValue,
    currentStage: clean(body.currentStage) as string | null,
    packagingNeeds: clean(body.packagingNeeds) as string | null,
    nextAction: clean(body.nextAction) as string | null,
    targetNetwork: clean(body.targetNetwork) as string | null,
    intlPotential: Boolean(body.intlPotential),
    notes: clean(body.notes) as string | null,
    sourceContact: clean(body.sourceContactId) ? { connect: { id: clean(body.sourceContactId) as string } } : undefined,
    submissionThreadId: clean(body.submissionThreadId) as string | null,
  }
  const project = await prisma.project.create({ data })
  await logMcpActivity({ actor, action: 'created', entityType: 'project', entityId: project.id, entityName: project.title, tool: 'create_project', changes: body })
  return project
}

export async function updateMcpProject(actor: McpActor, id: string, body: JsonBody) {
  const existing = await prisma.project.findUnique({ where: { id } })
  if (!existing) throw new Error('project not found')
  const fields = ['title', 'status', 'logline', 'synopsis', 'genre', 'format', 'comps', 'currentStage', 'packagingNeeds', 'nextAction', 'targetNetwork', 'notes', 'verdict', 'origin', 'intlPotential', 'dateReceived', 'optionExpiryDate', 'firstReadAt', 'readPriority', 'considerRelationship', 'rewriteStatus', 'pitchReady', 'pitchChecklist', 'sourceContactId', 'submissionThreadId'] as const
  const data = pick(body, fields)
  for (const field of ['dateReceived', 'optionExpiryDate', 'firstReadAt']) if (field in data) data[field] = parseDate(data[field])
  if ('status' in data) data.status = normalizeEnum(ProjectStatus, data.status, existing.status) as ProjectStatus
  if ('origin' in data) data.origin = normalizeEnum(ProjectOrigin, data.origin, existing.origin) as ProjectOrigin
  if (!Object.keys(data).length) throw new Error('no valid fields to update')
  const project = await prisma.project.update({ where: { id }, data })
  await logMcpActivity({ actor, action: 'updated', entityType: 'project', entityId: id, entityName: project.title, tool: 'update_project', changes: calculateChanges(existing as unknown as Record<string, unknown>, data) })
  return project
}

export async function deleteMcpProject(actor: McpActor, id: string) {
  const existing = await prisma.project.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!existing) throw new Error('project not found')
  await prisma.project.delete({ where: { id } })
  await logMcpActivity({ actor, action: 'deleted', entityType: 'project', entityId: id, entityName: existing.title, tool: 'delete_project' })
  return { id, deleted: true }
}

export async function createMcpMaterial(actor: McpActor, body: JsonBody) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : ''
  if (!title || !fileUrl) throw new Error('title and fileUrl are required')
  const data = {
    type: normalizeEnum(MaterialType, body.type, 'OTHER') as MaterialType,
    title,
    filename: (clean(body.filename) as string | null) || title,
    fileUrl,
    fileSize: typeof body.fileSize === 'number' ? body.fileSize : null,
    mimeType: clean(body.mimeType) as string | null,
    notes: clean(body.notes) as string | null,
    projectId: clean(body.projectId) as string | null,
    submittedById: clean(body.submittedById) as string | null,
    writerId: clean(body.writerId) as string | null,
  }
  const material = await prisma.material.create({ data, include: { project: true, submittedBy: true, writer: true } })
  await logMcpActivity({ actor, action: 'created', entityType: 'material', entityId: material.id, entityName: material.title, tool: 'create_material', changes: data })
  return material
}

export async function updateMcpMaterial(actor: McpActor, id: string, body: JsonBody) {
  const existing = await prisma.material.findUnique({ where: { id } })
  if (!existing) throw new Error('material not found')
  const data = pick(body, ['type', 'title', 'filename', 'fileUrl', 'fileSize', 'mimeType', 'notes', 'readAt', 'projectId', 'submittedById', 'writerId'] as const)
  if ('type' in data) data.type = normalizeEnum(MaterialType, data.type, existing.type) as MaterialType
  if ('readAt' in data) data.readAt = parseDate(data.readAt)
  if (!Object.keys(data).length) throw new Error('no valid fields to update')
  const material = await prisma.material.update({ where: { id }, data, include: { project: true, submittedBy: true, writer: true } })
  await logMcpActivity({ actor, action: 'updated', entityType: 'material', entityId: id, entityName: material.title, tool: 'update_material', changes: calculateChanges(existing as unknown as Record<string, unknown>, data) })
  return material
}

export async function deleteMcpMaterial(actor: McpActor, id: string) {
  const existing = await prisma.material.findUnique({ where: { id }, select: { id: true, title: true } })
  if (!existing) throw new Error('material not found')
  await prisma.material.delete({ where: { id } })
  await logMcpActivity({ actor, action: 'deleted', entityType: 'material', entityId: id, entityName: existing.title, tool: 'delete_material' })
  return { id, deleted: true }
}

export async function createMcpTag(actor: McpActor, body: JsonBody) {
  const name = typeof body.name === 'string' ? body.name.trim().toLowerCase() : ''
  if (!name) throw new Error('name is required')
  const tag = await prisma.tag.upsert({
    where: { name },
    update: { category: clean(body.category) as string | null },
    create: { name, category: clean(body.category) as string | null },
  })
  await logMcpActivity({ actor, action: 'created', entityType: 'tag', entityId: tag.id, entityName: tag.name, tool: 'create_tag', changes: body })
  return tag
}

export async function updateMcpUser(actor: McpActor, id: string, body: JsonBody) {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) throw new Error('user not found')
  const data = pick(body, ['name', 'email', 'role'] as const)
  if ('role' in data) data.role = normalizeEnum(UserRole, data.role, existing.role) as UserRole
  if ('password' in body) throw new Error('password changes are not exposed through MCP')
  if (!Object.keys(data).length) throw new Error('no valid fields to update')
  const user = await prisma.user.update({ where: { id }, data: data as Prisma.UserUpdateInput, select: { id: true, name: true, email: true, role: true } })
  await logMcpActivity({ actor, action: 'updated', entityType: 'user', entityId: id, entityName: user.name, tool: 'update_user', changes: calculateChanges(existing as unknown as Record<string, unknown>, data) })
  return user
}
