import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk, parseLimit } from '@/lib/mcp-response'
import { READABLE_MATERIAL_TYPES } from '@/lib/dashboard-helpers'

export async function GET(request: NextRequest) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  const limit = parseLimit(request.nextUrl.searchParams.get('limit'), 50, 100)
  const materials = await prisma.material.findMany({
    where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: null },
    take: limit,
    orderBy: { createdAt: 'asc' },
    include: {
      project: { select: { id: true, title: true, status: true, dateReceived: true } },
      writer: { select: { id: true, name: true, type: true } },
      submittedBy: { select: { id: true, name: true, type: true } },
    },
  })
  return mcpOk(materials, { count: materials.length })
}
