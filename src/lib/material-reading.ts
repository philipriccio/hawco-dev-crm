/** Reading history is an explicit user assertion, never inferred from a project decision. */
export function explicitReadAt(markAsRead: unknown, previous: Date | null, now = new Date()): Date | null | undefined {
  if (markAsRead === true) return previous ?? now
  if (markAsRead === false) return null
  return undefined
}
