import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export type AuthenticatedUser = Awaited<ReturnType<typeof requireAuth>>

export async function requireApiAuth(): Promise<AuthenticatedUser | NextResponse> {
  try {
    return await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function requireApiAdmin(): Promise<AuthenticatedUser | NextResponse> {
  const session = await requireApiAuth()
  if (session instanceof NextResponse) return session

  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return session
}

export function isAuthResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
