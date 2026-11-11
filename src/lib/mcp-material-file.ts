import { GetObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'
import { getS3Client } from './file-storage'
import { prisma } from './db'
import { CollaborationError, materialObjectKey } from './mcp-collaboration'
export const MAX_MATERIAL_BYTES = 8 * 1024 * 1024
export async function readPdfBody(body: AsyncIterable<Uint8Array>, abort: AbortController) {
  const chunks: Buffer[] = []; let size = 0
  for await (const chunk of body) { const part = Buffer.from(chunk); size += part.length; if (size > MAX_MATERIAL_BYTES) { abort.abort(); throw new CollaborationError(413, 'Document exceeds 8 MiB retrieval limit') }; chunks.push(part) }
  const bytes = Buffer.concat(chunks)
  if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new CollaborationError(415, 'Only actual PDF documents are supported; no content inferred from metadata')
  return bytes
}
export async function materialFile(id: string) {
  const record = await prisma.material.findUnique({ where: { id }, select: { id: true, title: true, fileUrl: true, filename: true, mimeType: true } })
  if (!record) throw new CollaborationError(404, 'Material not found')
  const key = materialObjectKey(record.fileUrl)
  const client = getS3Client()
  if (!client) throw new CollaborationError(503, 'Private document storage unavailable')
  // Never fetch a supplied URL, follow redirects, or release a signed URL.
  const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 20000)
  try {
    const object = await client.send(new GetObjectCommand({ Bucket: process.env.SPACES_BUCKET!, Key: key }), { abortSignal: abort.signal })
    if (!object.Body) throw new CollaborationError(404, 'Stored document bytes unavailable')
    if (object.ContentLength && object.ContentLength > MAX_MATERIAL_BYTES) { abort.abort(); throw new CollaborationError(413, 'Document exceeds 8 MiB retrieval limit') }
    const bytes = await readPdfBody(object.Body as AsyncIterable<Uint8Array>, abort)
    return { id: record.id, title: record.title, filename: record.filename, mimeType: 'application/pdf', size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') }
  } finally { clearTimeout(timer) }
}
