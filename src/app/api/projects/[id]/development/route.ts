import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { DevelopmentEditError, saveProjectDevelopment } from '@/lib/project-development'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if (isAuthResponse(auth)) return auth
  try {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== request.headers.get('host') || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  } catch { return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 }) }
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'JSON required' }, { status: 415 })
  try {
    const raw = await request.text()
    if (raw.length > 200000) return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    let body: unknown
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    return NextResponse.json(await saveProjectDevelopment((await params).id, body, auth.id), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof DevelopmentEditError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Could not confirm the save. Reload the latest fields before trying again.' }, { status: 503 })
  }
}
