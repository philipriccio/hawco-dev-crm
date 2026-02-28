import { PrismaClient, MaterialType, ProjectStatus } from '@prisma/client'

const prisma = new PrismaClient()

const SCRIPT_TYPES: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']
const STATUS_SCOPE: ProjectStatus[] = ['SUBMITTED', 'READING', 'READ']

interface PlannedChange {
  type: 'project-status' | 'project-genre' | 'project-tag-link' | 'tag-create' | 'contact-isCanadian'
  id: string
  detail: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const sampleArg = args.find((arg) => arg.startsWith('--sample='))
  const sample = sampleArg ? Number(sampleArg.split('=')[1]) : 20
  return {
    apply,
    sample: Number.isFinite(sample) && sample > 0 ? Math.floor(sample) : 20,
  }
}

function normalizeGenreToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
}

function splitGenres(value: string | null): string[] {
  if (!value) return []
  return value
    .split(/[,/|]/)
    .map((g) => normalizeGenreToken(g))
    .filter(Boolean)
}

function isClearlyCanadianText(value: string | null): boolean {
  if (!value) return false
  return /\b(canada|canadian|canadien|canadienne)\b/i.test(value)
}

function isClearlyNonCanadianText(value: string | null): boolean {
  if (!value) return false
  if (/\b(canada|canadian|canadien|canadienne)\b/i.test(value)) return false
  return /\b(american|united states|u\.s\.|usa|uk|british|australian|new zealand)\b/i.test(value)
}

