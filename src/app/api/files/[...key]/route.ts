import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { resolve, sep, extname } from 'path'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

// Development documents never live in Next's unauthenticated public directory.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await requireApiAuth()
  if (isAuthResponse(session)) return session
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Local document storage is disabled in production' }, { status: 404 })
  const { key } = await params
  if (!key.length || key.some(part => !/^[a-zA-Z0-9._-]+$/.test(part) || part === '..' || part === '.')) return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  const root = resolve(process.cwd(), '.local-uploads')
  const path = resolve(root, ...key)
  if (!path.startsWith(root + sep)) return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  try {
    const data = await readFile(path)
    const types: Record<string, string> = { '.pdf': 'application/pdf', '.txt': 'text/plain', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    return new NextResponse(data, { headers: { 'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream', 'Content-Disposition': `inline; filename="${key.at(-1)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    return NextResponse.json({ error: 'Document not found. Keep the source reference and upload the file again.' }, { status: 404 })
  }
}
