import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Check if Spaces is configured
function isSpacesConfigured(): boolean {
  return !!(
    process.env.SPACES_KEY &&
    process.env.SPACES_SECRET &&
    process.env.SPACES_BUCKET &&
    process.env.SPACES_ENDPOINT
  )
}

// Initialize S3 client
function getS3Client(): S3Client | null {
  if (!isSpacesConfigured()) return null

  return new S3Client({
    endpoint: process.env.SPACES_ENDPOINT,
    region: process.env.SPACES_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.SPACES_KEY!,
      secretAccessKey: process.env.SPACES_SECRET!,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check if Spaces is configured
    if (!isSpacesConfigured()) {
      return NextResponse.json(
        { error: 'File storage not configured', configured: false },
        { status: 503 }
      )
    }

    const s3Client = getS3Client()
    if (!s3Client) {
      return NextResponse.json(
        { error: 'Failed to initialize storage client', configured: false },
        { status: 500 }
      )
    }

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
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json(
          { error: `File type not allowed. Allowed types: PDF, DOC, DOCX, TXT` },
          { status: 400 }
        )
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: 50MB` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `materials/${timestamp}-${randomString}-${safeFilename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Spaces
    const command = new PutObjectCommand({
      Bucket: process.env.SPACES_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read',
    })

    await s3Client.send(command)

    // Construct public URL
    const bucket = process.env.SPACES_BUCKET!
    const endpoint = process.env.SPACES_ENDPOINT!.replace('https://', '')
    const publicUrl = `https://${bucket}.${endpoint}/${key}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
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
  return NextResponse.json({
    configured: isSpacesConfigured(),
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
  })
}
