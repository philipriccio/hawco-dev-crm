import { createHash } from 'node:crypto'
import { MaterialType, Prisma, PrismaClient } from '@prisma/client'

export class IntakeError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function validateIntake(body: Record<string, unknown>) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new IntakeError('Invalid intake payload')
  const text = (value: unknown, field: string, required = false) => {
    if (value == null || value === '') {
      if (required) throw new IntakeError(`${field} is required`)
      return null
    }
    if (typeof value !== 'string' || value.length > 20000) throw new IntakeError(`Invalid ${field}`)
    return value.trim() || null
  }
  const title = text(body.title, 'Title', true)
  const fileUrl = text(body.fileUrl, 'File URL', true)
  if (!title || !fileUrl) throw new IntakeError('Title and file URL are required')
  const localSegments = fileUrl.startsWith('/api/files/') ? fileUrl.slice('/api/files/'.length).split('/') : []
  const privateLocalFile = localSegments.length > 0 && localSegments.every(segment => /^[a-zA-Z0-9_.-]+$/.test(segment) && segment !== '.' && segment !== '..')
  if (!privateLocalFile) {
    let url: URL
    try { url = new URL(fileUrl) } catch { throw new IntakeError('Use a valid HTTPS file or source URL') }
    if (url.protocol !== 'https:' || url.username || url.password) throw new IntakeError('Use an HTTPS URL without credentials')
  }
  if (!Object.values(MaterialType).includes(body.type as MaterialType)) throw new IntakeError('Invalid material type')
  if (body.markAsRead !== undefined && typeof body.markAsRead !== 'boolean') throw new IntakeError('Invalid read state')
  if (body.fileSize != null && (!Number.isSafeInteger(body.fileSize) || Number(body.fileSize) < 0)) throw new IntakeError('Invalid file size')
  const intakeKey = text(body.intakeKey, 'Intake key')
  if (intakeKey && !/^[a-zA-Z0-9_-]{16,100}$/.test(intakeKey)) throw new IntakeError('Invalid intake key')
  const projectId = text(body.projectId, 'Project')
  const writerId = text(body.writerId, 'Writer')
  if (body.createProject !== undefined && typeof body.createProject !== 'boolean') throw new IntakeError('Invalid create project choice')
  if (projectId && body.createProject) throw new IntakeError('Choose an existing or new project, not both')
  let newWriter: { name: string; email: string | null } | null = null
  if (body.newWriter != null) {
    if (typeof body.newWriter !== 'object' || Array.isArray(body.newWriter)) throw new IntakeError('Invalid writer')
    const value = body.newWriter as Record<string, unknown>
    const name = text(value.name, 'Writer name', true)
    const email = text(value.email, 'Writer email')
    if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new IntakeError('Invalid writer name or email')
    if (writerId) throw new IntakeError('Choose an existing or new writer, not both')
    newWriter = { name, email }
  }
  return { type: body.type as MaterialType, title, fileUrl, filename: text(body.filename, 'Filename') || title,
    fileSize: body.fileSize == null ? null : Number(body.fileSize), mimeType: text(body.mimeType, 'MIME type'), notes: text(body.notes, 'Notes'),
    projectId, writerId, submittedById: text(body.submittedById, 'Submitted by'), newWriter,
    createProject: body.createProject === true, markAsRead: body.markAsRead === true, intakeKey }
}

const include = { project: true, writer: true, submittedBy: true } as const
export async function createMaterialIntake(db: PrismaClient, body: Record<string, unknown>) {
  const input = validateIntake(body)
  const { intakeKey, ...payload } = input
  const requestFingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const replay = async (client: Pick<Prisma.TransactionClient, 'material'>) => {
    if (!intakeKey) return null
    const previous = await client.material.findUnique({ where: { intakeKey }, include })
    if (previous && previous.requestFingerprint !== requestFingerprint) throw new IntakeError('This intake was already submitted with different details. Start a new intake.', 409)
    return previous
  }
  const previous = await replay(db)
  if (previous) return { material: previous, replayed: true }
  try {
    const material = await db.$transaction(async tx => {
      let projectId = input.projectId
      if (projectId && !await tx.project.findUnique({ where: { id: projectId }, select: { id: true } })) throw new IntakeError('Project no longer exists', 404)
      for (const id of [input.writerId, input.submittedById].filter((id): id is string => Boolean(id))) {
        if (!await tx.contact.findUnique({ where: { id }, select: { id: true } })) throw new IntakeError('Selected contact no longer exists', 404)
      }
      if (input.createProject) {
        const project = await tx.project.create({ data: { title: input.title, status: 'SUBMITTED', dateReceived: new Date() } })
        projectId = project.id
      }
      let writerId = input.writerId
      if (input.newWriter) writerId = (await tx.contact.create({ data: { type: 'WRITER', ...input.newWriter } })).id
      const result = await tx.material.create({ data: { type: input.type, title: input.title, filename: input.filename, fileUrl: input.fileUrl,
        fileSize: input.fileSize, mimeType: input.mimeType, notes: input.notes, projectId, writerId, submittedById: input.submittedById,
        readAt: input.markAsRead ? new Date() : null, intakeKey, requestFingerprint: intakeKey ? requestFingerprint : null }, include })
      if (projectId && writerId) await tx.projectContact.upsert({
        where: { projectId_contactId_role: { projectId, contactId: writerId, role: 'WRITER' } },
        create: { projectId, contactId: writerId, role: 'WRITER' }, update: {},
      })
      const readable = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'PITCH_DECK', 'ONE_PAGER', 'TREATMENT', 'SERIES_BIBLE'].includes(input.type)
      if (projectId && result.readAt && readable) await tx.project.updateMany({ where: { id: projectId, firstReadAt: null }, data: { firstReadAt: result.readAt } })
      return result
    })
    return { material, replayed: false }
  } catch (error) {
    // A simultaneous retry can lose the unique-key race; its entire transaction rolls back.
    if (intakeKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await replay(db)
      if (existing) return { material: existing, replayed: true }
    }
    throw error
  }
}
