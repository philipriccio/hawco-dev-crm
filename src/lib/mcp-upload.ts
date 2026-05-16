import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { logMcpActivity } from '@/lib/mcp-activity'
import type { McpActor } from '@/lib/mcp-auth'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']
const MAX_FILE_SIZE = 25 * 1024 * 1024

function isSpacesConfigured() {
  return Boolean(process.env.SPACES_KEY && process.env.SPACES_SECRET && process.env.SPACES_BUCKET && process.env.SPACES_ENDPOINT)
}

function getS3Client() {
  if (!isSpacesConfigured()) return null
  return new S3Client({
    endpoint: process.env.SPACES_ENDPOINT,
    region: process.env.SPACES_REGION || 'us-east-1',
    credentials: { accessKeyId: process.env.SPACES_KEY!, secretAccessKey: process.env.SPACES_SECRET! },
  })
}

function validate(filename: string, mimeType: string, size: number) {
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_TYPES.includes(mimeType) && !ALLOWED_EXTENSIONS.includes(extension)) throw new Error('file type not allowed')
  if (size > MAX_FILE_SIZE) throw new Error('file too large')
}

export async function uploadMcpFile(actor: McpActor, input: { filename: unknown; mimeType?: unknown; base64: unknown }) {
  const filename = typeof input.filename === 'string' && input.filename.trim() ? input.filename.trim() : 'upload.bin'
  const mimeType = typeof input.mimeType === 'string' && input.mimeType.trim() ? input.mimeType.trim() : 'application/octet-stream'
  const base64 = typeof input.base64 === 'string' ? input.base64 : ''
  if (!base64) throw new Error('base64 is required')
  const buffer = Buffer.from(base64, 'base64')
  validate(filename, mimeType, buffer.length)

  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 10)
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

  let url: string
  if (isSpacesConfigured()) {
    const key = `materials/${timestamp}-${randomString}-${safeFilename}`
    const client = getS3Client()
    if (!client) throw new Error('Spaces not configured')
    await client.send(new PutObjectCommand({ Bucket: process.env.SPACES_BUCKET!, Key: key, Body: buffer, ContentType: mimeType }))
    const endpoint = process.env.SPACES_ENDPOINT!.replace('https://', '')
    url = `https://${process.env.SPACES_BUCKET!}.${endpoint}/${key}`
  } else {
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    const uniqueFilename = `${timestamp}-${safeFilename}`
    await writeFile(join(uploadsDir, uniqueFilename), buffer)
    url = `/uploads/${uniqueFilename}`
  }

  await logMcpActivity({ actor, action: 'uploaded', entityType: 'material', entityId: url, entityName: filename, tool: 'upload_file', extra: { filename, mimeType, fileSize: buffer.length, url } })
  return { success: true, url, filename, fileSize: buffer.length, mimeType }
}
