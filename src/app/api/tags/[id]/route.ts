import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()
    const { name, color, category } = body

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(category !== undefined && { category }),
      },
    })

    return NextResponse.json(tag)
  } catch (error: unknown) {
    console.error('Error updating tag:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params

    await prisma.tag.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
