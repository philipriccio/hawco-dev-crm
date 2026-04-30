import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncGoogleCalendarForUser } from '@/lib/calendar-sync'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function POST() {
  const session = await requireApiAuth()
  if (isAuthResponse(session)) return session

  try {
    const count = await syncGoogleCalendarForUser(session.id)
    return NextResponse.json({ ok: true, count })
  } catch (error) {
    console.error('Calendar sync error:', error)

    await prisma.googleCalendarConnection.updateMany({
      where: { userId: session.id },
      data: {
        lastSyncStatus: 'error',
        lastSyncError: error instanceof Error ? error.message : 'Unknown sync error',
      },
    })

    if (error instanceof Error && error.message === 'NO_CONNECTION') {
      return NextResponse.json({ ok: false, error: 'Calendar not connected' }, { status: 503 })
    }

    return NextResponse.json({ ok: false, error: 'Calendar sync failed' }, { status: 500 })
  }
}
