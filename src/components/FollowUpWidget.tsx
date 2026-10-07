'use client'
import { useState } from 'react'
import Link from 'next/link'
import { followUpUrgency } from '@/lib/follow-up-input'
export interface FollowUpItem {
  id: string; note: string; completed: boolean; createdAt: string
  ownerName?: string | null; dueAt?: string | null; waitingOn?: string | null
  contact?: { id: string; name: string; type?: string } | null
  project?: { id: string; title: string } | null
}
export default function FollowUpWidget({ initialFollowUps, contactId, projectId }: { initialFollowUps: FollowUpItem[]; contactId?: string; projectId?: string }) {
  const [items, setItems] = useState(initialFollowUps)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<FollowUpItem | null>(null)
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form)
    setBusy('form'); setError('')
    try {
      const response = await fetch('/api/follow-ups', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(editing ? { id: editing.id } : { contactId, projectId }), note: fields.get('note'), ownerName: fields.get('ownerName'), dueAt: fields.get('dueAt') || null, waitingOn: fields.get('waitingOn') }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setItems(previous => editing ? previous.map(item => item.id === data.id ? data : item) : [data, ...previous]); setEditing(null); form.reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please retry.') } finally { setBusy(null) }
  }
  async function toggle(item: FollowUpItem) {
    setBusy(item.id); setError('')
    try {
      const response = await fetch('/api/follow-ups', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, completed: !item.completed }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setItems(previous => previous.map(entry => entry.id === item.id ? data : entry))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update. Please retry.') } finally { setBusy(null) }
  }
  const sorted = [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity))
  return <section className="rounded-xl bg-white p-5 shadow-sm min-w-0" aria-label="Follow-ups">
    <h2 className="text-lg font-semibold">Follow-ups <span className="text-sm font-normal text-slate-500">{items.filter(i => !i.completed).length} pending</span></h2>
    <p className="text-xs text-slate-500 mt-1">Due dates follow Toronto business days.</p>
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    {(contactId || projectId || editing) && <form key={editing?.id || 'new'} onSubmit={save} className="grid gap-3 my-4 sm:grid-cols-2">
      <label className="sm:col-span-2 text-sm">Next action<input name="note" required maxLength={5000} defaultValue={editing?.note || ''} className="block w-full rounded border p-2" /></label>
      <label className="text-sm">Owner<input name="ownerName" maxLength={250} defaultValue={editing?.ownerName || ''} placeholder="Who is responsible?" className="block w-full rounded border p-2" /></label>
      <label className="text-sm">Due date<input name="dueAt" type="date" defaultValue={editing?.dueAt?.slice(0,10) || ''} className="block w-full rounded border p-2" /></label>
      <label className="text-sm sm:col-span-2">Waiting on<input name="waitingOn" maxLength={250} defaultValue={editing?.waitingOn || ''} placeholder="Person or dependency, if any" className="block w-full rounded border p-2" /></label>
      <button disabled={busy !== null} className="rounded bg-blue-700 text-white px-3 py-2">{busy === 'form' ? 'Saving…' : editing ? 'Save Follow-up' : 'Add Follow-up'}</button>
      {editing && <button type="button" onClick={() => setEditing(null)}>Cancel Edit</button>}
    </form>}
    <div className="divide-y">{sorted.map(item => <div key={item.id} className="py-3 flex gap-3 items-start">
      <button disabled={busy !== null} onClick={() => toggle(item)} className="rounded border px-2 py-1 text-sm shrink-0" aria-label={`${item.completed ? 'Reopen' : 'Complete'} ${item.note}`}>{item.completed ? 'Undo' : 'Done'}</button>
      <div className="min-w-0 flex-1"><p className={`break-words ${item.completed ? 'line-through text-slate-500' : ''}`}>{item.note}</p><p className="text-xs text-slate-600 mt-1"><span className={followUpUrgency(item) === 'Overdue' ? 'text-red-700 font-semibold' : 'text-blue-700'}>{followUpUrgency(item)} · </span>{item.ownerName || 'Unassigned'} · {item.dueAt ? `Due ${new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date(item.dueAt))}` : 'No due date'}{item.waitingOn ? ` · Waiting on ${item.waitingOn}` : ''}</p>
      {item.contact && <Link className="text-xs text-blue-700 mr-3" href={`/contacts/${item.contact.id}`}>{item.contact.name}</Link>}{item.project && <Link className="text-xs text-blue-700" href={`/projects/${item.project.id}`}>{item.project.title}</Link>}</div>
      <button onClick={() => setEditing(item)} className="text-sm text-blue-700">Edit</button>
    </div>)}</div>{!items.length && <p className="text-sm text-slate-500 mt-3">No follow-ups yet.</p>}
  </section>
}
