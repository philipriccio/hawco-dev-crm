import { NextRequest, NextResponse } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { prisma } from '@/lib/db'
import { allowAttempt, readBoundedJson, validPassphrase, verifyPassphrase } from '@/lib/claude-connection'
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, '')
  if (isMcpAuthResponse(actor)) return actor
  try {
    if (!await allowAttempt('oauth-verify', 30, 60)) return reply({ error: 'Try again later' }, 429)
    let body
    try { body = await readBoundedJson(request) } catch { return reply({ error: 'Invalid request' }, 400) }
    if (!validPassphrase(body.passphrase)) return reply({ valid: false })
    const rows = await prisma.$queryRaw<Array<{ passwordHash: string }>>`SELECT "passwordHash" FROM "ClaudeConnectionCredential" WHERE "id" = 'claude'`
    if (!rows[0]) return reply({ error: 'Connection passphrase is not configured' }, 503)
    return reply({ valid: await verifyPassphrase(body.passphrase, rows[0].passwordHash) })
  } catch { return reply({ error: 'Connection verification unavailable' }, 503) }
}
