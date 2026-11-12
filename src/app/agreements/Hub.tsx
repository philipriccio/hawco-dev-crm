'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TYPES,
  TYPE_LABELS,
  STAGES,
  operativeTerms,
  resolveDate,
  paymentStatus,
  type Workspace,
} from '@/lib/agreements/domain'
type Data = {
  defaultProjectId?: string
  startNew?: boolean
  agreements: {
    id: string
    title: string
    status: string | null
    project: { id: string; title: string }
    workspace: Workspace | null
  }[]
  projects: { id: string; title: string }[]
  ips: { id: string; title: string }[]
  contacts: { id: string; name: string }[]
  templates: { id: string; type: string; versionLabel: string; hash: string }[]
}
export default function Hub({ data }: { data: Data }) {
  const router = useRouter()
  const [newType, setNewType] = useState('ASSIGNMENT')
  const [view, setView] = useState('All deals')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [stage, setStage] = useState('')
  const [drafts, setDrafts] = useState(false)
  const [creating, setCreating] = useState(Boolean(data.startNew))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const rows = data.agreements.filter(
    (a) =>
      (!q ||
        [
          a.title,
          a.project.title,
          a.workspace?.ballHolder,
          a.workspace?.nextAction,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!type || a.workspace?.type === type) &&
      (!stage || a.workspace?.stage === stage) &&
      (view !== 'Needs action' ||
        !a.workspace ||
        a.workspace.issues.some((i) => i.state === 'OPEN') ||
        !!a.workspace.nextAction ||
        a.workspace.checks.some((c) => c.state !== 'CONFIRMED')) &&
      (view !== 'Precedents' ||
        (a.workspace &&
          (drafts || a.workspace.stage === 'EXECUTED_COPY_FILED'))),
  )
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(e.currentTarget)
    try {
      const r = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classification: 'BUSINESS',
          title: f.get('title'),
          projectId: f.get('projectId'),
          type: f.get('type'),
          templateVersion: f.get('templateVersion') || null,
          ipIds: f.getAll('ipIds'),
          parties: [],
        }),
      })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      router.push('/agreements/' + b.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agreements</h1>
          <p className="text-slate-500">
            Deals, obligations and source-backed rights checks
          </p>
        </div>
        <button
          className="rounded-lg bg-slate-900 text-white px-4 py-2"
          onClick={() => setCreating(!creating)}
        >
          New deal
        </button>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm">
        {data.templates.length
          ? 'Select an exact approved template version, or create a manual draft.'
          : 'No approved template files are available. Draft records are manual;'}{' '}
        signed documents never automatically establish acquired rights or clear
        title.{' '}
        <Link href="/agreements/templates" className="underline text-blue-700">
          Template catalog & approvals
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {creating && (
        <form
          onSubmit={create}
          className="rounded-xl bg-white border p-5 space-y-3"
        >
          <h2 className="font-semibold">New manual draft</h2>
          <label className="block">
            Deal title
            <input
              name="title"
              required
              maxLength={300}
              className="block border rounded p-2 w-full"
            />
          </label>
          <label className="block">
            Agreement type
            <select
              aria-label="Agreement type"
              name="type"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="block border rounded p-2 w-full"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Template version
            <select
              aria-label="Template version"
              key={newType}
              name="templateVersion"
              className="block border rounded p-2 w-full"
            >
              <option value="">Manual draft — no template selected</option>
              {data.templates
                .filter((t) => t.type === newType)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.versionLabel} · approved · {t.hash.slice(0, 8)}
                  </option>
                ))}
            </select>
          </label>
          {!data.templates.some((t) => t.type === newType) && (
            <p className="text-amber-800 text-sm">
              Template unavailable for this type. No substitute will be
              selected.
            </p>
          )}
          <label className="block">
            Project
            <select
              aria-label="Project"
              name="projectId"
              defaultValue={data.defaultProjectId || ''}
              required
              className="block border rounded p-2 w-full"
            >
              <option value="">Choose project</option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Underlying IP (multiple permitted)</legend>
            <div className="max-h-40 overflow-auto">
              {data.ips.map((p) => (
                <label key={p.id} className="block">
                  <input type="checkbox" name="ipIds" value={p.id} /> {p.title}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-slate-500">
            Add parties and sourced type-specific terms on the next screen. Only
            business information belongs here; advice and sensitive identifiers
            go in restricted Legal.
          </p>
          <button
            disabled={busy}
            className="rounded bg-blue-700 text-white px-4 py-2"
          >
            {busy ? 'Creating…' : 'Create draft record'}
          </button>
        </form>
      )}
      <nav aria-label="Agreement views" className="flex flex-wrap gap-2">
        {['All deals', 'Needs action', 'Dates & payments', 'Precedents'].map(
          (v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-2 ${view === v ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}
            >
              {v}
            </button>
          ),
        )}
      </nav>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Search agreements"
          placeholder="Search deals, projects, next actions…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded-lg p-2 flex-1 min-w-0"
        />
        <select
          aria-label="Agreement type filter"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded-lg p-2 max-w-full"
        >
          <option value="">All agreement types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          aria-label="Stage filter"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="border rounded-lg p-2 max-w-full"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {view === 'Precedents' && (
        <div className="bg-white p-4 rounded-xl space-y-2">
          <p>
            Compare within the same agreement type. Verified executed copies by
            default; no current union rates are inferred.
          </p>
          <label>
            <input
              type="checkbox"
              checked={drafts}
              onChange={(e) => setDrafts(e.target.checked)}
            />{' '}
            Explicitly include unexecuted drafts
          </label>
          <p>
            <Link className="text-blue-700 underline" href="/union-cheat-sheet">
              WGC edition, articles and original rate sources
            </Link>
          </p>
          {!type && (
            <p className="text-amber-800">
              Select one agreement type to compare precedents.
            </p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl bg-white p-8 text-slate-500">
            No matching deals. Create a manual draft or change the filters.
          </p>
        )}
        {rows.map((a) => (
          <article
            key={a.id}
            className="rounded-xl border border-slate-200 bg-white p-5 min-w-0"
          >
            <div className="flex flex-wrap gap-3 justify-between">
              <div className="min-w-0">
                <Link
                  className="text-lg font-semibold text-blue-800 break-words"
                  href={'/agreements/' + a.id}
                >
                  {a.title}
                </Link>
                <p className="text-sm text-slate-500">
                  <Link href={'/projects/' + a.project.id}>
                    {a.project.title}
                  </Link>{' '}
                  ·{' '}
                  {a.workspace
                    ? TYPE_LABELS[a.workspace.type]
                    : 'Legacy record — type not reviewed'}
                </p>
              </div>
              <span className="text-xs bg-slate-100 rounded-full px-3 py-1 self-start">
                {a.workspace?.stage.replaceAll('_', ' ') ||
                  'UNREVIEWED LEGACY STATUS'}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <p>
                <span className="text-slate-500">Ball with </span>
                {a.workspace?.ballHolder || 'Unassigned'}
                <br />
                <span className="text-xs text-slate-400">
                  Since {a.workspace?.ballSince || 'unknown'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Next </span>
                {a.workspace?.nextAction || 'Review evidence and next action'}
              </p>
              <p className="text-amber-800">
                {a.workspace?.execution
                  ? 'Execution reviewed; title remains separate'
                  : 'Execution / conditions not verified'}
              </p>
            </div>
            {view === 'Dates & payments' && a.workspace && (
              <div className="mt-3 border-t pt-3 space-y-2">
                {a.workspace.dates.map((d) => (
                  <p key={d.id}>
                    {d.label}:{' '}
                    {resolveDate(d.id, a.workspace!.dates) ||
                      'Unresolved anchor / review needed'}{' '}
                    · {d.owner || 'No owner'} · {d.timezone}
                  </p>
                ))}
                {a.workspace.payments.map((p) => (
                  <p key={p.id}>
                    {p.label}: {p.money.amount || 'Unknown'} {p.money.currency}{' '}
                    · {paymentStatus(p)} · projected until evidenced paid
                  </p>
                ))}
                {!a.workspace.dates.length && !a.workspace.payments.length && (
                  <p className="text-slate-500">
                    No dated obligations or payments recorded.
                  </p>
                )}
              </div>
            )}
            {view === 'Precedents' && type && a.workspace && (
              <div className="mt-3 border-t pt-3 space-y-2">
                {(drafts ? a.workspace.terms : operativeTerms(a.workspace)).map(
                  (t) => (
                    <div key={t.id} className="text-sm break-words">
                      <strong>{t.field.replaceAll('_', ' ')}</strong> ·{' '}
                      {t.state} · {t.status}
                      <p>{t.text}</p>
                      {t.money && (
                        <p>
                          {Object.entries(t.money)
                            .filter(([, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      )}
                      {t.percentage && (
                        <p>
                          {t.percentage.rate}% · basis {t.percentage.basis} ·
                          definition {t.percentage.definition}
                        </p>
                      )}
                      {t.allocations?.map((a) => (
                        <p key={a.partyId}>
                          Share {a.share}% · basis {a.basis} ·{' '}
                          {a.source.reference} / {a.source.locator}
                        </p>
                      ))}
                      <p className="text-slate-500">
                        {t.source.reference} / {t.source.locator}
                      </p>
                    </div>
                  ),
                )}
                {a.workspace.periods.map((p) => (
                  <p key={p.id} className="text-sm">
                    {p.label} · {p.anchor} · {p.duration} ·{' '}
                    {p.fee.amount || 'unknown'} {p.fee.currency} · creditable{' '}
                    {p.creditable} · {p.prerequisites}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}
