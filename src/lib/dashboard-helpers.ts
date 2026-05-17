import { MaterialType, ProjectStatus, Verdict, WriterLevel } from '@prisma/client'

export const READABLE_MATERIAL_TYPES: MaterialType[] = [
  'PILOT_SCRIPT',
  'FEATURE_SCRIPT',
  'TREATMENT',
  'SERIES_BIBLE',
  'OTHER',
]

export type AgeTone = 'green' | 'amber' | 'red' | 'gray'
export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW'

const DAY_MS = 24 * 60 * 60 * 1000

export function getAgeDays(date: Date | string | null | undefined, now = new Date()): number | null {
  if (!date) return null
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  const start = new Date(parsed)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY_MS))
}

export function getAgeDisplay(date: Date | string | null | undefined, now = new Date()) {
  const days = getAgeDays(date, now)
  if (days === null) return { days: null, label: '—', tone: 'gray' as AgeTone }
  const tone: AgeTone = days >= 60 ? 'red' : days >= 14 ? 'amber' : 'green'
  if (days === 0) return { days, label: 'today', tone }
  if (days >= 30) return { days, label: `${Math.max(1, Math.round(days / 30))}mo`, tone }
  return { days, label: `${days}d`, tone }
}

export function getPriority(status: ProjectStatus | null | undefined, ageDays: number | null): PriorityLevel {
  const active = status === 'SUBMITTED' || status === 'READING'
  if (!active || ageDays === null) return 'LOW'
  if (ageDays >= 30) return 'HIGH'
  if (ageDays >= 14) return 'MEDIUM'
  return 'LOW'
}

export function getEstimatedReadTime(type: MaterialType): string {
  switch (type) {
    case 'PILOT_SCRIPT':
      return '~1h'
    case 'FEATURE_SCRIPT':
      return '~2h'
    case 'SERIES_BIBLE':
      return '40m'
    case 'TREATMENT':
      return '25m'
    case 'PITCH_DECK':
      return '8m'
    case 'OTHER':
    default:
      return '15m'
  }
}

export function isReadableMaterialType(type: MaterialType): boolean {
  return type !== 'PITCH_DECK'
}

export function getPrioritySortValue(priority: PriorityLevel): number {
  return priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1
}

export function writerLevelBoost(level: WriterLevel | null | undefined): number {
  return level === 'SHOWRUNNER' || level === 'EXPERIENCED' ? 7 : 0
}

export function getVerdictTone(verdict: Verdict | null | undefined): 'gray' | 'amber' | 'green' {
  if (verdict === 'RECOMMEND') return 'green'
  if (verdict === 'CONSIDER') return 'amber'
  return 'gray'
}
