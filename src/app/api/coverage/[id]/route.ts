import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CoverageInputError, coverageReadDate, isPhilipCoverage, resolveCoverageLinks, syncCoverageRead } from '@/lib/coverage-save'
import { logActivity, calculateChanges } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params

    const coverage = await prisma.coverage.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            genre: true,
          },
        },
        script: {
          select: {
            id: true,
            title: true,
            type: true,
            filename: true,
            fileUrl: true,
          },
        },
      },
    })

    if (!coverage) {
      return NextResponse.json(
        { error: 'Coverage not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(coverage)
  } catch (error) {
    console.error('Error fetching coverage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coverage' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()

    // Get existing coverage for change tracking
    const existingCoverage = await prisma.coverage.findUnique({
      where: { id },
    })

    if (!existingCoverage) {
      return NextResponse.json(
        { error: 'Coverage not found' },
        { status: 404 }
      )
    }

    // Calculate total score if any score fields are provided
    let scoreTotal = undefined
    if (
      body.scoreConcept !== undefined ||
      body.scoreCharacters !== undefined ||
      body.scoreStructure !== undefined ||
      body.scoreDialogue !== undefined ||
      body.scoreMarketFit !== undefined
    ) {
      const scores = [
        body.scoreConcept ?? existingCoverage.scoreConcept,
        body.scoreCharacters ?? existingCoverage.scoreCharacters,
        body.scoreStructure ?? existingCoverage.scoreStructure,
        body.scoreDialogue ?? existingCoverage.scoreDialogue,
        body.scoreMarketFit ?? existingCoverage.scoreMarketFit,
      ].filter((s): s is number => typeof s === 'number')

      scoreTotal = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : null
    }

    const updateData = {
      reader: body.reader,
      dateRead: body.dateRead !== undefined ? coverageReadDate(body.dateRead) : undefined,
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
      mandateCanadian: body.mandateCanadian,
      mandateStarRole: body.mandateStarRole,
      mandateIntlCoPro: body.mandateIntlCoPro,
      mandateBudget: body.mandateBudget,
      strengths: body.strengths,
      weaknesses: body.weaknesses,
      summary: body.summary,
      verdict: body.verdict,
      scriptId: body.scriptId,
      projectId: body.projectId,
    }

    const coverage = await prisma.$transaction(async (tx) => {
      const current = await tx.coverage.findUniqueOrThrow({ where: { id } })
      if (!isPhilipCoverage(current.reader) && typeof body.reader === 'string' && isPhilipCoverage(body.reader)) {
        throw new CoverageInputError('Keep the original reader on imported coverage. Create a new manual coverage to record your own read.')
      }
      const links = await resolveCoverageLinks(tx,
        body.projectId !== undefined ? body.projectId : current.projectId,
        body.scriptId !== undefined ? body.scriptId || null : current.scriptId,
        updateData.dateRead ?? current.dateRead)
      const saved = await tx.coverage.update({ where: { id }, data: { ...updateData, scriptId: links.scriptId } })
      if (isPhilipCoverage(current.reader)) await syncCoverageRead(tx, saved)
      return saved
    })

    // Log activity with changes
    const changes = calculateChanges(
      existingCoverage as unknown as Record<string, unknown>,
      body
    )
    await logActivity({
      action: 'updated',
      entityType: 'coverage',
      entityId: coverage.id,
      entityName: coverage.title,
      changes,
    })

    return NextResponse.json(coverage)
  } catch (error) {
    if (error instanceof CoverageInputError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error updating coverage:', error)
    return NextResponse.json(
      { error: 'Failed to update coverage' },
      { status: 500 }
    )
  }
}

// Alias PUT to PATCH
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params

    // Get coverage title before deleting
    const coverage = await prisma.coverage.findUnique({
      where: { id },
      select: { title: true },
    })

    await prisma.coverage.delete({
      where: { id },
    })

    // Log activity
    if (coverage) {
      await logActivity({
        action: 'deleted',
        entityType: 'coverage',
        entityId: id,
        entityName: coverage.title,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting coverage:', error)
    return NextResponse.json(
      { error: 'Failed to delete coverage' },
      { status: 500 }
    )
  }
}
