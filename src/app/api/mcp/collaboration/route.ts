import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, mcpError } from '@/lib/mcp-response'
import { CollaborationError, entityName, readCollaboration, editCollaboration } from '@/lib/mcp-collaboration'
function failure(error: unknown) {
  return error instanceof CollaborationError ? mcpError('collaboration_rejected', error.message, error.status) : mcpError('collaboration_failed', 'Operation failed; retry with the same requestId or reread the record. No success is assumed.', 503)
}
export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  try {
    const params = request.nextUrl.searchParams
    return mcpOk(await readCollaboration(entityName(params.get('entity')), params.get('id') || undefined, params.get('after') || undefined))
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'crm:write')
  if (isMcpAuthResponse(actor)) return actor
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new CollaborationError(400, 'JSON body required')
    const chunks: Uint8Array[] = []; let size = 0
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 128 * 1024) throw new CollaborationError(413, 'Request exceeds 128 KiB'); chunks.push(value) } }
    finally { await reader.cancel() }
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new CollaborationError(400, 'Invalid JSON') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CollaborationError(400, 'Object required')
    return mcpOk(await editCollaboration(actor, body))
  } catch (error) { return failure(error) }
}
