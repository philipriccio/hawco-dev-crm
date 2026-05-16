import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, parseLimit } from '@/lib/mcp-response'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  const params = request.nextUrl.searchParams
  const days = Math.max(0, Number.parseInt(params.get('days') || '7', 10) || 7)
  const limit = parseLimit(params.get('limit'), 50, 100)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ['SUBMITTED', 'READING'] },
      firstReadAt: null,
      dateReceived: { lt: cutoff },
    },
    take: limit,
    orderBy: { dateReceived: 'asc' },
    include: {
      contacts: { include: { contact: { select: { id: true, name: true, type: true } } } },
      materials: { select: { id: true, title: true, type: true, readAt: true } },
    },
  })
  return mcpOk(projects, { count: projects.length, days })
}
