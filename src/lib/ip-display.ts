export const ipTypeLabels: Record<string, string> = {
  BOOK: 'Book',
  PLAY: 'Play',
  ARTICLE: 'Article',
  SHORT_STORY: 'Short Story',
  MUSICAL: 'Musical',
  PODCAST: 'Podcast',
  LIFE_RIGHTS: 'Life Rights',
  SCREENPLAY: 'Screenplay',
  OTHER: 'Other',
}

export const ipStatusLabels: Record<string, string> = {
  TO_RESEARCH: 'To Research',
  AVAILABLE: 'Available',
  PUBLIC_DOMAIN: 'Public Domain',
  INQUIRY_SENT: 'Inquiry Sent',
  IN_CONVERSATION: 'In Conversation',
  OPTION_OFFERED: 'Option Offered',
  OPTIONED: 'Optioned',
  SECURED: 'Secured',
  PASSED: 'Passed',
  UNAVAILABLE: 'Unavailable',
  EXPIRED: 'Expired',
}

export const ipStatusColors: Record<string, string> = {
  TO_RESEARCH: 'bg-slate-100 text-slate-700',
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  PUBLIC_DOMAIN: 'bg-cyan-100 text-cyan-700',
  INQUIRY_SENT: 'bg-blue-100 text-blue-700',
  IN_CONVERSATION: 'bg-purple-100 text-purple-700',
  OPTION_OFFERED: 'bg-amber-100 text-amber-700',
  OPTIONED: 'bg-indigo-100 text-indigo-700',
  SECURED: 'bg-green-100 text-green-700',
  PASSED: 'bg-red-100 text-red-700',
  UNAVAILABLE: 'bg-orange-100 text-orange-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
}

export const ipInterestLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const ipInterestColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-fuchsia-100 text-fuchsia-700',
}

export const ipChainStatusLabels: Record<string, string> = {
  UNKNOWN: 'Unknown',
  CLEAN: 'Clean',
  NEEDS_LEGAL_REVIEW: 'Needs Legal Review',
  PROBLEMATIC: 'Problematic',
}

export const ipDocumentTypeLabels: Record<string, string> = {
  AGREEMENT: 'Agreement',
  RIGHTS_CORRESPONDENCE: 'Rights Correspondence',
  SOURCE_MATERIAL: 'Source Material',
  LEGAL_NOTE: 'Legal Note',
  ONE_SHEET: 'One Sheet',
  OTHER: 'Other',
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return null
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function displayValue(value: string | null | undefined) {
  return value && value.trim() ? value : 'Not set'
}
