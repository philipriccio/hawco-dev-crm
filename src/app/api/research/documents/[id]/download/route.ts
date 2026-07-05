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
    const document = await prisma.researchDocument.findUnique({
      where: { id },
      select: {
        fileUrl: true,
        fileName: true,
        title: true,
      },
    })

    if (!document?.fileUrl) {
      return NextResponse.json(
        { error: 'Research document file not found' },
        { status: 404 }
      )
    }

    const accessUrl = await getUploadedFileAccessUrl(
      document.fileUrl,
      document.fileName || document.title
    )

    return NextResponse.redirect(accessUrl)
  } catch (error) {
    console.error('Error creating research document download URL:', error)
    return NextResponse.json(
      { error: 'Failed to open research document' },
      { status: 500 }
    )
  }
}
