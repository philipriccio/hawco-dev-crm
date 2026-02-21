import { google } from 'googleapis'

const CALENDAR_ID = 'philip@hawcoproductions.com'

function getAuthClient() {
  const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS
  if (!credentials) {
    throw new Error('GOOGLE_CALENDAR_CREDENTIALS environment variable not set')
  }

  const parsed = JSON.parse(credentials)
  
  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start: Date
  end: Date
  location: string | null
  attendees: string[]
  htmlLink: string | null
}

export async function getUpcomingEvents(maxResults = 50): Promise<CalendarEvent[]> {
  const auth = getAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map((event) => ({
    id: event.id || '',
    title: event.summary || 'Untitled',
    description: event.description || null,
    start: new Date(event.start?.dateTime || event.start?.date || now),
    end: new Date(event.end?.dateTime || event.end?.date || now),
    location: event.location || null,
    attendees: event.attendees?.map((a) => a.email || '').filter(Boolean) || [],
    htmlLink: event.htmlLink || null,
  }))
}

export async function getEventsInRange(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const auth = getAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map((event) => ({
    id: event.id || '',
    title: event.summary || 'Untitled',
    description: event.description || null,
    start: new Date(event.start?.dateTime || event.start?.date || startDate),
    end: new Date(event.end?.dateTime || event.end?.date || startDate),
    location: event.location || null,
    attendees: event.attendees?.map((a) => a.email || '').filter(Boolean) || [],
    htmlLink: event.htmlLink || null,
  }))
}

export async function getPastEvents(
  daysBack = 30,
  maxResults = 100
): Promise<CalendarEvent[]> {
  const auth = getAuthClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: past.toISOString(),
    timeMax: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map((event) => ({
    id: event.id || '',
    title: event.summary || 'Untitled',
    description: event.description || null,
    start: new Date(event.start?.dateTime || event.start?.date || past),
    end: new Date(event.end?.dateTime || event.end?.date || past),
    location: event.location || null,
    attendees: event.attendees?.map((a) => a.email || '').filter(Boolean) || [],
    htmlLink: event.htmlLink || null,
  }))
}
