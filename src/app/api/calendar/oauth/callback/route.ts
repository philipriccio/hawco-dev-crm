import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exchangeCodeForTokens, parseOAuthState } from '@/lib/calendar-sync'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthState = parseOAuthState(state)

  if (!code || !oauthState?.userId) {
    return NextResponse.redirect(new URL('/meetings?calendar=oauth_error', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/meetings?calendar=missing_refresh_token', request.url))
    }

    await prisma.googleCalendarConnection.upsert({
      where: { userId: oauthState.userId },
      update: {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        lastSyncStatus: 'connected',
        lastSyncError: null,
      },
      create: {
        userId: oauthState.userId,
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        lastSyncStatus: 'connected',
      },
    })

    return NextResponse.redirect(new URL('/meetings?calendar=connected', request.url))
  } catch (error) {
    console.error('OAuth callback error', error)
    return NextResponse.redirect(new URL('/meetings?calendar=oauth_error', request.url))
  }
}
