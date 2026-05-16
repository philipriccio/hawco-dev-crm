import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'
import { intakeSubmission } from '@/lib/mcp-intake'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'intake:write')
  if (isMcpAuthResponse(actor)) return actor
  try {
    const result = await intakeSubmission(actor, await request.json())
    return mcpOk(result, { actor: actor.id, action: 'created' })
  } catch (error) {
    return mcpError('intake_submission_failed', error instanceof Error ? error.message : 'Failed to intake submission')
  }
}
