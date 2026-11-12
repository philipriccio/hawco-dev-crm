import { createHash } from 'node:crypto'
import { Prisma, type ProjectStatus } from '@prisma/client'
import { prisma } from './db'
import { DEVELOPMENT_SLATE_STATUSES } from './development-slate'

export const developmentSelect = {
  id: true, title: true, updatedAt: true, status: true, currentStage: true, nextAction: true,
  contacts: { where: { role: 'WRITER' as const }, select: { contactId: true } },
  ipProperties: { select: { id: true } },
} satisfies Prisma.ProjectSelect
export type DevelopmentSnapshot = Prisma.ProjectGetPayload<{ select: typeof developmentSelect }>
export function developmentVersion(project: DevelopmentSnapshot) {
  return createHash('sha256').update(JSON.stringify({
    updatedAt: project.updatedAt.toISOString(), status: project.status, currentStage: project.currentStage,
    nextAction: project.nextAction, writers: project.contacts.map(c => c.contactId).sort(),
    ip: project.ipProperties.map(p => p.id).sort(),
  })).digest('hex')
}
export class DevelopmentEditError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function parseDevelopmentEdit(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DevelopmentEditError(400, 'Invalid fields')
  const data = value as Record<string, unknown>
  const allowed = ['version', 'status', 'currentStage', 'nextAction', 'writerIds', 'ipIds']
  if (Object.keys(data).some(key => !allowed.includes(key)) || typeof data.version !== 'string' || !/^[a-f0-9]{64}$/.test(data.version) || typeof data.status !== 'string') throw new DevelopmentEditError(400, 'Invalid fields')
  function ids(key: string): string[] {
    const list = data[key]
    if (!Array.isArray(list) || list.length > 500 || list.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(list).size !== list.length) throw new DevelopmentEditError(400, `Invalid ${key}`)
    return list as string[]
  }
  function field(key: string, limit: number) {
    const text = data[key]
    if (typeof text !== 'string' || text.length > limit) throw new DevelopmentEditError(400, `Invalid ${key}`)
    return text.trim() || null
  }
  return { version: data.version, status: data.status as ProjectStatus, currentStage: field('currentStage', 1000), nextAction: field('nextAction', 20000), writerIds: ids('writerIds'), ipIds: ids('ipIds') }
}
export async function saveProjectDevelopment(id: string, value: unknown, userId: string) {
  const input = parseDevelopmentEdit(value)
  try {
    return await prisma.$transaction(async tx => {
      const before = await tx.project.findUnique({ where: { id }, select: developmentSelect })
      if (!before) throw new DevelopmentEditError(404, 'Project not found')
      if (developmentVersion(before) !== input.version) throw new DevelopmentEditError(409, 'This project changed. Reload the latest fields before saving.')
      // Triage and reading decisions have their own protected workflows. Do not bypass them here.
      if (input.status !== before.status && !DEVELOPMENT_SLATE_STATUSES.includes(input.status)) throw new DevelopmentEditError(400, 'Use the project workflow to move outside Active Development.')
      if (input.status !== before.status && ['PASS_KEEP_WRITER', 'NOT_READING', 'REFERENCE_ONLY', 'SHELVED'].includes(before.status)) throw new DevelopmentEditError(400, 'Use the reading decision workflow to change this status.')
      const contacts = await tx.contact.count({ where: { id: { in: input.writerIds } } })
      if (contacts !== input.writerIds.length) throw new DevelopmentEditError(400, 'One or more writers no longer exist.')
      const properties = await tx.ipProperty.findMany({ where: { id: { in: input.ipIds } }, select: { id: true, projectId: true } })
      if (properties.length !== input.ipIds.length) throw new DevelopmentEditError(400, 'One or more IP records no longer exist.')
      if (properties.some(p => p.projectId && p.projectId !== id)) throw new DevelopmentEditError(409, 'An IP record is linked to another project. Reload the latest fields.')
      await tx.project.update({ where: { id }, data: { status: input.status, currentStage: input.currentStage, nextAction: input.nextAction } })
      await tx.projectContact.deleteMany({ where: { projectId: id, role: 'WRITER', contactId: { notIn: input.writerIds } } })
      await tx.projectContact.createMany({ data: input.writerIds.map(contactId => ({ projectId: id, contactId, role: 'WRITER' as const })), skipDuplicates: true })
      await tx.ipProperty.updateMany({ where: { projectId: id, id: { notIn: input.ipIds } }, data: { projectId: null } })
      // Conditional claim also protects against another project linking the same unassigned IP.
      const unlinkedIds = properties.filter(p => !p.projectId).map(p => p.id)
      const claimed = await tx.ipProperty.updateMany({ where: { id: { in: unlinkedIds }, projectId: null }, data: { projectId: id } })
      if (claimed.count !== unlinkedIds.length) throw new DevelopmentEditError(409, 'An IP link changed. Reload the latest fields.')
      await tx.activityLog.create({ data: { userId, action: 'updated', entityType: 'project', entityId: id, entityName: before.title, changes: { development: { from: { status: before.status, currentStage: before.currentStage, nextAction: before.nextAction, writerIds: before.contacts.map(c => c.contactId), ipIds: before.ipProperties.map(p => p.id) }, to: { status: input.status, currentStage: input.currentStage, nextAction: input.nextAction, writerIds: input.writerIds, ipIds: input.ipIds } } } } })
      return { saved: true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new DevelopmentEditError(409, 'The project or its links changed. Reload the latest fields.')
    throw error
  }
}
