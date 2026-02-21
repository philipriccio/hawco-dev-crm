import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { writeFile } from 'fs/promises'
import { join } from 'path'

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']

// Max file size: 10MB for local uploads
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

// Save file locally
async function saveFileLocally(file: File): Promise<{ url: string; filename: string }> {
  const timestamp = Date.now()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const uniqueFilename = `${timestamp}-${safeFilename}`
  
  // Save to public/uploads
  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  const filePath = join(uploadsDir, uniqueFilename)
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  await writeFile(filePath, buffer)
  
  // Return URL path (accessible via /uploads/filename)
  return {
    url: `/uploads/${uniqueFilename}`,
    filename: file.name,
  }
}

// Upload to Spaces
async function uploadToSpaces(file: File): Promise<{ url: string; filename: string }> {
  const s3Client = getS3Client()
  if (!s3Client) {
    throw new Error('Spaces not configured')
  }

  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 10)
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `materials/${timestamp}-${randomString}-${safeFilename}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const command = new PutObjectCommand({
    Bucket: process.env.SPACES_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    ACL: 'public-read',
  })

  await s3Client.send(command)

  const bucket = process.env.SPACES_BUCKET!
  const endpoint = process.env.SPACES_ENDPOINT!.replace('https://', '')
  const publicUrl = `https://${bucket}.${endpoint}/${key}`

  return {
    url: publicUrl,
    filename: file.name,
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Upload to Spaces if configured, otherwise save locally
    let result: { url: string; filename: string }
    if (isSpacesConfigured()) {
      result = await uploadToSpaces(file)
    } else {
      result = await saveFileLocally(file)
    }

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
  return NextResponse.json({
    configured: true, // Local uploads are always available
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
  })
}
