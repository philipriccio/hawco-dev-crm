import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { explicitReadAt } from '@/lib/material-reading'
import { IntakeError } from '@/lib/material-intake'
import { MaterialType, Prisma } from '@prisma/client'
import { logActivity, calculateChanges } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    
    // Get material title before deleting
    const material = await prisma.material.findUnique({
      where: { id },
      select: { title: true },
    })

    await prisma.material.delete({
      where: { id },
    })

    // Log activity
    if (material) {
      await logActivity({
        action: 'deleted',
        entityType: 'material',
        entityId: id,
        entityName: material.title,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()

    // Get existing material for change tracking
    const existingMaterial = await prisma.material.findUnique({
      where: { id },
    })

    if (!existingMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const { title, notes, type, markAsRead, projectId } = body
    if ((type !== undefined && !Object.values(MaterialType).includes(type)) ||
        (markAsRead !== undefined && typeof markAsRead !== 'boolean') ||
        (title !== undefined && (typeof title !== 'string' || !title.trim())) ||
        (notes != null && typeof notes !== 'string') ||
        (projectId != null && typeof projectId !== 'string')) {
      return NextResponse.json({ error: 'Invalid material details or reading state' }, { status: 400 })
    }
    const scriptTypes: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'PITCH_DECK', 'ONE_PAGER', 'TREATMENT', 'SERIES_BIBLE']

    const updateData: Record<string, unknown> = {}
    
    if (title) updateData.title = title
    if (notes !== undefined) updateData.notes = notes
    if (type) updateData.type = type
    if (projectId !== undefined) updateData.projectId = projectId || null
    const readTransitionAt = markAsRead === true && !existingMaterial.readAt ? new Date() : null
    const readAt = explicitReadAt(markAsRead, existingMaterial.readAt)
    if (readAt !== undefined) updateData.readAt = readAt

    const material = await prisma.$transaction(async (tx) => {
      const current = await tx.material.findUnique({ where: { id } })
      if (!current) throw new IntakeError('Material no longer exists', 404)
      if (projectId !== undefined && (projectId || null) !== current.projectId) {
        const successor = await tx.material.findFirst({ where: { supersedesId: id }, select: { id: true } })
        if (current.familyId || current.supersedesId || current.approvedAt || successor) {
          throw new IntakeError('Versioned or approved material cannot move projects. Keep its version history together.', 409)
        }
        if (projectId && !await tx.project.findUnique({ where: { id: projectId }, select: { id: true } })) {
          throw new IntakeError('Project no longer exists', 404)
        }
      }
      const freshReadAt = explicitReadAt(markAsRead, current.readAt)
      if (freshReadAt !== undefined) updateData.readAt = freshReadAt
      const updatedMaterial = await tx.material.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
          submittedBy: true,
          writer: true,
        },
      })

      if (markAsRead === true && readTransitionAt && updatedMaterial.projectId && scriptTypes.includes(updatedMaterial.type)) {
        await tx.project.updateMany({
          where: { id: updatedMaterial.projectId, firstReadAt: null },
          data: { firstReadAt: readTransitionAt },
        })
      }

      return updatedMaterial
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    // Log activity with changes
    const changes = calculateChanges(
      existingMaterial as unknown as Record<string, unknown>,
      updateData
    )
    await logActivity({
      action: 'updated',
      entityType: 'material',
      entityId: material.id,
      entityName: material.title,
      changes,
    })

    return NextResponse.json(material)
  } catch (error) {
    if (error instanceof IntakeError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return NextResponse.json({ error: 'This material changed while saving. Refresh and retry.' }, { status: 409 })
    console.error('Error updating material:', error)
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    )
  }
}
