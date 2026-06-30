import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export function isSpacesConfigured(): boolean {
  return Boolean(
    process.env.SPACES_KEY &&
      process.env.SPACES_SECRET &&
      process.env.SPACES_BUCKET &&
      process.env.SPACES_ENDPOINT
  )
}

export function getS3Client(): S3Client | null {
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

function publicSpacesUrl(key: string): string {
  const bucket = process.env.SPACES_BUCKET!
  const endpoint = process.env.SPACES_ENDPOINT!.replace('https://', '')
  return `https://${bucket}.${endpoint}/${key}`
}

function contentDispositionFilename(filename: string): string {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export function getSpacesKeyFromUrl(fileUrl: string): string | null {
  if (!isSpacesConfigured()) return null

  try {
    const url = new URL(fileUrl)
    const bucket = process.env.SPACES_BUCKET!
    const endpoint = process.env.SPACES_ENDPOINT!.replace(/^https?:\/\//, '')
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''))

    if (url.hostname === `${bucket}.${endpoint}`) {
      return pathname || null
    }

    if (url.hostname === endpoint && pathname.startsWith(`${bucket}/`)) {
      return pathname.slice(bucket.length + 1) || null
    }
  } catch {
    return null
  }

  return null
}

export async function getUploadedFileAccessUrl(
  fileUrl: string,
  filename?: string | null
): Promise<string> {
  const key = getSpacesKeyFromUrl(fileUrl)
  if (!key) return fileUrl

  const client = getS3Client()
  if (!client) return fileUrl

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: process.env.SPACES_BUCKET!,
      Key: key,
      ResponseContentDisposition: filename
        ? contentDispositionFilename(filename)
        : undefined,
    }),
    { expiresIn: 60 * 10 }
  )
}

export async function storeUploadedFile(
  file: File,
  options: { prefix?: string; includeRandomSuffix?: boolean } = {}
): Promise<{ url: string; filename: string; key?: string }> {
  const timestamp = Date.now()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const randomSuffix = options.includeRandomSuffix
    ? `-${Math.random().toString(36).substring(2, 10)}`
    : ''
  const uniqueFilename = `${timestamp}${randomSuffix}-${safeFilename}`
  const key = options.prefix ? `${options.prefix}/${uniqueFilename}` : uniqueFilename

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (isSpacesConfigured()) {
    const client = getS3Client()
    if (!client) throw new Error('Spaces not configured')

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.SPACES_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      })
    )

    return { url: publicSpacesUrl(key), filename: file.name, key }
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads', options.prefix || '')
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(join(uploadsDir, uniqueFilename), buffer)

  return {
    url: `/uploads/${options.prefix ? `${options.prefix}/` : ''}${uniqueFilename}`,
    filename: file.name,
  }
}
