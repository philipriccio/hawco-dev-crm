import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor

  const params = request.nextUrl.searchParams
  const contactId = params.get('contactId')
  const completed = params.get('completed')
  const where: Record<string, unknown> = {}
  if (contactId) where.contactId = contactId
  if (completed !== null) where.completed = completed === 'true'

  const followUps = await prisma.followUp.findMany({
    where,
    include: { contact: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return mcpOk(followUps, { count: followUps.length })
}

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'followups:write')
  if (isMcpAuthResponse(actor)) return actor

  const body = await request.json()
  const contactId = typeof body.contactId === 'string' ? body.contactId.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (!contactId || !note) return mcpError('validation_error', 'contactId and note are required')

  const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true, name: true, type: true } })
  if (!contact) return mcpError('not_found', 'Contact not found', 404)

  const followUp = await prisma.followUp.create({
    data: { contactId, note },
    include: { contact: { select: { id: true, name: true, type: true } } },
  })

  return mcpOk(followUp, { actor: actor.id, action: 'created' })
}

export async function PATCH(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'followups:write')
  if (isMcpAuthResponse(actor)) return actor

  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id) return mcpError('validation_error', 'id is required')

  const data: Record<string, unknown> = {}
  if (typeof body.completed === 'boolean') data.completed = body.completed
  if (typeof body.note === 'string') data.note = body.note.trim()
  if (Object.keys(data).length === 0) return mcpError('validation_error', 'completed or note is required')

  const followUp = await prisma.followUp.update({
    where: { id },
    data,
    include: { contact: { select: { id: true, name: true, type: true } } },
  })

  return mcpOk(followUp, { actor: actor.id, action: 'updated' })
}
