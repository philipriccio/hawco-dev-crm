import { randomBytes, scrypt as nativeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { prisma } from './db'
const scrypt = promisify(nativeScrypt)
export async function hashPassphrase(value: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(value, salt, 64) as Buffer
  return `scrypt$${salt}$${hash.toString('hex')}`
}
export async function verifyPassphrase(value: string, encoded: string) {
  const parts = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded)
  if (!parts) return false
  const actual = await scrypt(value, parts[1], 64) as Buffer
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'))
}
export function validPassphrase(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 16 && value.length <= 128 && value === value.trim() && !/[\x00-\x1f\x7f]/.test(value)
}
export async function allowAttempt(key: string, limit: number, seconds: number) {
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "ClaudeConnectionThrottle" ("key", "attempts", "windowStart") VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "ClaudeConnectionThrottle"."windowStart" < now() - ${seconds} * interval '1 second' THEN 1 ELSE "ClaudeConnectionThrottle"."attempts" + 1 END,
      "windowStart" = CASE WHEN "ClaudeConnectionThrottle"."windowStart" < now() - ${seconds} * interval '1 second' THEN now() ELSE "ClaudeConnectionThrottle"."windowStart" END
    RETURNING "attempts"`
  return rows[0].attempts <= limit
}
export async function readBoundedJson(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('body')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('body')
  const chunks: Uint8Array[] = []; let length = 0
  try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 4096) { await reader.cancel(); throw new Error('body') }; chunks.push(value) } }
  finally { reader.releaseLock() }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body')
  return body
}
