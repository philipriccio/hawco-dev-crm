import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'signals:write')
  if (isMcpAuthResponse(actor)) return actor

  const body = await request.json()
  const writerId = typeof body.writerId === 'string' ? body.writerId.trim() : ''
  const signalType = typeof body.signalType === 'string' ? body.signalType.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : null
  if (!writerId || !signalType) return mcpError('validation_error', 'writerId and signalType are required')

  const writer = await prisma.contact.findUnique({ where: { id: writerId }, select: { id: true, type: true, name: true } })
  if (!writer) return mcpError('not_found', 'Writer contact not found', 404)

  const signal = await prisma.writerSignal.create({
    data: { writerId, signalType, note },
    include: { writer: { select: { id: true, name: true, type: true } } },
  })

  return mcpOk(signal, { actor: actor.id, action: 'created' })
}
