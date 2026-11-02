import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { getAgreement, validDocument, validPage } from '@/lib/wgc-library'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if (isAuthResponse(auth)) { auth.headers.set('Cache-Control', 'private, no-store'); return auth }
  const { id } = await params
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  if (!validDocument(id)) return NextResponse.json({ error: 'Document not found' }, { status: 404, headers })
  try {
    const doc = await getAgreement(id)
    const page = request.nextUrl.searchParams.get('page')
    if (page !== null && !validPage(page, doc.pageCount)) return NextResponse.json({ error: 'Invalid page' }, { status: 400, headers })
    const bytes = await readFile(path.join(process.cwd(), 'private/wgc', id, page ? `${page}.webp` : 'original.pdf'))
    return new NextResponse(bytes, { headers: { ...headers, 'Content-Type': page ? 'image/webp' : 'application/pdf', 'Content-Disposition': `${request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${page ? `${id}-${page}.webp` : doc.filename}"` } })
  } catch { return NextResponse.json({ error: 'Document temporarily unavailable. Please retry.' }, { status: 503, headers }) }
}
