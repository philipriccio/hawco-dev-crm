import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MaterialType } from '@prisma/client'
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
    const scriptTypes: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']

    const updateData: Record<string, unknown> = {}
    
    if (title) updateData.title = title
    if (notes !== undefined) updateData.notes = notes
    if (type) updateData.type = type
    if (projectId !== undefined) updateData.projectId = projectId || null
    if (markAsRead === true) updateData.readAt = new Date()
    if (markAsRead === false) updateData.readAt = null

    const material = await prisma.$transaction(async (tx) => {
      const updatedMaterial = await tx.material.update({
        where: { id },
        data: updateData,
        include: {
          project: true,
          submittedBy: true,
          writer: true,
        },
      })

      if (typeof markAsRead === 'boolean' && updatedMaterial.projectId && scriptTypes.includes(updatedMaterial.type)) {
        if (markAsRead) {
          await tx.project.update({
            where: { id: updatedMaterial.projectId },
            data: {
              status: 'READ',
            },
          })
        } else {
          const linkedProject = await tx.project.findUnique({
            where: { id: updatedMaterial.projectId },
            select: { status: true },
          })
          if (linkedProject?.status === 'READ') {
            await tx.project.update({
              where: { id: updatedMaterial.projectId },
              data: { status: 'READING' },
            })
          }
        }
      }

      return updatedMaterial
    })

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
    console.error('Error updating material:', error)
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    )
  }
}
