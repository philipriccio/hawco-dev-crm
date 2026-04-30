import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectStatus, ProjectOrigin } from '@prisma/client'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const data = await request.json()

    const genreTagIds = Array.isArray(data.genreTagIds) ? data.genreTagIds : []
    const genreTags = genreTagIds.length
      ? await prisma.tag.findMany({ where: { id: { in: genreTagIds } }, select: { id: true, name: true } })
      : []

    const project = await prisma.project.create({
      data: {
        title: data.title,
        logline: data.logline || null,
        synopsis: data.synopsis || null,
        format: data.format || null,
        genre: genreTags.length > 0 ? genreTags.map((t) => t.name).join(', ') : (data.genre || null),
        comps: data.comps || null,
        status: (data.status as ProjectStatus) || 'SUBMITTED',
        origin: (data.origin as ProjectOrigin) || 'EXTERNAL',
        verdict: data.verdict || null,
        dateReceived: data.dateReceived ? new Date(data.dateReceived) : null,
        firstReadAt: data.firstReadAt ? new Date(data.firstReadAt) : null,
        readPriority: typeof data.readPriority === 'number' ? data.readPriority : null,
        considerRelationship: Boolean(data.considerRelationship),
        rewriteStatus: data.rewriteStatus || null,
        pitchReady: typeof data.pitchReady === 'boolean' ? data.pitchReady : null,
        pitchChecklist: data.pitchChecklist ?? null,
        currentStage: data.currentStage || null,
        packagingNeeds: data.packagingNeeds || null,
        nextAction: data.nextAction || null,
        targetNetwork: data.targetNetwork || null,
        intlPotential: data.intlPotential || false,
        notes: data.notes || null,
        companies: data.companyId
          ? { create: [{ companyId: data.companyId, role: 'Primary' }] }
          : undefined,
        tags: genreTags.length > 0
          ? { create: genreTags.map((tag) => ({ tagId: tag.id })) }
          : undefined,
      },
    })

    // Log activity
    await logActivity({
      action: 'created',
      entityType: 'project',
      entityId: project.id,
      entityName: project.title,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status.toUpperCase()
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { logline: { contains: search, mode: 'insensitive' } },
        { genre: { contains: search, mode: 'insensitive' } },
      ]
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
