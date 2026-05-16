import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk } from '@/lib/mcp-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  const { id } = await params

  const coverages = await prisma.coverage.findMany({
    where: { projectId: id },
    orderBy: { dateRead: 'desc' },
  })

  return mcpOk(coverages, { count: coverages.length })
}
