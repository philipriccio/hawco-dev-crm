import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.material.delete({
      where: { id },
    })

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
    const { id } = await params
    const body = await request.json()

    const { title, notes, type, markAsRead } = body

    const updateData: Record<string, unknown> = {}
    
    if (title) updateData.title = title
    if (notes !== undefined) updateData.notes = notes
    if (type) updateData.type = type
    if (markAsRead === true) updateData.readAt = new Date()
    if (markAsRead === false) updateData.readAt = null

    const material = await prisma.material.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        submittedBy: true,
        writer: true,
      },
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
