import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'
import { uploadMcpFile } from '@/lib/mcp-upload'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'crm:write')
  if (isMcpAuthResponse(actor)) return actor
  try {
    const result = await uploadMcpFile(actor, await request.json())
    return mcpOk(result, { actor: actor.id, action: 'uploaded' })
  } catch (error) {
    return mcpError('mcp_upload_failed', error instanceof Error ? error.message : 'Upload failed')
  }
}
