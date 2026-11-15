import { createHash } from 'node:crypto'
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function assertHawcoSource(userId: string, calendarId: string) {
  const approved = process.env.HAWCO_CALENDAR_ID?.trim()
  if (!approved || approved === 'primary' || !process.env.HAWCO_CALENDAR_OWNER_ID || userId !== process.env.HAWCO_CALENDAR_OWNER_ID || calendarId !== approved) throw new Error('Confirm the Hawco calendar and its owner before importing. Other or unknown calendars are not accepted.')
}
export function datedMeetingNotes(notes: string | null) {
  return (notes || '').split(/\r?\n/).flatMap((original, index) => {
    const match = original.match(/^\s*(\d{4}-\d{2}-\d{2})\s*[-–—:]\s*(Met\b.*)$/i)
    if (!match || /\b(cancelled|canceled|scheduled|planned|postponed|did not|never|no[- ]show)\b/i.test(match[2])) return []
    const date = new Date(`${match[1]}T12:00:00Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== match[1] || match[1] > new Date().toISOString().slice(0,10)) return []
    return [{ original, index, date, title: match[2], datePrecision: 'DAY', occurrence: 'OCCURRED' }]
  })
}
export function exactEmail(value: string) {
  const m = value.trim().match(/^(?:[^<>]*<)?([^<>\s]+@[^<>\s]+)>?$/)
  return m ? m[1].toLowerCase() : null
}
export function contactMatch(email: string, contacts: {id:string;email:string|null}[]) {
  const key = exactEmail(email)
  const matches = key ? contacts.filter(c => c.email && exactEmail(c.email) === key) : []
  return matches.length === 1 ? matches[0].id : null
}
export function quietState(last: Date | null, days: number, now = new Date()) {
  if (!last) return { label: 'No contact date recorded', days: null, quiet: false }
  const elapsed = Math.max(0, Math.floor((now.getTime()-last.getTime())/86400000))
  return {label: `${elapsed} days since recorded contact`, days: elapsed, quiet: elapsed >= days}
}
