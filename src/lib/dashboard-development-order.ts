import { Prisma } from '@prisma/client'
import { prisma } from './db'
import { DEVELOPMENT_SLATE_STATUSES } from './development-slate'

type StoredOrder = { revision: number; projectIds: string[] }
export class OrderError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function parseOrder(value: unknown): { revision: number; projectIds: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OrderError(400, 'Invalid order')
  const { revision, projectIds } = value as Record<string, unknown>
  if (!Number.isSafeInteger(revision) || (revision as number) < 0 || !Array.isArray(projectIds) || projectIds.length > 10000 || projectIds.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(projectIds).size !== projectIds.length) throw new OrderError(400, 'Invalid order')
  return { revision: revision as number, projectIds: projectIds as string[] }
}
export function orderedIds(saved: string[], active: string[]) {
  const set = new Set(active), seen = new Set(saved)
  return [...saved.filter(id => set.has(id)), ...active.filter(id => !seen.has(id))]
}
// Inactive projects keep their slots. New active projects append; deleted IDs are discarded.
export function retainInactive(saved: string[], requested: string[], all: string[]) {
  const existing = new Set(all), active = new Set(requested)
  let index = 0
  const result = saved.filter(id => existing.has(id)).map(id => active.has(id) ? requested[index++] : id)
  return [...result, ...requested.slice(index)]
}
export async function getDashboardDevelopment() {
  return prisma.$transaction(async tx => {
    const [order] = await tx.$queryRaw<StoredOrder[]>`SELECT "revision", "projectIds" FROM "DashboardDevelopmentOrder" WHERE "id" = 'active-development'`
    if (!order) throw new Error('Dashboard order storage unavailable')
    const projects = await tx.project.findMany({
      where: { status: { in: DEVELOPMENT_SLATE_STATUSES } },
      select: { id: true, title: true, status: true, currentStage: true, nextAction: true,
        contacts: { where: { role: 'WRITER' }, select: { contact: { select: { id: true, name: true } } }, orderBy: { contact: { name: 'asc' } } },
        ipProperties: { select: { id: true, title: true }, orderBy: { title: 'asc' } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })
    const byId = new Map(projects.map(p => [p.id, p]))
    return { revision: order.revision, projects: orderedIds(order.projectIds, projects.map(p => p.id)).map(id => byId.get(id)!) }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function saveDashboardOrder(value: unknown) {
  const input = parseOrder(value)
  return prisma.$transaction(async tx => {
    const [saved] = await tx.$queryRaw<StoredOrder[]>`SELECT "revision", "projectIds" FROM "DashboardDevelopmentOrder" WHERE "id" = 'active-development' FOR UPDATE`
    if (!saved) throw new Error('Dashboard order storage unavailable')
    if (saved.revision !== input.revision) throw new OrderError(409, 'The order changed in another tab. Reload the latest order.')
    const projects = await tx.$queryRaw<{ id: string; status: string }[]>`SELECT "id", "status" FROM "Project" ORDER BY "id" FOR SHARE`
    const active = projects.filter(p => (DEVELOPMENT_SLATE_STATUSES as string[]).includes(p.status))
    const requested = new Set(input.projectIds)
    if (input.projectIds.some(id => !projects.some(p => p.id === id))) throw new OrderError(400, 'Unknown project')
    if (active.length !== requested.size || active.some(p => !requested.has(p.id))) throw new OrderError(409, 'The active projects changed. Reload the latest list.')
    const next = retainInactive(saved.projectIds, input.projectIds, projects.map(p => p.id))
    await tx.$executeRaw`UPDATE "DashboardDevelopmentOrder" SET "projectIds" = ${JSON.stringify(next)}::jsonb, "revision" = "revision" + 1 WHERE "id" = 'active-development'`
    return { revision: saved.revision + 1 }
  })
}
