export const HAWCO_MAILBOX = 'philip@hawcoproductions.com'
export type EmailReplyInput = {
  mailbox: string; threadId: string; latestMessageId: string; sender: string
  subject: string; context: string; receivedAt: Date
}
export function emailReplyInput(value: unknown): EmailReplyInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an email thread')
  const input = value as Record<string, unknown>
  const text = (key: string, max: number) => {
    const v = input[key]
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`Invalid ${key}`)
    return v.trim()
  }
  const mailbox = text('mailbox', 254).toLowerCase()
  if (mailbox !== HAWCO_MAILBOX) throw new Error('Only the Hawco mailbox is supported')
  const threadId = text('threadId', 64), latestMessageId = text('latestMessageId', 64)
  if (!/^[a-f0-9]+$/i.test(threadId) || !/^[a-f0-9]+$/i.test(latestMessageId)) throw new Error('Invalid Gmail identifier')
  const date = text('receivedAt', 40)
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error('Invalid receivedAt')
  return { mailbox, threadId, latestMessageId, sender: text('sender', 500), subject: text('subject', 1000), context: text('context', 2000), receivedAt: new Date(date) }
}
export function emailReplyUpdate(existing: { latestMessageId: string; receivedAt: Date; status: string } | null, input: EmailReplyInput, now = new Date()) {
  // Stale scan must never replace/reopen a newer thread. Same-message dismissals persist.
  if (existing && input.receivedAt < existing.receivedAt) return { lastCheckedAt: now }
  const reopen = !existing || (existing.latestMessageId !== input.latestMessageId && input.receivedAt >= existing.receivedAt)
  return { ...input, lastCheckedAt: now, ...(reopen ? { status: 'OPEN', resolvedAt: null } : {}) }
}
export function gmailThreadHref(mailbox: string, threadId: string) {
  return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(mailbox)}#all/${encodeURIComponent(threadId)}`
}
