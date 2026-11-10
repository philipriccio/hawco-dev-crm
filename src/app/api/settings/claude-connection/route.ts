import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { requireApiAdmin, isAuthResponse } from '@/lib/api-auth'
import { allowAttempt, hashPassphrase, readBoundedJson, validPassphrase } from '@/lib/claude-connection'
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
export async function POST(request: NextRequest) {
  const session = await requireApiAdmin()
  if (isAuthResponse(session)) return session
  const origin = process.env.APP_ORIGIN || 'https://hawco.companytheatre.ca'
  if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'Request origin rejected' }, 403)
  try {
    if (!await allowAttempt(`rotation:${session.id}`, 5, 900)) return reply({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)
    let body
    try { body = await readBoundedJson(request) } catch { return reply({ error: 'Invalid request' }, 400) }
    const { currentPassword, passphrase, confirmation } = body
    if (typeof currentPassword !== 'string' || currentPassword.length > 256 || !validPassphrase(passphrase) || confirmation !== passphrase) return reply({ error: 'Use matching passphrases of 16–128 characters, without leading/trailing spaces.' }, 400)
    const hash = await hashPassphrase(passphrase)
    const saved = await prisma.$transaction(async tx => {
      const users = await tx.$queryRaw<Array<{ password: string; role: string }>>`SELECT "password", "role" FROM "User" WHERE "id" = ${session.id} FOR UPDATE`
      const user = users[0]
      if (!user || user.role !== 'ADMIN' || !await bcrypt.compare(currentPassword, user.password)) return false
      if (await bcrypt.compare(passphrase, user.password)) throw new Error('reuse')
      await tx.$executeRaw`INSERT INTO "ClaudeConnectionCredential" ("id", "passwordHash", "updatedBy") VALUES ('claude', ${hash}, ${session.id}) ON CONFLICT ("id") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "updatedAt" = now(), "updatedBy" = EXCLUDED."updatedBy"`
      return true
    })
    return saved ? reply({ ok: true }) : reply({ error: 'Current website password is incorrect or your access changed.' }, 403)
  } catch (error) {
    return reply({ error: error instanceof Error && error.message === 'reuse' ? 'Choose a different passphrase from your website password.' : 'Passphrase could not be saved. Please try again.' }, 503)
  }
}
