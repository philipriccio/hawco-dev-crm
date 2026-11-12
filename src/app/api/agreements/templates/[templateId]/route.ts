import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { privateAccess } from '@/lib/agreements/service'
import { DealError } from '@/lib/agreements/domain'
import { failure } from '@/lib/agreements/http'
export async function GET(
  _r: Request,
  c: { params: Promise<{ templateId: string }> },
) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    const t = await prisma.agreementTemplate.findUnique({
      where: { id: (await c.params).templateId },
    })
    if (!t) throw new DealError(404, 'Template not found')
    if (t.status !== 'APPROVED') {
      const retained =
        t.status === 'RETIRED' &&
        (await prisma.agreementWorkspace.count({
          where: {
            data: { path: ['templateLineage'], array_contains: [{ id: t.id }] },
          },
        })) > 0
      if (!retained) privateAccess(a)
    }
    return new NextResponse(new Uint8Array(t.bytes), {
      headers: {
        'Content-Type': t.mimeType,
        'X-Template-Status': t.status,
        'Content-Disposition': `attachment; filename="${t.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch (e) {
    return failure(e)
  }
}
