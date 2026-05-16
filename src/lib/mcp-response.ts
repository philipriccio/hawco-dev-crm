import { NextResponse } from 'next/server'

export function mcpOk<T>(data: T, meta: Record<string, unknown> = {}) {
  return NextResponse.json({
    ok: true,
    data,
    meta: {
      source: 'hawco-crm',
      toolVersion: 'v1',
      ...meta,
    },
  })
}

export function mcpError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status })
}

export function parseLimit(value: string | null, fallback = 20, max = 50): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}
