import { NextResponse } from 'next/server'
import { DealError } from './domain'
export function failure(e: unknown) {
  if (e instanceof DealError)
    return NextResponse.json({ error: e.message }, { status: e.status })
  if (
    e &&
    typeof e === 'object' &&
    'code' in e &&
    ['P2034', 'P2002', 'P2025'].includes(String(e.code))
  )
    return NextResponse.json(
      {
        error: 'Concurrent change or duplicate request. Reload and reconcile.',
      },
      { status: 409 },
    )
  return NextResponse.json(
    {
      error:
        'Unable to complete agreement action. No success has been recorded.',
    },
    { status: 400 },
  )
}
export function response(value: unknown) {
  return NextResponse.json(value, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
