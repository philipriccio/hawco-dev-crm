'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ProjectStatus } from '@prisma/client'
import { DEVELOPMENT_SLATE_STATUSES } from '@/lib/development-slate'

type Option = { id: string; name: string }
export type DevelopmentEditorProps = {
  projectId: string; version: string; status: ProjectStatus; currentStage: string | null; nextAction: string | null
  writerIds: string[]; ipIds: string[]; writers: Option[]; properties: Option[]
}
const labels: Record<string, string> = { EARLY_DEVELOPMENT: 'Early Development', DEVELOPING: 'Developing', PACKAGING: 'Packaging', PITCHED: 'Pitched', DEVELOPING_WITH_NETWORK: 'Developing with Network', GREENLIT: 'Greenlit' }
function label(status: string) { return labels[status] || status.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()) }
function Choices({ legend, options, selected, change }: { legend: string; options: Option[]; selected: string[]; change: (ids: string[]) => void }) {
  const [query, setQuery] = useState('')
  return <fieldset className="min-w-0"><legend className="font-medium text-slate-800">{legend}</legend>
    <input aria-label={`Search ${legend}`} placeholder={`Search ${legend.toLowerCase()}`} value={query} onChange={e => setQuery(e.target.value)} className="mt-2 w-full rounded border border-slate-300 px-3 py-2" />
    <div className="mt-2 max-h-44 overflow-auto rounded border border-slate-200 p-2">
      {options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())).map(o => <label key={o.id} className="flex items-start gap-2 rounded p-2 text-sm"><input type="checkbox" checked={selected.includes(o.id)} onChange={e => change(e.target.checked ? [...selected, o.id] : selected.filter(id => id !== o.id))} className="mt-1" /><span className="min-w-0 break-words">{o.name}</span></label>)}
      {!options.length && <p className="text-sm text-slate-500">No records available.</p>}
    </div>
    <p className="mt-1 text-xs text-slate-500">{selected.length} selected</p>
  </fieldset>
}
export default function ProjectDevelopmentEditor(props: DevelopmentEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState(props.status)
  const [stage, setStage] = useState(props.currentStage || '')
  const [next, setNext] = useState(props.nextAction || '')
  const [writers, setWriters] = useState(props.writerIds)
  const [ip, setIp] = useState(props.ipIds)
  const [busy, setBusy] = useState(false)
  const [refreshing, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [needsReload, setNeedsReload] = useState(false)
  const protectedStatus = ['PASS_KEEP_WRITER', 'NOT_READING', 'REFERENCE_ONLY', 'SHELVED'].includes(props.status)
  function reset() { setStatus(props.status); setStage(props.currentStage || ''); setNext(props.nextAction || ''); setWriters(props.writerIds); setIp(props.ipIds); setEditing(false); setError('') }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/projects/${props.projectId}/development`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: props.version, status, currentStage: stage, nextAction: next, writerIds: writers, ipIds: ip }) })
      const result = await response.json()
      if (!response.ok) { if (response.status === 409 || response.status >= 500) setNeedsReload(true); throw new Error(result.error || 'Unable to save fields.') }
      setEditing(false)
      startTransition(() => router.refresh())
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not confirm save. Reload the latest fields.'); setNeedsReload(true) }
    finally { setBusy(false) }
  }
  const savedNames = (options: Option[], ids: string[]) => options.filter(o => ids.includes(o.id)).map(o => o.name).join(', ') || 'Not recorded'
  return <section id="project-active-development" aria-labelledby="project-development-heading" className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="project-development-heading" className="text-lg font-semibold">Active Development</h2><p className="mt-1 text-sm text-slate-500">These fields appear on the dashboard. Saved changes carry over automatically.</p><Link href="/" className="mt-1 inline-block text-sm text-blue-700 underline">Back to dashboard</Link></div>
      {!editing && <button type="button" onClick={() => setEditing(true)} disabled={refreshing || needsReload} className="rounded border border-slate-300 px-3 py-2 text-sm font-medium">Edit dashboard fields</button>}
    </div>
    {!DEVELOPMENT_SLATE_STATUSES.includes(status) && <p className="mt-3 text-sm text-amber-800">This status is outside Active Development, so this project is not shown in the dashboard widget. Use the project workflow for reading or shelving decisions.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {needsReload && <button type="button" className="mt-2 rounded border px-3 py-2" onClick={() => window.location.reload()}>Reload latest fields</button>}
    {refreshing && <p role="status" className="mt-2 text-sm">Saved. Refreshing project fields…</p>}
    {editing ? <form onSubmit={save} className="mt-4"><fieldset disabled={busy || refreshing || needsReload}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choices legend="Writers" options={props.writers} selected={writers} change={setWriters} />
        <Choices legend="Underlying IP" options={props.properties} selected={ip} change={setIp} />
        <p className="text-xs text-slate-500">Attached writers only; writers being considered stay separate. Manage new contacts in <Link href="/contacts" className="underline">Contacts</Link>.</p>
        <p className="text-xs text-slate-500">Only unlinked IP or IP already linked here is available. Linking records does not confirm rights ownership. Unchecking removes the link, not the record.</p>
        <label className="text-sm font-medium">Status<select aria-label="Development status" value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} disabled={protectedStatus} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2">{[...new Set([props.status, ...DEVELOPMENT_SLATE_STATUSES])].map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="text-sm font-medium">Current stage<input aria-label="Current stage" value={stage} onChange={e => setStage(e.target.value)} maxLength={1000} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" placeholder="e.g. Revising pitch deck" /></label>
        <label className="text-sm font-medium sm:col-span-2">Next steps<textarea aria-label="Next steps" value={next} onChange={e => setNext(e.target.value)} maxLength={20000} rows={4} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" /></label>
      </div>
      <p className="mt-3 text-xs text-slate-500">This editor offers the six Active Development statuses. Use the project workflow for other statuses; moving outside these six removes the project from the dashboard.</p>
      <div className="mt-4 flex gap-3"><button type="submit" className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white">{busy ? 'Saving…' : 'Save dashboard fields'}</button><button type="button" onClick={reset} className="rounded border px-4 py-2 text-sm">Cancel</button></div>
    </fieldset></form> : <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[['Writers', savedNames(props.writers, props.writerIds)], ['Underlying IP', savedNames(props.properties, props.ipIds)], ['Status', label(props.status)], ['Current stage', props.currentStage?.trim() || 'Not recorded'], ['Next steps', props.nextAction?.trim() || 'Not recorded']].map(([term, value]) => <div key={term} className="min-w-0"><dt className="font-medium text-slate-500">{term}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>}
  </section>
}
