import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export interface McpActor {
  id: string
  name: string
  scopes: string[]
}

const DEFAULT_SCOPES = ['crm:read', 'crm:write', 'crm:delete', 'followups:write', 'meetings:write', 'signals:write', 'intake:write']

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function configuredScopes(): string[] {
  return (process.env.HAWCO_MCP_SCOPES || '')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean)
}

function tokenMatches(token: string): boolean {
  const rawToken = process.env.HAWCO_MCP_TOKEN
  const tokenHash = process.env.HAWCO_MCP_TOKEN_SHA256

  if (tokenHash) {
    return timingSafeEqualString(sha256(token), tokenHash)
  }

  if (rawToken) {
    return timingSafeEqualString(token, rawToken)
  }

  return false
}

export function unauthorizedMcpResponse(message = 'Unauthorized') {
  return NextResponse.json(
    { ok: false, error: { code: 'unauthorized', message } },
    { status: 401 }
  )
}

export function forbiddenMcpResponse(message = 'Forbidden') {
  return NextResponse.json(
    { ok: false, error: { code: 'forbidden', message } },
    { status: 403 }
  )
}

export async function requireMcpAuth(
  request: NextRequest,
  requiredScope = 'crm:read'
): Promise<McpActor | NextResponse> {
  const token = getBearerToken(request)
  if (!token || !tokenMatches(token)) {
    return unauthorizedMcpResponse()
  }

  const scopes = configuredScopes()
  const actor: McpActor = {
    id: process.env.HAWCO_MCP_ACTOR_ID || 'cowork-mcp',
    name: process.env.HAWCO_MCP_ACTOR_NAME || 'Cowork MCP',
    scopes: scopes.length ? scopes : DEFAULT_SCOPES,
  }

  if (requiredScope && !actor.scopes.includes(requiredScope)) {
    const broadWriteAllowed = requiredScope.endsWith(':write') && actor.scopes.includes('crm:write')
    const broadDeleteAllowed = requiredScope.endsWith(':delete') && actor.scopes.includes('crm:delete')
    if (!broadWriteAllowed && !broadDeleteAllowed) {
      return forbiddenMcpResponse(`Missing required scope: ${requiredScope}`)
    }
  }

  return actor
}

export function isMcpAuthResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}
