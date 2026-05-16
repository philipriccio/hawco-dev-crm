import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'
import { findOrCreateCompany } from '@/lib/mcp-intake'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'intake:write')
  if (isMcpAuthResponse(actor)) return actor
  try {
    const result = await findOrCreateCompany(actor, await request.json())
    return mcpOk(result, { actor: actor.id, action: result.created ? 'created' : 'found' })
  } catch (error) {
    return mcpError('intake_company_failed', error instanceof Error ? error.message : 'Failed to find or create company')
  }
}
