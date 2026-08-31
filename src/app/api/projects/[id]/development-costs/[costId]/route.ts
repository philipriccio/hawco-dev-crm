import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; costId: string }> },
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id, costId } = await params

    const cost = await prisma.developmentCost.findFirst({
      where: { id: costId, projectId: id },
    })

    if (!cost) {
      return NextResponse.json({ error: 'Development cost not found' }, { status: 404 })
    }

    await prisma.developmentCost.delete({ where: { id: costId } })
    await logActivity({
      action: 'deleted',
      entityType: 'development_cost',
      entityId: cost.id,
      entityName: cost.description,
      changes: { projectId: id, amountCents: cost.amountCents, currency: cost.currency },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting development cost:', error)
    return NextResponse.json({ error: 'Failed to delete development cost' }, { status: 500 })
  }
}
