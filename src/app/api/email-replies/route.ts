import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { emailReplyInput, emailReplyUpdate } from '@/lib/email-replies'

export async function GET() {
  const auth = await requireApiAuth(); if (isAuthResponse(auth)) return auth
  try {
    return NextResponse.json(await prisma.emailReply.findMany({ orderBy: { receivedAt: 'desc' } }))
  } catch { return NextResponse.json({ error: 'Unable to load email replies' }, { status: 500 }) }
}

// Explicit thread upserts only: a partial scan never closes omitted threads.
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(); if (isAuthResponse(auth)) return auth
  let items
  try {
    const body = await request.json()
    if (!Array.isArray(body.items) || body.items.length > 200) throw new Error('Supply at most 200 items')
    items = body.items.map(emailReplyInput)
    if (new Set(items.map((item: { mailbox: string; threadId: string }) => `${item.mailbox}/${item.threadId}`)).size !== items.length) throw new Error('Duplicate thread in batch')
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 }) }
  try {
    const result = await prisma.$transaction(async tx => {
      const saved = []
      for (const input of items) {
        const where = { mailbox_threadId: { mailbox: input.mailbox, threadId: input.threadId } }
        const existing = await tx.emailReply.findUnique({ where })
        saved.push(await tx.emailReply.upsert({ where, create: input, update: emailReplyUpdate(existing, input) }))
      }
      return saved
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json(result)
  } catch (error) {
    const conflict = error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)
    return NextResponse.json({ error: conflict ? 'Concurrent update; reload and retry' : 'Unable to save email replies; retry' }, { status: conflict ? 409 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth(); if (isAuthResponse(auth)) return auth
  let body
  try {
    body = await request.json()
    if (typeof body.id !== 'string' || typeof body.latestMessageId !== 'string' || !['OPEN', 'RESOLVED', 'DISMISSED'].includes(body.status)) throw new Error('Supply id, latestMessageId and a valid status')
  } catch { return NextResponse.json({ error: 'Invalid email reply update' }, { status: 400 }) }
  try {
    const result = await prisma.emailReply.updateMany({
      where: { id: body.id, latestMessageId: body.latestMessageId },
      data: { status: body.status, resolvedAt: body.status === 'OPEN' ? null : new Date() },
    })
    if (!result.count) return NextResponse.json({ error: 'Thread changed or was removed. Refresh before resolving.' }, { status: 409 })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Unable to update email reply; retry' }, { status: 500 }) }
}
