import { createHash } from 'node:crypto'
import { Prisma, ContactType, CompanyType, MaterialType } from '@prisma/client'
import { prisma } from './db'
import { getSpacesKeyFromUrl } from './file-storage'
import type { McpActor } from './mcp-auth'

// Deliberately excludes credentials, user/admin records, evaluations, read markers,
// release approval, destructive actions, nested Prisma writes and arbitrary URLs.
export const collaborationFields = {
  contact: ['type', 'name', 'email', 'phone', 'notes', 'writerGenres', 'writerVoice', 'citizenship', 'unionMembership', 'execTitle', 'execRole', 'lookingFor', 'companyId', 'agentId', 'managerId'],
  company: ['type', 'name', 'notes', 'website'],
  project: ['title', 'logline', 'synopsis', 'format', 'genre', 'comps', 'notes', 'nextAction', 'targetNetwork', 'packagingNeeds', 'sourceContactId'],
  material: ['title', 'notes', 'projectId', 'writerId', 'submittedById'],
  tag: ['name', 'color', 'category'],
} as const
export const readableEntities = ['contact', 'company', 'project', 'material', 'tag', 'coverage', 'meeting', 'meetingAttendee', 'meetingProject', 'followUp', 'writerSignal', 'researchDocument', 'buyerNote', 'rewriteCycle', 'currentShow', 'fundingDeadline', 'emailReply', 'projectAgreement', 'projectAgreementContact', 'developmentCost', 'ipProperty', 'ipDocument', 'projectBuyer', 'projectContact', 'projectCompany', 'buyerSlateItem', 'buyerSlateContact', 'projectReview', 'projectTag'] as const
export type ReadableEntity = typeof readableEntities[number]
export function readableEntityName(value: unknown): ReadableEntity {
  if (typeof value !== 'string' || !(readableEntities as readonly string[]).includes(value)) throw new CollaborationError(400, 'Unsupported business read entity')
  return value as ReadableEntity
}
export type CollaborationEntity = keyof typeof collaborationFields
export class CollaborationError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function entityName(value: unknown): CollaborationEntity {
  if (typeof value !== 'string' || !Object.hasOwn(collaborationFields, value)) throw new CollaborationError(400, 'Unsupported business entity')
  return value as CollaborationEntity
}
function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
// Hash is an opaque optimistic version; contains no data or credentials.
export function recordVersion(record: unknown) { return digest(record) }
export function validateEdit(body: Record<string, unknown>) {
  const entity = entityName(body.entity)
  if (!['create', 'update'].includes(String(body.action))) throw new CollaborationError(400, 'Only create/update permitted')
  if (Object.keys(body).some(k => !['entity', 'action', 'id', 'data', 'expectedVersion', 'requestId', 'taskReference'].includes(k))) throw new CollaborationError(400, 'Unexpected request field')
  if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId)) throw new CollaborationError(400, 'Stable requestId (16–80 characters) required for safe retries')
  if (typeof body.taskReference !== 'string' || body.taskReference.trim().length < 3 || body.taskReference.length > 300) throw new CollaborationError(400, 'Philip/Mildred task reference required')
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new CollaborationError(400, 'Flat field object required')
  const data = body.data as Record<string, unknown>
  const materialCreationFields = ['type', 'filename', 'fileUrl', 'mimeType']
  if (!Object.keys(data).length) throw new CollaborationError(400, 'No changes supplied')
  for (const [key, value] of Object.entries(data)) {
    if (!(collaborationFields[entity] as readonly string[]).includes(key) && !(entity === 'material' && body.action === 'create' && materialCreationFields.includes(key))) throw new CollaborationError(400, `Field not editable: ${key}`)
    if (value !== null && (typeof value !== 'string' || value.length > 20000)) throw new CollaborationError(400, `Invalid field value: ${key}`)
    if (key === 'website' && value) { try { const url = new URL(String(value)); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error() } catch { throw new CollaborationError(400, 'Website must be an HTTP(S) URL without credentials') } }
    if ((key === 'name' || key === 'title') && (typeof value !== 'string' || !value.trim() || value.length > 300)) throw new CollaborationError(400, 'Name/title must be nonempty and at most 300 characters')
  }
  if (body.action === 'create') {
    if (entity === 'material') {
      if (typeof data.fileUrl !== 'string' || typeof data.filename !== 'string' || !data.filename || data.mimeType !== 'application/pdf') throw new CollaborationError(400, 'Stored PDF fileUrl, filename and application/pdf mimeType required')
      materialObjectKey(data.fileUrl)
      if (!Object.values(MaterialType).includes(data.type as MaterialType)) throw new CollaborationError(400, 'Invalid material type')
    }
    const label = entity === 'project' || entity === 'material' ? 'title' : 'name'
    if (!data[label]) throw new CollaborationError(400, `${label} required`)
    if (body.id || body.expectedVersion) throw new CollaborationError(400, 'Create cannot specify id/version')
  } else if (typeof body.id !== 'string' || body.id.length > 100 || !body.id || typeof body.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedVersion)) {
    throw new CollaborationError(400, 'Get the current record and supply its id and version before updating')
  }
  if ((entity === 'contact' || entity === 'company') && data.type !== undefined && !Object.values(entity === 'contact' ? ContactType : CompanyType).includes(data.type as never)) throw new CollaborationError(400, 'Invalid contact/company type')
  return { entity, data }
}

