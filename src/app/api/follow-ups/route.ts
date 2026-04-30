import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')
    const completed = searchParams.get('completed')

    const where: Record<string, unknown> = {}
    if (contactId) where.contactId = contactId
    if (completed !== null && completed !== undefined) {
      where.completed = completed === 'true'
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(followUps)
  } catch (error) {
    console.error('Error fetching follow-ups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const body = await request.json()
    const { contactId, note } = body

    if (!contactId || !note) {
      return NextResponse.json(
        { error: 'contactId and note are required' },
        { status: 400 }
      )
    }

    const followUp = await prisma.followUp.create({
      data: { contactId, note },
      include: {
        contact: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    return NextResponse.json(followUp, { status: 201 })
  } catch (error) {
    console.error('Error creating follow-up:', error)
    return NextResponse.json(
      { error: 'Failed to create follow-up' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const body = await request.json()
    const { id, completed, note } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (completed !== undefined) data.completed = completed
    if (note !== undefined) data.note = note

    const followUp = await prisma.followUp.update({
      where: { id },
      data,
      include: {
        contact: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    return NextResponse.json(followUp)
  } catch (error) {
    console.error('Error updating follow-up:', error)
    return NextResponse.json(
      { error: 'Failed to update follow-up' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    await prisma.followUp.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting follow-up:', error)
    return NextResponse.json(
      { error: 'Failed to delete follow-up' },
      { status: 500 }
    )
  }
}
