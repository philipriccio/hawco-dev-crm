const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(root, rel))

function testBuyerTypeRemoved() {
  const schema = read('prisma/schema.prisma')
  const contactTypeBlock = schema.match(/enum ContactType \{([\s\S]*?)\}/)?.[1] || ''
  assert(!contactTypeBlock.includes('BUYER'), 'ContactType enum should not include BUYER')
  const betaFacingFiles = [
    'src/app/contacts/page.tsx',
    'src/app/contacts/new/page.tsx',
    'src/app/contacts/[id]/edit/page.tsx',
    'src/app/contacts/[id]/page.tsx',
    'src/app/projects/[id]/contacts/add/page.tsx',
  ]
  for (const file of betaFacingFiles) {
    assert(!read(file).includes('BUYER'), `${file} should not expose BUYER contact type`)
  }
  assert(exists('prisma/migrations/202605211610_remove_buyer_contact_type/migration.sql'), 'BUYER removal migration should exist')
}

function testGenreTagConsistency() {
  const helper = read('src/lib/genre-tags.ts')
  assert(helper.includes('STARTER_GENRE_TAGS'), 'starter genre vocabulary should be centralized')
  assert(helper.includes('crime/mystery'), 'legacy Crime/Mystery should normalize to tags')
  assert(helper.includes("'½ hour comedy'"), 'legacy ½ Hour Comedy should normalize')
  assert(helper.includes("'1 hour drama'"), 'legacy 1 Hour Drama should normalize')

  const tagsRoute = read('src/app/api/tags/route.ts')
  assert(tagsRoute.includes("upsertTag(genre, 'genre'"), 'tag bootstrap should use category=genre for project genres')
  assert(!tagsRoute.includes("upsertTag(genre, 'project'"), 'project genre strings should not bootstrap as category=project')

  const seed = read('prisma/seed.ts')
  assert(seed.includes('STARTER_GENRE_TAGS'), 'seed should create starter genre tags')
  assert(seed.includes('normalizeGenreTags(sub.genre)'), 'seeded submissions should create project genre tags')
  assert(seed.includes('normalizeGenreTags(orig.genre)'), 'seeded originals should create project genre tags')

  assert(exists('prisma/migrations/202605211620_seed_genre_tags/migration.sql'), 'genre tag migration should exist')
}

function testScoreDocs() {
  const aiCoverage = read('src/app/api/projects/[id]/ai-coverage/route.ts')
  assert(!aiCoverage.includes('0-5'), 'CoverageIQ comments must not claim 0-5 scale')
  assert(!aiCoverage.includes('/5 schema'), 'CoverageIQ comments must not claim /5 schema')
}

testBuyerTypeRemoved()
testGenreTagConsistency()
testScoreDocs()
console.log('✓ CRM intake scope cleanup checks passed')
