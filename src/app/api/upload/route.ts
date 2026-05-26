import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { storeUploadedFile } from '@/lib/file-storage'

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: PDF, DOC, DOCX, TXT` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: 10MB` },
        { status: 400 }
      )
    }

    const result = await storeUploadedFile(file, {
      prefix: 'materials',
      includeRandomSuffix: true,
    })

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// Get upload configuration (for client to check if uploads are available)
export async function GET() {
  const session = await requireApiAuth()
  if (isAuthResponse(session)) return session

  return NextResponse.json({
    configured: true, // Local uploads are always available
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
  })
}
