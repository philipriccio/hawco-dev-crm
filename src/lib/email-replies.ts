export const HAWCO_MAILBOX = 'philip@hawcoproductions.com'
export type EmailReplyInput = {
  mailbox: string; threadId: string; latestMessageId: string; sender: string
  subject: string; context: string; receivedAt: Date
  isNetwork?: boolean; priorityRank?: number; priorityReason?: string
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
  const priority = ['isNetwork', 'priorityRank', 'priorityReason'].some(key => key in input)
  if (priority && (typeof input.isNetwork !== 'boolean' || !Number.isInteger(input.priorityRank) || Number(input.priorityRank) < 1 || Number(input.priorityRank) > 10000)) throw new Error('Invalid reply priority')
  const ranking = priority ? { isNetwork: input.isNetwork as boolean, priorityRank: input.priorityRank as number, priorityReason: text('priorityReason', 500) } : {}
  return { ...ranking, mailbox, threadId, latestMessageId, sender: text('sender', 500), subject: text('subject', 1000), context: text('context', 2000), receivedAt: new Date(date) }
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

// Shared database and client ordering: a non-network deadline never outranks a network.
export const emailReplyOrderBy = [{ isNetwork: 'desc' }, { priorityRank: 'asc' }, { receivedAt: 'asc' }, { id: 'asc' }] as const
export function compareEmailReplies(a: { id: string; isNetwork: boolean; priorityRank: number; receivedAt: string }, b: { id: string; isNetwork: boolean; priorityRank: number; receivedAt: string }) {
  return Number(b.isNetwork) - Number(a.isNetwork) || a.priorityRank - b.priorityRank || Date.parse(a.receivedAt) - Date.parse(b.receivedAt) || a.id.localeCompare(b.id)
}
