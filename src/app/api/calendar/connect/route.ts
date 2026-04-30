import { NextResponse } from 'next/server'
import { getGoogleOAuthConsentUrl } from '@/lib/calendar-sync'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET() {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const url = getGoogleOAuthConsentUrl(session.id)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Google Calendar connection'

    if (message.includes('Missing Google OAuth env vars')) {
      return NextResponse.json(
        {
          error: 'Google Calendar is not configured yet.',
          code: 'missing_oauth_config',
          guidance: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in environment variables, then redeploy.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: 'Could not start Google Calendar connection', code: 'oauth_init_failed' },
      { status: 500 },
    )
  }
}
