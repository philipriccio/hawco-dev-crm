import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const cycles = await prisma.rewriteCycle.findMany({
      where: { projectId: id },
      orderBy: [{ cycleNumber: 'desc' }],
    })
    return NextResponse.json(cycles)
  } catch (error) {
    console.error('Error fetching rewrite cycles:', error)
    return NextResponse.json({ error: 'Failed to fetch rewrite cycles' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()

    const latest = await prisma.rewriteCycle.findFirst({
      where: { projectId: id },
      orderBy: { cycleNumber: 'desc' },
      select: { cycleNumber: true },
    })

    const cycle = await prisma.rewriteCycle.create({
      data: {
        projectId: id,
        cycleNumber: body.cycleNumber || (latest?.cycleNumber || 0) + 1,
        notesSentAt: body.notesSentAt ? new Date(body.notesSentAt) : null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        rewriteReceivedAt: body.rewriteReceivedAt ? new Date(body.rewriteReceivedAt) : null,
        rereadAt: body.rereadAt ? new Date(body.rereadAt) : null,
        outcomeNote: body.outcomeNote || null,
      },
    })

    return NextResponse.json(cycle, { status: 201 })
  } catch (error) {
    console.error('Error creating rewrite cycle:', error)
    return NextResponse.json({ error: 'Failed to create rewrite cycle' }, { status: 500 })
  }
}
