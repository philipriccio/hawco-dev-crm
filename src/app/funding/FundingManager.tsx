'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import FundingDeadlineWidget from '@/components/FundingDeadlineWidget'
import { fundingCountdown, fundingDaysLeft, type FundingDeadlineRecord } from '@/lib/funding-deadlines'
export default function FundingManager({ initialDeadlines, now }: { initialDeadlines: FundingDeadlineRecord[]; now: string }) {
  const [deadlines, setDeadlines] = useState(initialDeadlines)
  const [editing, setEditing] = useState<FundingDeadlineRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (editing) {
      formRef.current?.scrollIntoView({ block: 'start' })
      formRef.current?.querySelector<HTMLInputElement>('[name=program]')?.focus()
    }
  }, [editing])
  async function request(body: Record<string, unknown>, method: 'POST' | 'PATCH') {
    const response = await fetch('/api/funding-deadlines', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not save. Please retry.')
    setDeadlines(previous => method === 'POST' ? [...previous, data] : previous.map(d => d.id === data.id ? data : d))
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); setBusy(true); setError(''); setNotice('')
    try { await request({ ...Object.fromEntries(fields), ...(editing ? { id: editing.id } : {}) }, editing ? 'PATCH' : 'POST'); setEditing(null); form.reset(); setNotice('Funding deadline saved.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please retry.') } finally { setBusy(false) }
  }
  async function archive(deadline: FundingDeadlineRecord) {
    setBusy(true); setError(''); setNotice('')
    try { await request({ id: deadline.id, archived: !deadline.archived }, 'PATCH'); setNotice(deadline.archived ? 'Deadline restored.' : 'Deadline archived. You can restore it below.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update. Please retry.') } finally { setBusy(false) }
  }
  const sorted = [...deadlines].sort((a,b) => a.closingDate.localeCompare(b.closingDate))
  const groups = [
    { name: 'Upcoming & Today', records: sorted.filter(d => !d.archived && fundingDaysLeft(d.closingDate, now) >= 0) },
    { name: 'Past Rounds', records: sorted.filter(d => !d.archived && fundingDaysLeft(d.closingDate, now) < 0).reverse() },
    { name: 'Archived', records: sorted.filter(d => d.archived).reverse() },
  ]
  return <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
    <Link href="/" className="text-sm text-blue-700">Back to Today</Link><header><h1 className="text-2xl font-bold">Funding Deadlines</h1><p className="text-slate-600 mt-2">Track each program round separately. Past dates stay in history and never roll forward automatically. Confirmation is recorded by the team, not independently verified.</p></header>
    {error && <p role="alert" className="rounded bg-red-50 text-red-800 p-3">{error}</p>}<p role="status" className="text-sm text-green-800">{notice}</p>
    <div className="grid lg:grid-cols-2 gap-6"><FundingDeadlineWidget deadlines={deadlines} now={now} />
    <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">{editing ? 'Edit Deadline' : 'Add Funding Round'}</h2>
      <form ref={formRef} key={editing?.id || 'new'} onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Program<input name="program" required maxLength={250} defaultValue={editing?.program || ''} className="block w-full rounded border p-2" /></label>
        <label className="text-sm">Funder (optional)<input name="funder" maxLength={250} defaultValue={editing?.funder || ''} className="block w-full rounded border p-2" /></label>
        <label className="text-sm">Round (optional)<input name="round" maxLength={250} defaultValue={editing?.round || ''} placeholder="e.g. Fall 2026" className="block w-full rounded border p-2" /></label>
        <label className="text-sm">Closing date<input name="closingDate" type="date" required defaultValue={editing?.closingDate || ''} className="block w-full rounded border p-2" /></label>
        <label className="text-sm">Confirmation<select name="status" defaultValue={editing?.status || 'TENTATIVE'} className="block w-full rounded border p-2"><option value="TENTATIVE">Tentative</option><option value="CONFIRMED">Confirmed by team</option></select></label>
        <label className="text-sm sm:col-span-2">Program source link (optional)<input name="sourceUrl" type="url" maxLength={2000} defaultValue={editing?.sourceUrl || ''} className="block w-full rounded border p-2" /></label>
        <label className="text-sm sm:col-span-2">Notes / closing time<textarea name="notes" maxLength={5000} defaultValue={editing?.notes || ''} className="block w-full rounded border p-2" /></label>
        <button disabled={busy} className="rounded bg-blue-700 text-white px-3 py-2">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Deadline'}</button>{editing && <button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel Edit</button>}
      </form>
    </section></div>
    {groups.map(group => <section key={group.name} className="bg-white rounded-xl p-5 shadow-sm"><h2 className="text-lg font-semibold">{group.name}</h2>{!group.records.length && <p className="text-sm text-slate-500 mt-2">No deadlines in this section.</p>}<ul className="divide-y">{group.records.map(deadline => <li key={deadline.id} className="py-4 flex flex-wrap gap-3 items-start">
      <div className="min-w-0 flex-1"><h3 className="font-medium break-words">{deadline.program}{deadline.round ? ` — ${deadline.round}` : ''}</h3><p className="text-sm">{deadline.funder || 'Funder not specified'} · {deadline.closingDate} · {fundingCountdown(deadline.closingDate, now)}</p><p className="text-xs text-slate-500">{deadline.status === 'CONFIRMED' ? 'Marked confirmed by team' : 'Tentative — confirm with program'}</p>{deadline.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{deadline.notes}</p>}{deadline.sourceUrl && <a className="text-sm text-blue-700" href={deadline.sourceUrl} target="_blank" rel="noopener noreferrer">Program source ↗</a>}</div>
      <button disabled={busy} onClick={() => setEditing(deadline)} className="rounded border px-3 py-2 text-sm">Edit</button><button disabled={busy} onClick={() => archive(deadline)} className="rounded border px-3 py-2 text-sm">{deadline.archived ? 'Restore' : 'Archive'}</button>
    </li>)}</ul></section>)}
  </div>
}
