import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const title = String(body.title || '').trim()
    const date = body.date ? new Date(body.date) : null
    const contactIds = Array.isArray(body.contactIds) ? body.contactIds.filter(Boolean) : []
    const projectIds = Array.isArray(body.projectIds) ? body.projectIds.filter(Boolean) : []

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (!date || Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Valid date required' }, { status: 400 })

    const meeting = await prisma.meeting.create({
      data: {
        title,
        date,
        location: body.location ? String(body.location) : null,
        notes: body.notes ? String(body.notes) : null,
        followUp: body.followUp ? String(body.followUp) : null,
        createdById: user.id,
        attendees: {
          create: contactIds.map((contactId: string) => ({ contactId })),
        },
        projects: {
          create: projectIds.map((projectId: string) => ({ projectId })),
        },
      },
    })

    return NextResponse.json({ id: meeting.id })
  } catch (error) {
    console.error('Failed to create meeting', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
