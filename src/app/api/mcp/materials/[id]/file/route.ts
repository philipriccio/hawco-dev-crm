import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, mcpError } from '@/lib/mcp-response'
import { materialFile } from '@/lib/mcp-material-file'
import { CollaborationError } from '@/lib/mcp-collaboration'
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  try { const response = mcpOk(await materialFile((await context.params).id)); response.headers.set('Cache-Control', 'private, no-store'); return response }
  catch (error) { return error instanceof CollaborationError ? mcpError('document_unavailable', error.message, error.status) : mcpError('document_unavailable', 'Document retrieval failed; no document content was returned', 503) }
}
