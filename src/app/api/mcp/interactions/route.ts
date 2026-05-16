import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'

export async function POST(request: NextRequest) {
  const actor = await requireMcpAuth(request, 'meetings:write')
  if (isMcpAuthResponse(actor)) return actor

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null
  const followUp = typeof body.followUp === 'string' ? body.followUp.trim() : null
  const contactIds = Array.isArray(body.contactIds) ? body.contactIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0) : []
  const projectIds = Array.isArray(body.projectIds) ? body.projectIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0) : []
  const date = body.date ? new Date(body.date) : new Date()

  if (!title) return mcpError('validation_error', 'title is required')
  if (Number.isNaN(date.getTime())) return mcpError('validation_error', 'date must be a valid date')

  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (!user) return mcpError('server_error', 'No CRM user exists to own interaction records', 500)

  const meeting = await prisma.meeting.create({
    data: {
      title,
      date,
      location: body.location ? String(body.location) : 'Cowork MCP',
      notes,
      followUp,
      createdById: user.id,
      attendees: { create: contactIds.map((contactId: string) => ({ contactId })) },
      projects: { create: projectIds.map((projectId: string) => ({ projectId })) },
    },
    include: {
      attendees: { include: { contact: { select: { id: true, name: true, type: true } } } },
      projects: { include: { project: { select: { id: true, title: true, status: true } } } },
    },
  })

  return mcpOk(meeting, { actor: actor.id, action: 'created' })
}
