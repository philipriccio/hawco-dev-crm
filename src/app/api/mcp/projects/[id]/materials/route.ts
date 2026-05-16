import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpOk } from '@/lib/mcp-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireMcpAuth(request)
  if (isMcpAuthResponse(actor)) return actor
  const { id } = await params

  const materials = await prisma.material.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      title: true,
      filename: true,
      fileSize: true,
      mimeType: true,
      notes: true,
      readAt: true,
      createdAt: true,
      submittedBy: { select: { id: true, name: true, type: true } },
      writer: { select: { id: true, name: true, type: true } },
    },
  })

  return mcpOk(materials, { count: materials.length })
}
