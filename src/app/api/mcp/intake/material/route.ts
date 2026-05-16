import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'
import { uploadIntakeMaterial } from '@/lib/mcp-intake'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'intake:write')
  if (isMcpAuthResponse(actor)) return actor
  try {
    const material = await uploadIntakeMaterial(actor, await request.json())
    return mcpOk(material, { actor: actor.id, action: 'created' })
  } catch (error) {
    return mcpError('intake_material_failed', error instanceof Error ? error.message : 'Failed to create material')
  }
}