async function main() {
  const { apply, sample } = parseArgs()

  const [projects, contacts, tags, activitySummary] = await Promise.all([
    prisma.project.findMany({
      include: {
        materials: {
          where: { type: { in: SCRIPT_TYPES } },
          select: { id: true, readAt: true, type: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    }),
    prisma.contact.findMany({
      select: { id: true, name: true, isCanadian: true, citizenship: true },
    }),
    prisma.tag.findMany({
      select: { id: true, name: true },
    }),
    prisma.activityLog.groupBy({
      by: ['entityType'],
      _count: { _all: true },
    }),
  ])

  const changes: PlannedChange[] = []
  const uncertain: Array<{ kind: string; id: string; detail: string }> = []

  const tagByNormalized = new Map<string, { id: string; name: string }>()
  for (const tag of tags) {
    tagByNormalized.set(tag.name.toLowerCase(), tag)
  }

  const missingTagNames = new Set<string>()
  const pendingTagLinks: Array<{ projectId: string; tagName: string }> = []

  // 1) Read/unread reconciliation (status only within intake status scope)
  for (const project of projects) {
    if (!project.materials.length) continue

    const unreadCount = project.materials.filter((m) => !m.readAt).length
    const allRead = unreadCount === 0

    if (STATUS_SCOPE.includes(project.status)) {
      if (allRead && project.status !== 'READ') {
        changes.push({
          type: 'project-status',
          id: project.id,
          detail: `${project.title}: ${project.status} -> READ (all ${project.materials.length} script materials have readAt)`,
        })
      }

      if (!allRead && project.status === 'READ') {
        changes.push({
          type: 'project-status',
          id: project.id,
          detail: `${project.title}: READ -> READING (${unreadCount}/${project.materials.length} script materials unread)`,
        })
      }
    } else {
      if (!allRead && project.status === 'READ') {
        uncertain.push({
          kind: 'read-status-out-of-scope',
          id: project.id,
          detail: `${project.title}: status=${project.status} with unread scripts (${unreadCount}/${project.materials.length})`,
        })
      }
    }
  }

  // 2) Genre reconciliation (union of project.genre and linked tags)
  for (const project of projects) {
    const genreFromText = splitGenres(project.genre)
    const genreFromTags = project.tags.map((entry) => normalizeGenreToken(entry.tag.name))
    const desired = Array.from(new Set([...genreFromText, ...genreFromTags])).sort((a, b) => a.localeCompare(b))

    const desiredGenre = desired.length > 0 ? desired.join(', ') : null
    const currentGenre = project.genre?.trim() || null

    if ((currentGenre || null) !== desiredGenre) {
      changes.push({
        type: 'project-genre',
        id: project.id,
        detail: `${project.title}: genre ${JSON.stringify(currentGenre)} -> ${JSON.stringify(desiredGenre)}`,
      })
    }

    const existingTagNames = new Set(project.tags.map((entry) => entry.tag.name.toLowerCase()))
    for (const name of desired) {
      const normalized = name.toLowerCase()
      if (!tagByNormalized.has(normalized)) {
        missingTagNames.add(name)
      }
      if (!existingTagNames.has(normalized)) {
        pendingTagLinks.push({ projectId: project.id, tagName: name })
        changes.push({
          type: 'project-tag-link',
          id: project.id,
          detail: `${project.title}: add tag link ${name}`,
        })
      }
    }
  }

  for (const name of missingTagNames) {
    changes.push({
      type: 'tag-create',
      id: name.toLowerCase(),
      detail: `create tag: ${name}`,
    })
  }

  // 3) Canadian reconciliation
  for (const contact of contacts) {
    const canadianByText = isClearlyCanadianText(contact.citizenship)
    const nonCanadianByText = isClearlyNonCanadianText(contact.citizenship)

    if (!contact.isCanadian && canadianByText) {
      changes.push({
        type: 'contact-isCanadian',
        id: contact.id,
        detail: `${contact.name}: isCanadian false -> true (citizenship=${JSON.stringify(contact.citizenship)})`,
      })
    }

    if (contact.isCanadian && nonCanadianByText) {
      uncertain.push({
        kind: 'canadian-conflict',
        id: contact.id,
        detail: `${contact.name}: isCanadian=true but citizenship=${JSON.stringify(contact.citizenship)}`,
      })
    }
  }

  const byType = changes.reduce<Record<string, number>>((acc, change) => {
    acc[change.type] = (acc[change.type] || 0) + 1
    return acc
  }, {})

  console.log('=== Hawco CRM redesign reconciliation audit ===')
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log('')
  console.log('Provenance quick check:')
  const activityCount = activitySummary.reduce((sum, row) => sum + row._count._all, 0)
  console.log(`- ActivityLog rows: ${activityCount}`)
  for (const row of activitySummary.sort((a, b) => a.entityType.localeCompare(b.entityType))) {
    console.log(`  - ${row.entityType}: ${row._count._all}`)
  }

  console.log('')
  console.log('Planned deterministic changes:')
  for (const [key, count] of Object.entries(byType).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${key}: ${count}`)
  }
  console.log(`- total: ${changes.length}`)

  console.log('')
  console.log(`Sample changes (first ${Math.min(sample, changes.length)}):`)
  for (const line of changes.slice(0, sample)) {
    console.log(`- [${line.type}] ${line.detail}`)
  }

  console.log('')
  console.log(`Uncertain records: ${uncertain.length}`)
  for (const line of uncertain.slice(0, sample)) {
    console.log(`- [${line.kind}] ${line.detail}`)
  }

  if (!apply) {
    console.log('')
    console.log('Dry run complete. Re-run with --apply to write changes.')
    return
  }

  await prisma.$transaction(async (tx) => {
    // Create missing tags first
    for (const name of missingTagNames) {
      const existing = await tx.tag.findFirst({
        where: {
          OR: [
            { name },
            { name: name.toLowerCase() },
            { name: name.toUpperCase() },
          ],
        },
        select: { id: true, name: true },
      })

      if (!existing) {
        const created = await tx.tag.create({
          data: { name, category: 'genre', color: '#3b82f6' },
          select: { id: true, name: true },
        })
        tagByNormalized.set(created.name.toLowerCase(), created)
      } else {
        tagByNormalized.set(existing.name.toLowerCase(), existing)
      }
    }

    // Status + genre updates
    for (const project of projects) {
      const scriptMaterials = project.materials
      const unreadCount = scriptMaterials.filter((m) => !m.readAt).length
      const allRead = scriptMaterials.length > 0 && unreadCount === 0

      const updateData: {
        status?: ProjectStatus
        genre?: string | null
      } = {}

      if (STATUS_SCOPE.includes(project.status)) {
        if (allRead && project.status !== 'READ') {
          updateData.status = 'READ'
        } else if (!allRead && project.status === 'READ') {
          updateData.status = 'READING'
        }
      }

      const genreFromText = splitGenres(project.genre)
      const genreFromTags = project.tags.map((entry) => normalizeGenreToken(entry.tag.name))
      const desired = Array.from(new Set([...genreFromText, ...genreFromTags])).sort((a, b) => a.localeCompare(b))
      const desiredGenre = desired.length ? desired.join(', ') : null
      const currentGenre = project.genre?.trim() || null
      if ((currentGenre || null) !== desiredGenre) {
        updateData.genre = desiredGenre
      }

      if (Object.keys(updateData).length > 0) {
        await tx.project.update({
          where: { id: project.id },
          data: updateData,
        })
      }
    }

    // Tag links
    for (const link of pendingTagLinks) {
      const tag = tagByNormalized.get(link.tagName.toLowerCase())
      if (!tag) continue
      await tx.projectTag.upsert({
        where: {
          projectId_tagId: {
            projectId: link.projectId,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          projectId: link.projectId,
          tagId: tag.id,
        },
      })
    }

    // Canadian flag updates
    for (const contact of contacts) {
      if (!contact.isCanadian && isClearlyCanadianText(contact.citizenship)) {
        await tx.contact.update({
          where: { id: contact.id },
          data: { isCanadian: true },
        })
      }
    }
  })

  console.log('')
  console.log('Apply complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
