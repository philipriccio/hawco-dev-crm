import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { getDashboardDevelopment, saveDashboardOrder, OrderError } from '@/lib/dashboard-development-order'

export async function GET() {
  const auth = await requireApiAuth()
  if (isAuthResponse(auth)) return auth
  try { return NextResponse.json(await getDashboardDevelopment(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Unable to load dashboard order' }, { status: 503 }) }
}
export async function PUT(request: Request) {
  const auth = await requireApiAuth()
  if (isAuthResponse(auth)) return auth
  // Require a browser same-origin request, including behind the trusted reverse proxy.
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  let validOrigin = false
  try { validOrigin = !!origin && new URL(origin).host === host && ['http:', 'https:'].includes(new URL(origin).protocol) } catch {}
  if (!validOrigin || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'JSON required' }, { status: 415 })
  try {
    const body = await request.text()
    if (body.length > 250000) return NextResponse.json({ error: 'Order too large' }, { status: 413 })
    let value: unknown
    try { value = JSON.parse(body) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    return NextResponse.json(await saveDashboardOrder(value), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Unable to save order. Reload before trying again.' }, { status: 503 })
  }
}
