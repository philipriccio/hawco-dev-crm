import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'
import { linkWriterAgent } from '@/lib/mcp-intake'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'intake:write')
  if (isMcpAuthResponse(actor)) return actor
  try {
    const writer = await linkWriterAgent(actor, await request.json())
    return mcpOk(writer, { actor: actor.id, action: 'linked' })
  } catch (error) {
    return mcpError('intake_link_writer_agent_failed', error instanceof Error ? error.message : 'Failed to link writer agent')
  }
}
