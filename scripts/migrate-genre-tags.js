const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const GENRE_TAG_COLOR = '#7c3aed'
const STARTER_GENRE_TAGS = [
  'drama', 'comedy', 'comedy-drama', 'thriller', 'crime', 'procedural', 'mystery', 'sci-fi', 'fantasy',
  'horror', 'supernatural', 'family', 'teen', 'historical', 'period', 'anthology', 'limited-series',
  'workplace', 'ensemble', 'romance', 'action', 'adventure', 'true-crime', 'docudrama',
]
const EXPLICIT_GENRE_MAP = {
  comedy: ['comedy'],
  drama: ['drama'],
  crime: ['crime'],
  thriller: ['thriller'],
  procedural: ['procedural'],
  'crime/mystery': ['crime', 'mystery'],
  '½ hour comedy': ['comedy'],
  '1 hour drama': ['drama'],
}
function cleanGenreToken(value) {
  return String(value || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}
function normalizeGenreTags(value) {
  const text = String(value || '').trim()
  if (!text) return []
  const explicit = EXPLICIT_GENRE_MAP[text.toLowerCase()]
  if (explicit) return explicit
  return [...new Set(text.split(/[,/]/).map(cleanGenreToken).filter(Boolean))]
}
function normalizeFormatFromLegacyGenre(value, existingFormat) {
  if (existingFormat) return existingFormat
  const text = String(value || '').trim().toLowerCase()
  if (text === '½ hour comedy') return '½ Hour'
  if (text === '1 hour drama') return '1 Hour'
  return existingFormat || null
}

async function main() {
  console.log('Migrating project genre strings to genre tags...')
  for (const name of STARTER_GENRE_TAGS) {
    await prisma.tag.upsert({
      where: { name },
      update: { category: 'genre', color: GENRE_TAG_COLOR },
      create: { name, category: 'genre', color: GENRE_TAG_COLOR },
    })
  }

  const projects = await prisma.project.findMany({ select: { id: true, genre: true, format: true } })
  let linked = 0
  for (const project of projects) {
    const tags = normalizeGenreTags(project.genre)
    const nextFormat = normalizeFormatFromLegacyGenre(project.genre, project.format)
    if (nextFormat !== project.format) {
      await prisma.project.update({ where: { id: project.id }, data: { format: nextFormat } })
    }
    for (const name of tags) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: { category: 'genre', color: GENRE_TAG_COLOR },
        create: { name, category: 'genre', color: GENRE_TAG_COLOR },
      })
      await prisma.projectTag.upsert({
        where: { projectId_tagId: { projectId: project.id, tagId: tag.id } },
        update: {},
        create: { projectId: project.id, tagId: tag.id },
      })
      linked += 1
    }
  }
  console.log(`Genre tag migration complete: ${STARTER_GENRE_TAGS.length} starter tags, ${linked} project-tag links checked.`)
}

main().catch((error) => { console.error(error); process.exit(1) }).finally(async () => prisma.$disconnect())
