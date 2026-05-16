import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk } from '@/lib/mcp-response'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor

  return mcpOk({ status: 'ok', actor: actor.name, scopes: actor.scopes })
}
