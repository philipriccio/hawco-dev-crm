import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  project: '#3b82f6',
  coverage: '#a855f7',
  contact: '#22c55e',
  material: '#f59e0b',
  other: '#64748b',
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function upsertTag(name: string, category: string, color: string) {
  if (!name.trim()) return

  const existing = await prisma.tag.findFirst({
    where: {
      OR: [
        { name: name.trim() },
        { name: name.trim().toUpperCase() },
        { name: toTitleCase(name.trim()) },
      ],
    },
  })

  if (existing) {
    if (!existing.category || !existing.color) {
      await prisma.tag.update({
        where: { id: existing.id },
        data: {
          category: existing.category || category,
          color: existing.color || color,
        },
      })
    }
    return
  }

  await prisma.tag.create({
    data: {
      name: toTitleCase(name.trim()),
      category,
      color,
    },
  })
}

async function bootstrapTagsFromExistingData() {
  const [projects, contacts, materials, coverages] = await Promise.all([
    prisma.project.findMany({ select: { genre: true, status: true, origin: true } }),
    prisma.contact.findMany({ select: { type: true } }),
    prisma.material.findMany({ select: { type: true } }),
    prisma.coverage.findMany({ select: { verdict: true } }),
  ])

  for (const project of projects) {
    if (project.genre) {
      const genres = project.genre
        .split(/[,/]/)
        .map((g) => g.trim())
        .filter(Boolean)
      for (const genre of genres) {
        await upsertTag(genre, 'project', DEFAULT_CATEGORY_COLORS.project)
      }
    }

    if (project.status) {
      await upsertTag(project.status, 'project', DEFAULT_CATEGORY_COLORS.project)
    }

    if (project.origin) {
      await upsertTag(project.origin, 'project', DEFAULT_CATEGORY_COLORS.project)
    }
  }

  for (const contact of contacts) {
    if (contact.type) {
      await upsertTag(contact.type, 'contact', DEFAULT_CATEGORY_COLORS.contact)
    }
  }

  for (const material of materials) {
    if (material.type) {
      await upsertTag(material.type, 'material', DEFAULT_CATEGORY_COLORS.material)
    }
  }

  for (const coverage of coverages) {
    if (coverage.verdict) {
      await upsertTag(coverage.verdict, 'coverage', DEFAULT_CATEGORY_COLORS.coverage)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Keep tag inventory in sync with real CRM data (idempotent)
    await bootstrapTagsFromExistingData()

    const tags = await prisma.tag.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const body = await request.json()
    const { name, color, category } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || null,
        category: category || null,
      },
    })

    return NextResponse.json(tag)
  } catch (error: unknown) {
    console.error('Error creating tag:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}
