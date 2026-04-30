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
    const signals = await prisma.writerSignal.findMany({
      where: { writerId: id },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    })
    return NextResponse.json(signals)
  } catch (error) {
    console.error('Error fetching writer signals:', error)
    return NextResponse.json({ error: 'Failed to fetch writer signals' }, { status: 500 })
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

    if (!body.signalType) {
      return NextResponse.json({ error: 'signalType is required' }, { status: 400 })
    }

    const signal = await prisma.writerSignal.create({
      data: {
        writerId: id,
        signalType: String(body.signalType),
        note: body.note || null,
        createdById: body.createdById || null,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json(signal, { status: 201 })
  } catch (error) {
    console.error('Error creating writer signal:', error)
    return NextResponse.json({ error: 'Failed to create writer signal' }, { status: 500 })
  }
}
