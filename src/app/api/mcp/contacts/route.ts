import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, parseLimit } from '@/lib/mcp-response'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor

  const params = request.nextUrl.searchParams
  const query = params.get('query') || params.get('search') || ''
  const type = params.get('type')?.toUpperCase()
  const limit = parseLimit(params.get('limit'))

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { writerVoice: { contains: query, mode: 'insensitive' } },
      { writerGenres: { contains: query, mode: 'insensitive' } },
      { company: { name: { contains: query, mode: 'insensitive' } } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    take: limit,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      type: true,
      name: true,
      email: true,
      phone: true,
      writerLevel: true,
      writerGenres: true,
      writerVoice: true,
      isCanadian: true,
      highPriority: true,
      execTitle: true,
      execRole: true,
      lookingFor: true,
      company: { select: { id: true, name: true, type: true } },
      updatedAt: true,
    },
  })

  return mcpOk(contacts, { count: contacts.length })
}
