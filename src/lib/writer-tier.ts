export const writerTierLabels: Record<string, string> = {
  WANT_TO_WORK_WITH: 'Want to Work With',
  CONSIDER_WORKING_WITH: 'Consider Working With',
  NEED_TO_CHANGE_MY_MIND: 'Need to Change My Mind',
}

export const writerTierDescriptions: Record<string, string> = {
  WANT_TO_WORK_WITH: 'Writers Hawco actively wants to pursue.',
  CONSIDER_WORKING_WITH: 'Writers worth considering when the right project fits.',
  NEED_TO_CHANGE_MY_MIND: 'Writers who need new evidence before Hawco pursues them.',
}

export const writerTierColors: Record<string, string> = {
  WANT_TO_WORK_WITH: 'bg-emerald-100 text-emerald-700',
  CONSIDER_WORKING_WITH: 'bg-blue-100 text-blue-700',
  NEED_TO_CHANGE_MY_MIND: 'bg-amber-100 text-amber-700',
}

export const writerTierOrder = [
  'WANT_TO_WORK_WITH',
  'CONSIDER_WORKING_WITH',
  'NEED_TO_CHANGE_MY_MIND',
] as const

export const defaultWriterTier = 'CONSIDER_WORKING_WITH'

export function writerTierLabel(tier: string | null | undefined) {
  return tier ? writerTierLabels[tier] || tier.replace(/_/g, ' ') : 'Consider Working With'
}
