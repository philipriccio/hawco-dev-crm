import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, parseLimit } from '@/lib/mcp-response'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor

  const params = request.nextUrl.searchParams
  const query = params.get('query') || params.get('search') || ''
  const status = params.get('status')?.toUpperCase()
  const limit = parseLimit(params.get('limit'))

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { logline: { contains: query, mode: 'insensitive' } },
      { synopsis: { contains: query, mode: 'insensitive' } },
      { genre: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { contacts: { some: { contact: { name: { contains: query, mode: 'insensitive' } } } } },
    ]
  }

  const projects = await prisma.project.findMany({
    where,
    take: limit,
    orderBy: [{ readPriority: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      origin: true,
      verdict: true,
      logline: true,
      format: true,
      genre: true,
      readPriority: true,
      currentStage: true,
      nextAction: true,
      targetNetwork: true,
      sourceContactId: true,
      submissionThreadId: true,
      dateReceived: true,
      sourceContact: { select: { id: true, name: true, type: true, email: true } },
      updatedAt: true,
      contacts: {
        take: 5,
        include: { contact: { select: { id: true, name: true, type: true } } },
      },
    },
  })

  return mcpOk(projects, { count: projects.length })
}
