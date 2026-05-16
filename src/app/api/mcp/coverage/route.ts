import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, parseLimit } from '@/lib/mcp-response'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor

  const params = request.nextUrl.searchParams
  const query = params.get('query') || params.get('search') || ''
  const verdict = params.get('verdict')?.toUpperCase()
  const projectId = params.get('projectId')
  const limit = parseLimit(params.get('limit'))

  const where: Record<string, unknown> = {}
  if (verdict) where.verdict = verdict
  if (projectId) where.projectId = projectId
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { writer: { contains: query, mode: 'insensitive' } },
      { logline: { contains: query, mode: 'insensitive' } },
      { summary: { contains: query, mode: 'insensitive' } },
    ]
  }

  const coverages = await prisma.coverage.findMany({
    where,
    take: limit,
    orderBy: { dateRead: 'desc' },
    include: { project: { select: { id: true, title: true, status: true } }, script: { select: { id: true, title: true, type: true } } },
  })

  return mcpOk(coverages, { count: coverages.length })
}
