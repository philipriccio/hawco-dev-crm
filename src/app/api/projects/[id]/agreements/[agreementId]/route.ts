import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; agreementId: string }> },
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id, agreementId } = await params

    const agreement = await prisma.projectAgreement.findFirst({
      where: { id: agreementId, projectId: id },
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    await prisma.projectAgreement.delete({ where: { id: agreementId } })
    await logActivity({
      action: 'deleted',
      entityType: 'project_agreement',
      entityId: agreement.id,
      entityName: agreement.title,
      changes: { projectId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agreement:', error)
    return NextResponse.json({ error: 'Failed to delete agreement' }, { status: 500 })
  }
}
