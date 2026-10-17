import type { ProjectStatus } from '@prisma/client'

// The Development Slate board is the authority for dashboard membership.
export const DEVELOPMENT_SLATE_STATUSES: ProjectStatus[] = [
  'EARLY_DEVELOPMENT', 'DEVELOPING', 'PACKAGING', 'PITCHED',
  'DEVELOPING_WITH_NETWORK', 'GREENLIT',
]
export const DEVELOPMENT_NEXT_STEPS_WHERE = {
  status: { in: DEVELOPMENT_SLATE_STATUSES },
  AND: [{ nextAction: { not: null } }, { nextAction: { not: '' } }],
}
