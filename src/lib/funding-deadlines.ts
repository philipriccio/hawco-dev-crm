export interface FundingDeadlineRecord {
  id: string; program: string; funder: string | null; round: string | null
  closingDate: string; sourceUrl: string | null; notes: string | null
  status: string; archived: boolean
}
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function torontoDay(now: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now))
  const part = (type: string) => parts.find(p => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function fundingDaysLeft(closingDate: string, now: Date | string = new Date()) {
  if (!isDateOnly(closingDate)) throw new Error('Closing date must be a valid YYYY-MM-DD calendar date')
  return Math.round((Date.parse(`${closingDate}T00:00:00Z`) - Date.parse(`${torontoDay(now)}T00:00:00Z`)) / 86400000)
}
export function fundingCountdown(closingDate: string, now: Date | string = new Date()) {
  const days = fundingDaysLeft(closingDate, now)
  return days < 0 ? `${Math.abs(days)} day${days === -1 ? '' : 's'} ago` : days === 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`
}
export function fundingDeadlineInput(body: unknown, creating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('A funding deadline is required')
  const input = body as Record<string, unknown>
  const data: Record<string, string | boolean | Date | null> = {}
  for (const field of ['program', 'funder', 'round', 'sourceUrl', 'notes']) {
    if (field in input) {
      if (input[field] !== null && typeof input[field] !== 'string') throw new Error(`${field} must be text`)
      const value = typeof input[field] === 'string' ? input[field].trim() : ''
      if (value.length > (field === 'notes' ? 5000 : field === 'sourceUrl' ? 2000 : 250)) throw new Error(`${field} is too long`)
      data[field] = value || null
    }
  }
  if ((creating || 'program' in input) && !data.program) throw new Error('Program name is required')
  if (creating || 'closingDate' in input) {
    if (!isDateOnly(input.closingDate)) throw new Error('Enter a valid closing date (YYYY-MM-DD)')
    data.closingDate = new Date(`${input.closingDate}T00:00:00Z`)
  }
  if (data.sourceUrl) {
    let url
    try { url = new URL(String(data.sourceUrl)) } catch { throw new Error('Enter a valid source URL') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Source URL must be an HTTP or HTTPS link without credentials')
  }
  if ('status' in input) {
    if (!['TENTATIVE', 'CONFIRMED'].includes(String(input.status))) throw new Error('Status must be tentative or confirmed')
    data.status = String(input.status)
  }
  if ('archived' in input) {
    if (typeof input.archived !== 'boolean') throw new Error('archived must be true or false')
    data.archived = input.archived
  }
  if (!Object.keys(data).length) throw new Error('No supported fields provided')
  return data
}
