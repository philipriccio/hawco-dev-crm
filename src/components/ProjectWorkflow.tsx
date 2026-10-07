'use client'
import { useState } from 'react'
import FollowUpWidget, { type FollowUpItem } from './FollowUpWidget'
interface Version { id: string; title: string; familyId: string | null; supersedesId: string | null; approvedAt: string | null; approvedBy: string | null; createdAt: string }
interface Release { status: string; evidence: string | null; reviewedBy: string | null; reviewedAt: string | null }
export default function ProjectWorkflow({ projectId, materials, release: initialRelease, followUps }: { projectId: string; materials: Version[]; release: Release; followUps: FollowUpItem[] }) {
  const [versions, setVersions] = useState(materials)
  const [release, setRelease] = useState(initialRelease)
  const [editing, setEditing] = useState<Version | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: React.FormEvent<HTMLFormElement>, kind: 'release' | 'versions') {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError('')
    const body = kind === 'release' ? { status: form.get('status'), evidence: form.get('evidence') } : { materialId: editing?.id, familyId: form.get('familyId'), supersedesId: form.get('supersedesId') || null, approved: form.get('approved') === 'on' }
    try {
      const response = await fetch(`/api/projects/${projectId}/${kind}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      if (kind === 'release') setRelease(data)
      else { setVersions(previous => previous.map(v => v.id === data.id ? data : (data.approvedAt && v.familyId === data.familyId ? { ...v, approvedAt: null, approvedBy: null } : v))); setEditing(null) }
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not save. Please retry.') } finally { setBusy(false) }
  }
  return <section className="mx-4 my-5 grid gap-5 xl:grid-cols-2" aria-label="Project actions and current materials">
    <FollowUpWidget projectId={projectId} initialFollowUps={followUps} />
    <div className="bg-white rounded-xl p-5 shadow-sm min-w-0">
      <h2 className="text-lg font-semibold">Current Materials & Versions</h2>
      <p className="text-sm text-slate-500 mt-1">Latest added is not necessarily approved. Approval is an explicit team decision.</p>
      {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
      <ul className="divide-y mt-3">{versions.map(v => {
        const latest = v.familyId && !versions.some(other => other.familyId === v.familyId && new Date(other.createdAt) > new Date(v.createdAt))
        return <li key={v.id} className="py-3 flex gap-3 items-start"><div className="min-w-0 flex-1"><a href={`/api/materials/${v.id}/download`} className="text-blue-700 break-words">{v.title}</a><p className="text-xs text-slate-600">{v.familyId || 'Unclassified family'}{latest ? ' · Latest added' : ''}{v.approvedAt ? ` · Current approved (${v.approvedBy})` : ''}{v.supersedesId ? ` · Supersedes ${versions.find(m => m.id === v.supersedesId)?.title || 'earlier draft'}` : ''}</p></div><button className="text-sm text-blue-700" onClick={() => setEditing(v)}>Classify</button></li>
      })}</ul>{!versions.length && <p className="mt-3 text-sm text-slate-500">No materials linked yet.</p>}
      {editing && <form onSubmit={e => save(e, 'versions')} key={editing.id} className="grid gap-3 border-t pt-3">
        <h3 className="font-medium">Classify {editing.title}</h3>
        <label className="text-sm">Document family<input required name="familyId" maxLength={120} defaultValue={editing.familyId || ''} placeholder="e.g. Pilot script" list={`families-${projectId}`} className="block w-full border rounded p-2" /></label>
        <datalist id={`families-${projectId}`}>{Array.from(new Set(versions.map(v => v.familyId).filter(Boolean))).map(f => <option key={f} value={f!} />)}</datalist>
        <label className="text-sm">Supersedes<select name="supersedesId" defaultValue={editing.supersedesId || ''} className="block w-full border rounded p-2"><option value="">No earlier version</option>{versions.filter(v => v.id !== editing.id).map(v => <option key={v.id} value={v.id}>{v.title} — {v.familyId || 'Unclassified'}</option>)}</select></label>
        <label className="text-sm flex gap-2"><input type="checkbox" name="approved" defaultChecked={!!editing.approvedAt} />Set as current approved version for this family</label>
        <div className="flex gap-3"><button disabled={busy} className="bg-blue-700 text-white rounded px-3 py-2">{busy ? 'Saving…' : 'Save Version'}</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></div>
      </form>}
      <details className="mt-5 border-t pt-4"><summary className="font-medium cursor-pointer">Submission Release · {release.status.replaceAll('_', ' ').toLowerCase()}</summary>
        <p className="text-sm text-slate-500 my-2">Record the evidence and review outcome. This tracking status does not make a legal determination or block reading.</p>
        {release.reviewedBy && <p className="text-xs text-slate-500">Last reviewed by {release.reviewedBy}{release.reviewedAt ? ` · ${new Date(release.reviewedAt).toLocaleDateString()}` : ''}</p>}
        <form onSubmit={e => save(e, 'release')} className="grid gap-3 mt-3">
          <label className="text-sm">Release status<select name="status" defaultValue={release.status} className="block w-full border rounded p-2">{['MISSING','RECEIVED','NEEDS_REVIEW','VALID','NOT_REQUIRED'].map(status => <option key={status} value={status}>{status.replaceAll('_',' ').toLowerCase()}</option>)}</select></label>
          <label className="text-sm">Evidence / reason<textarea name="evidence" maxLength={5000} defaultValue={release.evidence || ''} placeholder="Linked release, source thread, or reason it is not required" className="block w-full border rounded p-2" /></label>
          <button disabled={busy} className="rounded bg-blue-700 px-3 py-2 text-white">{busy ? 'Saving…' : 'Save Release Review'}</button>
        </form>
      </details>
    </div>
  </section>
}
