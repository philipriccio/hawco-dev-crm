import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { globalSearch, validateSearchQuery } from '@/lib/global-search'

export async function GET(request: NextRequest) {
  const session = await requireApiAuth()
  if (isAuthResponse(session)) return session
  let query: string
  try {
    query = validateSearchQuery(request.nextUrl.searchParams.get('q') || '')
  } catch {
    return NextResponse.json({ error: 'Enter between 2 and 120 characters to search.' }, { status: 400 })
  }
  try {
    return NextResponse.json(await globalSearch(query), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Search is unavailable. Please try again.' }, { status: 500 })
  }
}
