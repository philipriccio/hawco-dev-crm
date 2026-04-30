import { google } from 'googleapis'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { mapGoogleEventToSyncedEvent } from './calendar-mapper.js'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

export type SyncedCalendarEvent = {
  googleEventId: string
  title: string
  description: string | null
  location: string | null
  htmlLink: string | null
  status: string | null
  startAt: Date
  endAt: Date
  attendees: string[]
  rawJson: unknown
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getGoogleOAuthConsentUrl(userId: string) {
  const auth = getOAuthClient()
  const statePayload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url')

  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: CALENDAR_SCOPES,
    prompt: 'consent',
    state: statePayload,
  })
}

export function parseOAuthState(state: string | null) {
  if (!state) return null
  try {
    const raw = Buffer.from(state, 'base64url').toString('utf8')
    return JSON.parse(raw) as { userId: string; ts: number }
  } catch {
    return null
  }
}

export async function exchangeCodeForTokens(code: string) {
  const auth = getOAuthClient()
  const { tokens } = await auth.getToken(code)
  return tokens
}

async function getAuthorizedClientForUser(userId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } })
  if (!connection) {
    throw new Error('NO_CONNECTION')
  }

  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: connection.accessToken || undefined,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry?.getTime(),
  })

  return { auth, connection }
}

export async function syncGoogleCalendarForUser(userId: string, opts?: { daysPast?: number; daysFuture?: number }) {
  const { auth, connection } = await getAuthorizedClientForUser(userId)
  const calendar = google.calendar({ version: 'v3', auth })

  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (opts?.daysPast ?? 30))
  const end = new Date(now)
  end.setDate(now.getDate() + (opts?.daysFuture ?? 180))

  const res = await calendar.events.list({
    calendarId: connection.calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 500,
  })

  const mapped = (res.data.items || []).map((e) => mapGoogleEventToSyncedEvent(e)).filter(Boolean) as SyncedCalendarEvent[]

  await prisma.$transaction([
    ...mapped.map((event) =>
      prisma.googleCalendarEvent.upsert({
        where: { connectionId_googleEventId: { connectionId: connection.id, googleEventId: event.googleEventId } },
        update: {
          title: event.title,
          description: event.description,
          location: event.location,
          htmlLink: event.htmlLink,
          status: event.status,
          startAt: event.startAt,
          endAt: event.endAt,
          attendeesJson: event.attendees,
          rawJson: event.rawJson as Prisma.InputJsonValue,
          syncedAt: new Date(),
        },
        create: {
          connectionId: connection.id,
          googleEventId: event.googleEventId,
          title: event.title,
          description: event.description,
          location: event.location,
          htmlLink: event.htmlLink,
          status: event.status,
          startAt: event.startAt,
          endAt: event.endAt,
          attendeesJson: event.attendees,
          rawJson: event.rawJson as Prisma.InputJsonValue,
        },
      }),
    ),
    prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'ok',
        lastSyncError: null,
      },
    }),
  ])

  return mapped.length
}
