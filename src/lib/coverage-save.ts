import { Coverage, Prisma } from '@prisma/client'

export class CoverageInputError extends Error {}

export function isCoverageSample(material: { title: string; notes?: string | null }) {
  return /\bsample\b|unrelated|different project/i.test(`${material.title} ${material.notes || ''}`)
}

export function isPhilipCoverage(reader: string) {
  return /^(phil|philip|philip riccio)$/i.test(reader.trim())
}

export function coverageReadDate(value: unknown): Date {
  const date = typeof value === 'string' || value instanceof Date ? new Date(value) : new Date(NaN)
  if (!Number.isFinite(date.getTime())) throw new CoverageInputError('A valid date read is required')
  const today = new Date()
  today.setUTCHours(23, 59, 59, 999)
  if (date.getTime() > today.getTime()) throw new CoverageInputError('Date read cannot be in the future')
  return date
}

/** A saved human assessment is an explicit read assertion, not a development verdict. */
export async function resolveCoverageLinks(tx: Prisma.TransactionClient, projectId: string | null, scriptId: string | null, dateRead: Date) {
  if (!projectId) throw new CoverageInputError('Project is required')
  const project = await tx.project.findUnique({ where: { id: projectId } })
  if (!project) throw new CoverageInputError('Project no longer exists')
  if (scriptId) {
    const material = await tx.material.findUnique({ where: { id: scriptId } })
    if (!material || material.projectId !== projectId) throw new CoverageInputError('Selected material does not belong to this project')
    if (!['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'PITCH_DECK', 'SERIES_BIBLE', 'ONE_PAGER', 'TREATMENT'].includes(material.type)) {
      throw new CoverageInputError('Select readable material for this coverage')
    }
    return { project, scriptId }
  }
  // Never infer that every attachment or later revision was read. Infer only one unambiguous script.
  const endOfReadDay = new Date(dateRead)
  endOfReadDay.setUTCHours(23, 59, 59, 999)
  const candidates = await tx.material.findMany({
    where: { projectId, type: { in: ['PILOT_SCRIPT', 'FEATURE_SCRIPT'] }, createdAt: { lte: endOfReadDay } },
    select: { id: true, title: true, notes: true },
  })
  const scripts = candidates.filter(material => !isCoverageSample(material))
  if (scripts.length > 1) throw new CoverageInputError('This project has multiple scripts. Select the material you read before saving.')
  return { project, scriptId: scripts[0]?.id ?? null }
}

export async function syncCoverageRead(tx: Prisma.TransactionClient, coverage: Coverage) {
  if (!isPhilipCoverage(coverage.reader)) return
  if (!coverage.projectId) throw new CoverageInputError('Project is required')
  await tx.project.updateMany({ where: { id: coverage.projectId, firstReadAt: null }, data: { firstReadAt: coverage.dateRead } })
  if (coverage.scriptId) {
    await tx.material.updateMany({ where: { id: coverage.scriptId, projectId: coverage.projectId, readAt: null }, data: { readAt: coverage.dateRead } })
  }
  if (coverage.scriptId) {
    const material = await tx.material.findUnique({ where: { id: coverage.scriptId }, select: { title: true, notes: true } })
    if (material && isCoverageSample(material)) return
  }
  // Conditional writes preserve summaries entered concurrently and never replace a human evaluation.
  for (const field of ['logline', 'synopsis', 'genre', 'format', 'comps', 'targetNetwork'] as const) {
    if (coverage[field]) await tx.project.updateMany({
      where: { id: coverage.projectId, OR: [{ [field]: null }, { [field]: '' }] },
      data: { [field]: coverage[field] },
    })
  }
}
