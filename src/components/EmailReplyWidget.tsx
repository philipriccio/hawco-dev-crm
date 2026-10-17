'use client'

import { useState } from 'react'
import { gmailThreadHref } from '@/lib/email-replies'

type Item = { id: string; mailbox: string; threadId: string; latestMessageId: string; sender: string; subject: string; context: string; receivedAt: string }
export default function EmailReplyWidget({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [closed, setClosed] = useState<Item | null>(null)
  const [expanded, setExpanded] = useState(false)
  async function update(item: Item, status: 'RESOLVED' | 'DISMISSED' | 'OPEN') {
    setBusy(item.id); setError('')
    try {
      const response = await fetch('/api/email-replies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, latestMessageId: item.latestMessageId, status }) })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Unable to save. Please retry.')
      }
      if (status === 'OPEN') { setItems(current => [...current, item].sort((a,b) => b.receivedAt.localeCompare(a.receivedAt))); setClosed(null) }
      else { setItems(current => current.filter(row => row.id !== item.id)); setClosed(item) }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.') }
    finally { setBusy(null) }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Emails to reply to</h2><span className="text-sm text-slate-500">{items.length} awaiting reply</span></div>
    <p className="mt-1 text-sm text-slate-500">Hawco threads needing your response. Open the email to reply.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {closed && <div role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">Removed from this list. <button type="button" disabled={busy !== null} onClick={() => update(closed, 'OPEN')} className="text-blue-700 underline disabled:opacity-50">Undo</button></div>}
    {items.length === 0 ? <p className="mt-4 text-sm text-slate-500">No emails currently flagged for reply.</p> : <ul className="mt-3 divide-y divide-slate-100">{(expanded ? items : items.slice(0, 6)).map(item => <li key={item.id} className="py-3">
      <a href={gmailThreadHref(item.mailbox, item.threadId)} target="_blank" rel="noopener noreferrer" className="block break-words font-medium text-blue-700 hover:underline">{item.subject}</a>
      <p className="mt-1 break-words text-xs text-slate-500">{item.sender} · {new Date(item.receivedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })}</p>
      <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">{item.context}</p>
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => update(item, 'RESOLVED')} className="rounded border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy === item.id ? 'Saving…' : 'Mark handled'}</button><button type="button" disabled={busy !== null} onClick={() => update(item, 'DISMISSED')} className="rounded px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">No reply needed</button></div>
    </li>)}</ul>}
    {items.length > 6 && <button type="button" onClick={() => setExpanded(value => !value)} className="mt-3 text-sm text-blue-700 hover:underline" aria-expanded={expanded}>{expanded ? 'Show fewer' : `Show all ${items.length} emails`}</button>}
  </section>
}
