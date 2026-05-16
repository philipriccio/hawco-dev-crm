import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      agent: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
      representedWriters: { select: { id: true, name: true, type: true } },
      managedWriters: { select: { id: true, name: true, type: true } },
      projectContacts: { include: { project: { select: { id: true, title: true, status: true, nextAction: true } } } },
      buyerProjects: { include: { project: { select: { id: true, title: true, status: true } } } },
      followUps: { orderBy: { createdAt: 'desc' }, take: 10 },
      writerSignals: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!contact) return mcpError('not_found', 'Contact not found', 404)
  return mcpOk(contact)
}
