import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params
    const body = await request.json()

    // Calculate total score if any score fields are provided
    let scoreTotal = undefined
    if (
      body.scoreConcept !== undefined ||
      body.scoreCharacters !== undefined ||
      body.scoreStructure !== undefined ||
      body.scoreDialogue !== undefined ||
      body.scoreMarketFit !== undefined
    ) {
      // Get current values first
      const current = await prisma.coverage.findUnique({
        where: { id },
        select: {
          scoreConcept: true,
          scoreCharacters: true,
          scoreStructure: true,
          scoreDialogue: true,
          scoreMarketFit: true,
        },
      })

      if (!current) {
        return NextResponse.json(
          { error: 'Coverage not found' },
          { status: 404 }
        )
      }

      const scores = [
        body.scoreConcept ?? current.scoreConcept,
        body.scoreCharacters ?? current.scoreCharacters,
        body.scoreStructure ?? current.scoreStructure,
        body.scoreDialogue ?? current.scoreDialogue,
        body.scoreMarketFit ?? current.scoreMarketFit,
      ].filter((s): s is number => typeof s === 'number')

      scoreTotal = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : null
    }

    const coverage = await prisma.coverage.update({
      where: { id },
      data: {
        reader: body.reader,
        dateRead: body.dateRead ? new Date(body.dateRead) : undefined,
        title: body.title,
        writer: body.writer,
        format: body.format,
        source: body.source,
        draftDate: body.draftDate,
        logline: body.logline,
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
      },
    })

    return NextResponse.json(coverage)
  } catch (error) {
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
    const { id } = await params

    await prisma.coverage.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting coverage:', error)
    return NextResponse.json(
      { error: 'Failed to delete coverage' },
      { status: 500 }
    )
  }
}
