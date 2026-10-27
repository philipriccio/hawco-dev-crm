import { Prisma } from '@prisma/client'
import { READABLE_MATERIAL_TYPES } from './dashboard-helpers'

// Material.readAt is the CRM's recorded read mark, not import/update/coverage time.
// Include both reading sources and orphan materials; cap and sort in the database.
export const RECENTLY_READ_QUERY = {
  where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { not: null } },
  orderBy: [{ readAt: 'desc' }, { id: 'asc' }],
  take: 10,
  select: {
    id: true,
    title: true,
    type: true,
    readAt: true,
    project: { select: { id: true, title: true } },
  },
} satisfies Prisma.MaterialFindManyArgs
