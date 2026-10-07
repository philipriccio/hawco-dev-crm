import Link from 'next/link'
import { fundingCountdown, fundingDaysLeft, type FundingDeadlineRecord } from '@/lib/funding-deadlines'
export default function FundingDeadlineWidget({ deadlines, now }: { deadlines: FundingDeadlineRecord[]; now: string }) {
  const active = deadlines.filter(d => !d.archived).sort((a, b) => a.closingDate.localeCompare(b.closingDate))
  const upcoming = active.filter(d => fundingDaysLeft(d.closingDate, now) >= 0)
  const pastCount = active.length - upcoming.length
  return <section className="bg-white rounded-xl p-5 shadow-sm min-w-0" aria-label="Funding deadlines">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Funding Deadlines</h2><Link href="/funding" className="text-sm text-blue-700">Manage</Link></div>
    <p className="text-xs text-slate-500 mt-1">Toronto calendar days · Check the program’s exact closing time.</p>
    {upcoming.length ? <ul className="divide-y mt-3">{upcoming.slice(0, 4).map((deadline, index) => <li key={deadline.id} className="py-3">
      {index === 0 && <p className="text-xs font-semibold uppercase text-blue-700">Next deadline</p>}
      <p className="font-medium break-words">{deadline.program}{deadline.round ? ` — ${deadline.round}` : ''}</p>
      {deadline.funder && <p className="text-xs text-slate-600">{deadline.funder}</p>}
      <p className="text-sm"><time dateTime={deadline.closingDate}>{deadline.closingDate}</time> · <strong>{fundingCountdown(deadline.closingDate, now)}</strong></p>
      <p className="text-xs text-slate-500">{deadline.status === 'CONFIRMED' ? 'Marked confirmed by team' : 'Tentative — confirm with program'}</p>
    </li>)}</ul> : <p className="text-sm text-slate-600 mt-4">No upcoming funding deadlines tracked. Add programs and their next closing dates.</p>}
    {pastCount > 0 && <Link href="/funding" className="block mt-3 text-sm text-blue-700">{pastCount} past deadline{pastCount === 1 ? '' : 's'} — review previous rounds</Link>}
    {upcoming.length > 4 && <Link href="/funding" className="block mt-3 text-sm text-blue-700">View all {upcoming.length} upcoming deadlines</Link>}
  </section>
}