type RecordRow = Record<string, unknown> & { id: string; name?: string; title?: string }
type Delegate = {
  findUnique(args: unknown): Promise<RecordRow | null>
  findMany(args: unknown): Promise<RecordRow[]>
  create(args: unknown): Promise<RecordRow>
  update(args: unknown): Promise<RecordRow>
}
function model(tx: Prisma.TransactionClient, entity: ReadableEntity): Delegate { return tx[entity] as unknown as Delegate }
export async function readCollaboration(entity: ReadableEntity, id?: string, after?: string) {
  const delegate = model(prisma, entity)
  const rows = id ? [await delegate.findUnique({ where: { id } })].filter(Boolean) as RecordRow[] : await delegate.findMany({ orderBy: { id: 'asc' }, take: 51, ...(after ? { where: { id: { gt: after } } } : {}) })
  const more = rows.length > 50
  const page = rows.slice(0, 50)
  return { readableEntities, editableFields: Object.hasOwn(collaborationFields, entity) ? collaborationFields[entity as CollaborationEntity] : [], createOnlyFields: entity === 'material' ? ['type', 'filename', 'fileUrl', 'mimeType'] : [], ...(entity === 'material' ? { materialTypes: Object.values(MaterialType) } : {}), records: page.map(record => {
    // File locations may contain private/signed values; actual bytes use material_file.
    const visible = { ...record }; delete visible.fileUrl
    return { ...visible, version: recordVersion(record) }
  }), nextAfter: more ? page[49].id : null }
}
export async function editCollaboration(actor: McpActor, body: Record<string, unknown>) {
  const { entity, data } = validateEdit(body)
  const fingerprint = digest(body)
  const auditId = 'collab-' + digest([actor.id, body.requestId])
  return prisma.$transaction(async tx => {
    const previous = await tx.activityLog.findUnique({ where: { id: auditId } })
    if (previous) {
      const saved = previous.changes as Record<string, unknown>
      if (saved.fingerprint !== fingerprint) throw new CollaborationError(409, 'requestId already used with different content')
      const visible = { ...(saved.after as Record<string, unknown>) }; delete visible.fileUrl
      return { replayed: true, record: visible, version: saved.version }
    }
    const delegate = model(tx, entity)
    const before = body.action === 'update' ? await delegate.findUnique({ where: { id: body.id } }) : null
    if (body.action === 'update' && (!before || recordVersion(before) !== body.expectedVersion)) throw new CollaborationError(409, 'Record changed or missing; reread and reconcile before retrying')
    const after = body.action === 'create' ? await delegate.create({ data: { ...((entity === 'contact' || entity === 'company') ? { type: 'OTHER' } : {}), ...data } }) : await delegate.update({ where: { id: body.id }, data })
    const version = recordVersion(after)
    const user = await tx.user.upsert({ where: { email: `${actor.id}@mcp.local` }, update: {}, create: { email: `${actor.id}@mcp.local`, name: actor.name, role: 'MEMBER', password: 'mcp-service-actor-no-login' } })
    // Complete before/after snapshots retained transactionally for explicit recovery.
    // The audit is mandatory: failure rolls the business mutation back.
    await tx.activityLog.create({ data: { id: auditId, userId: user.id, action: body.action === 'create' ? 'created' : 'updated', entityType: entity, entityId: after.id, entityName: String(after.name || after.title || entity), changes: JSON.parse(JSON.stringify({ source: 'claude-collaboration', actorId: actor.id, taskReference: body.taskReference, fingerprint, before, after, version })) } })
    const visible = { ...after }; delete visible.fileUrl
    return { replayed: false, record: visible, version }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export function materialObjectKey(fileUrl: string) {
  let url: URL
  try { url = new URL(fileUrl) } catch { throw new CollaborationError(404, 'File bytes unavailable: this record is not a stored document') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) throw new CollaborationError(404, 'File bytes unavailable: unsupported stored location')
  const key = getSpacesKeyFromUrl(fileUrl)
  if (!key || key.includes('..') || /[\\\x00-\x1f]/.test(key) || !key.startsWith('materials/')) throw new CollaborationError(404, 'File bytes unavailable: not an approved material object')
  return key
}
