import type { Prisma } from '@prisma/client'

export type ReadingSource = '' | 'main' | 'website-unsolicited'

// Only explicit project metadata classifies intake. External origin and notes are not evidence.
export function isWebsiteUnsolicited(material: { project?: { websiteUnsolicited?: boolean } | null }): boolean {
  return material.project?.websiteUnsolicited === true
}

export function readingSourceWhere(source: ReadingSource): Prisma.MaterialWhereInput {
  if (source === 'website-unsolicited') return { project: { is: { websiteUnsolicited: true } } }
  if (source === 'main') return { OR: [{ project: { is: null } }, { project: { is: { websiteUnsolicited: false } } }] }
  return {}
}
