import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      contacts: { include: { contact: { include: { company: true } } } },
      companies: { include: { company: true } },
      buyers: { include: { contact: { select: { id: true, name: true, type: true, email: true, company: true } } } },
      materials: { orderBy: { createdAt: 'desc' } },
      coverages: { orderBy: { dateRead: 'desc' } },
      rewriteCycles: { orderBy: { cycleNumber: 'desc' } },
      tags: { include: { tag: true } },
    },
  })

  if (!project) return mcpError('not_found', 'Project not found', 404)
  return mcpOk(project)
}
