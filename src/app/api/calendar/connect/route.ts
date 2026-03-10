import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getGoogleOAuthConsentUrl } from '@/lib/calendar-sync'

export async function GET() {
  const session = await requireAuth()
  const url = getGoogleOAuthConsentUrl(session.id)
  return NextResponse.json({ url })
}
