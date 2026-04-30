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
    const { network, title, genre, prodCompany, distributor, status, notes } = body

    const updateData: Record<string, unknown> = {}
    if (network !== undefined) updateData.network = network
    if (title !== undefined) updateData.title = title
    if (genre !== undefined) updateData.genre = genre
    if (prodCompany !== undefined) updateData.prodCompany = prodCompany
    if (distributor !== undefined) updateData.distributor = distributor
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const show = await prisma.currentShow.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(show)
  } catch (error) {
    console.error('Error updating show:', error)
    return NextResponse.json(
      { error: 'Failed to update show' },
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

    await prisma.currentShow.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting show:', error)
    return NextResponse.json(
      { error: 'Failed to delete show' },
      { status: 500 }
    )
  }
}
