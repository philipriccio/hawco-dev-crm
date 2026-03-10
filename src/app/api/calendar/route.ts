import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'upcoming'

    const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId: session.id } })

    if (!connection) {
      return NextResponse.json(
        { error: 'Calendar not connected', requiresAuth: true, events: [] },
        { status: 503 },
      )
    }

    const now = new Date()
    const where =
      view === 'past'
        ? { startAt: { lt: now } }
        : { endAt: { gte: now } }

    const events = await prisma.googleCalendarEvent.findMany({
      where: {
        connectionId: connection.id,
        ...where,
      },
      orderBy: { startAt: view === 'past' ? 'desc' : 'asc' },
      take: 200,
    })

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.googleEventId,
        title: event.title,
        description: event.description,
        start: event.startAt,
        end: event.endAt,
        location: event.location,
        attendees: Array.isArray(event.attendeesJson) ? event.attendeesJson : [],
        htmlLink: event.htmlLink,
      })),
      connection: {
        calendarId: connection.calendarId,
        googleEmail: connection.googleEmail,
        lastSyncAt: connection.lastSyncAt,
        lastSyncStatus: connection.lastSyncStatus,
        lastSyncError: connection.lastSyncError,
      },
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar events', events: [] }, { status: 500 })
  }
}
