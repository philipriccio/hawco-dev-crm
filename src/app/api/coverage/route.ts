import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CoverageInputError, coverageReadDate, resolveCoverageLinks, syncCoverageRead } from '@/lib/coverage-save'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const verdict = searchParams.get('verdict')
    const search = searchParams.get('search')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const projectId = searchParams.get('projectId')
    const scriptId = searchParams.get('scriptId')
    const limit = searchParams.get('limit')

    const where: Record<string, unknown> = {}

    if (verdict) {
      where.verdict = verdict.toUpperCase()
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { writer: { contains: search, mode: 'insensitive' } },
        { logline: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (fromDate || toDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (fromDate) {
        dateFilter.gte = new Date(fromDate)
      }
      if (toDate) {
        dateFilter.lte = new Date(toDate)
      }
      where.dateRead = dateFilter
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (scriptId) {
      where.scriptId = scriptId
    }

    const coverages = await prisma.coverage.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        script: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { dateRead: 'desc' },
      take: limit ? parseInt(limit) : undefined,
    })

    return NextResponse.json(coverages)
  } catch (error) {
    console.error('Error fetching coverages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coverages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const body = await request.json()

    // Validate required fields
    if (!body.projectId) {
      return NextResponse.json(
        { error: 'Project is required' },
        { status: 400 }
      )
    }

    if (!body.title || !body.writer) {
      return NextResponse.json(
        { error: 'Title and Writer are required' },
        { status: 400 }
      )
    }

    // Calculate total score
    const scores = [
      body.scoreConcept,
      body.scoreCharacters,
      body.scoreStructure,
      body.scoreDialogue,
      body.scoreMarketFit,
    ].filter((s): s is number => typeof s === 'number')

    const scoreTotal = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : null

    const dateRead = coverageReadDate(body.dateRead)
    const coverage = await prisma.$transaction(async (tx) => {
      const links = await resolveCoverageLinks(tx, body.projectId, body.scriptId || null, dateRead)
      const saved = await tx.coverage.create({
      data: {
        reader: body.reader || 'Phil',
        dateRead,
        title: body.title,
        writer: body.writer,
        format: body.format,
        genre: body.genre,
        source: body.source,
        draftDate: body.draftDate,
        logline: body.logline,
        synopsis: body.synopsis,
        seriesEngine: body.seriesEngine,
        targetNetwork: body.targetNetwork,
        comps: body.comps,
        scoreConcept: body.scoreConcept,
        scoreCharacters: body.scoreCharacters,
        scoreStructure: body.scoreStructure,
        scoreDialogue: body.scoreDialogue,
        scoreMarketFit: body.scoreMarketFit,
        scoreTotal,
        notesConcept: body.notesConcept,
        notesCharacters: body.notesCharacters,
        notesStructure: body.notesStructure,
        notesDialogue: body.notesDialogue,
        notesMarketFit: body.notesMarketFit,
        mandateCanadian: body.mandateCanadian || false,
        mandateStarRole: body.mandateStarRole || false,
        mandateIntlCoPro: body.mandateIntlCoPro || false,
        mandateBudget: body.mandateBudget || false,
        strengths: body.strengths,
        weaknesses: body.weaknesses,
        summary: body.summary,
        verdict: body.verdict || 'PASS',
        scriptId: links.scriptId,
        projectId: body.projectId || null,
      },
    })

      await syncCoverageRead(tx, saved)
      return saved
    })

    // Log activity
    await logActivity({
      action: 'created',
      entityType: 'coverage',
      entityId: coverage.id,
      entityName: coverage.title,
    })

    return NextResponse.json(coverage, { status: 201 })
  } catch (error) {
    if (error instanceof CoverageInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error creating coverage:', error)
    return NextResponse.json(
      { error: 'Failed to create coverage' },
      { status: 500 }
    )
  }
}
