export const GENRE_TAG_COLOR = '#7c3aed'

export const STARTER_GENRE_TAGS = [
  'drama',
  'comedy',
  'comedy-drama',
  'thriller',
  'crime',
  'procedural',
  'mystery',
  'sci-fi',
  'fantasy',
  'horror',
  'supernatural',
  'family',
  'teen',
  'historical',
  'period',
  'anthology',
  'limited-series',
  'workplace',
  'ensemble',
  'romance',
  'action',
  'adventure',
  'true-crime',
  'docudrama',
] as const

const EXPLICIT_GENRE_MAP: Record<string, string[]> = {
  comedy: ['comedy'],
  drama: ['drama'],
  crime: ['crime'],
  thriller: ['thriller'],
  procedural: ['procedural'],
  'crime/mystery': ['crime', 'mystery'],
  '½ hour comedy': ['comedy'],
  '1 hour drama': ['drama'],
}

function cleanGenreToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizeGenreTags(value: string | null | undefined): string[] {
  const text = value?.trim()
  if (!text) return []

  const explicit = EXPLICIT_GENRE_MAP[text.toLowerCase()]
  if (explicit) return explicit

  const tags = text
    .split(/[,/]/)
    .map(cleanGenreToken)
    .filter(Boolean)

  return [...new Set(tags)]
}

export function normalizeFormatFromLegacyGenre(value: string | null | undefined, existingFormat?: string | null) {
  if (existingFormat) return existingFormat
  const text = value?.trim().toLowerCase()
  if (text === '½ hour comedy') return '½ Hour'
  if (text === '1 hour drama') return '1 Hour'
  return existingFormat ?? null
}
