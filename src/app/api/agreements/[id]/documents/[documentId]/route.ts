import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { privateAccess } from '@/lib/agreements/service'
import { DealError } from '@/lib/agreements/domain'
import { failure } from '@/lib/agreements/http'
export async function GET(
  r: Request,
  c: { params: Promise<{ id: string; documentId: string }> },
) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    const { id, documentId } = await c.params
    const restricted = new URL(r.url).searchParams.get('restricted') === '1'
    if (restricted) privateAccess(a)
    const doc = restricted
      ? await prisma.agreementLegal.findFirst({
          where: { id: documentId, agreementId: id },
        })
      : await prisma.agreementDocument.findFirst({
          where: { id: documentId, agreementId: id },
        })
    if (!doc?.bytes) throw new DealError(404, 'Document not found')
    return new NextResponse(new Uint8Array(doc.bytes), {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch (e) {
    return failure(e)
  }
}
