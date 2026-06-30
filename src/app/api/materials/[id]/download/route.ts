import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUploadedFileAccessUrl } from '@/lib/file-storage'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session

    const { id } = await params
    const material = await prisma.material.findUnique({
      where: { id },
      select: {
        fileUrl: true,
        filename: true,
        title: true,
      },
    })

    if (!material?.fileUrl) {
      return NextResponse.json(
        { error: 'Material file not found' },
        { status: 404 }
      )
    }

    const accessUrl = await getUploadedFileAccessUrl(
      material.fileUrl,
      material.filename || material.title
    )

    return NextResponse.redirect(accessUrl)
  } catch (error) {
    console.error('Error creating material download URL:', error)
    return NextResponse.json(
      { error: 'Failed to open material file' },
      { status: 500 }
    )
  }
}
