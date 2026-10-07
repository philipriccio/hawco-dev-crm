/** A URL is a reference, not proof a document is stored or verified. */
export function materialSourceLabel(fileUrl: string) {
  if (fileUrl.startsWith('/api/files/')) return 'Open uploaded document'
  try {
    const host = new URL(fileUrl).hostname
    if (host === 'mail.google.com') return 'Open source email'
    if (host === 'drive.google.com' || host === 'docs.google.com') return 'Open Drive reference'
    return 'Open document link'
  } catch { return 'Document link unavailable' }
}
