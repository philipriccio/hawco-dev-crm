import { NextRequest, NextResponse } from 'next/server'
import { getUpcomingEvents, getPastEvents, getEventsInRange } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'upcoming'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    let events

    if (startDate && endDate) {
      events = await getEventsInRange(new Date(startDate), new Date(endDate))
    } else if (view === 'past') {
      const daysBack = parseInt(searchParams.get('days') || '30')
      events = await getPastEvents(daysBack)
    } else {
      const maxResults = parseInt(searchParams.get('limit') || '50')
      events = await getUpcomingEvents(maxResults)
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    
    // Check if it's a credentials error
    if (error instanceof Error && error.message.includes('GOOGLE_CALENDAR_CREDENTIALS')) {
      return NextResponse.json(
        { error: 'Calendar not configured', events: [] },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar events', events: [] },
      { status: 500 }
    )
  }
}
