'use client'
import Link from 'next/link'
import { useState } from 'react'
import { TYPES, TYPE_LABELS, type DealType } from '@/lib/agreements/domain'
type Template = {
  id: string
  type: DealType
  versionLabel: string
  status: string
  name: string
  hash: string
  parentId: string | null
  updatedAt: string
  source: { reference: string; locator: string }
  decisions: {
    decision: string
    actorId: string
    at: string
    source: { reference: string; locator: string }
  }[]
}
const style = 'block w-full rounded-lg border p-2 text-sm'
export default function Templates({
  initial,
  canManage,
}: {
  initial: Template[]
  canManage: boolean
}) {
  const [rows, setRows] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedType, setSelectedType] = useState<DealType>('ASSIGNMENT')
  async function run(fn: () => Promise<Response>) {
    setBusy(true)
    setError('')
    try {
      const r = await fn()
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      const res = await fetch('/api/agreements/templates', {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Unable to refresh template catalog')
      setRows(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <Link href="/agreements" className="text-blue-700">
        ← Agreements
      </Link>
      <h1 className="text-3xl font-bold">Template versions</h1>
      <p className="text-slate-600">
        Only explicitly approved, business-classified versions can be selected
        for a deal. Uploading is not approval. No agreement text is generated or
        edited.
      </p>
      {error && (
        <p role="alert" className="text-red-700 bg-red-50 p-3 rounded">
          {error}
        </p>
      )}
      {!rows.length && (
        <p className="bg-amber-50 border rounded p-4">
          No approved template files are available. Manual draft records remain
          available without substitution.
        </p>
      )}
      {rows.map((t) => (
        <section
          key={t.id}
          className="bg-white border rounded-xl p-5 space-y-3"
        >
          <h2 className="font-semibold">
            {TYPE_LABELS[t.type]} · {t.versionLabel} · {t.status}
          </h2>
          <a
            className="text-blue-700 underline"
            href={'/api/agreements/templates/' + t.id}
          >
            {t.name}
          </a>
          <p className="break-all text-xs text-slate-500">
            SHA-256 {t.hash} · parent {t.parentId || 'original'}
          </p>
          <p className="text-sm">
            Source: {t.source.reference} · {t.source.locator}
          </p>
          {t.decisions.map((d, i) => (
            <p key={i} className="text-xs">
              {d.decision} · {d.actorId} · {d.at} · {d.source.reference} /{' '}
              {d.source.locator}
            </p>
          ))}
          {canManage && t.status !== 'RETIRED' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const f = new FormData(e.currentTarget)
                void run(() =>
                  fetch('/api/agreements/templates', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: t.id,
                      expectedVersion: t.updatedAt,
                      decision: t.status === 'DRAFT' ? 'APPROVED' : 'RETIRED',
                      source: {
                        reference: f.get('reference'),
                        locator: f.get('locator'),
                      },
                    }),
                  }),
                )
              }}
              className="grid sm:grid-cols-2 gap-3"
            >
              <label className="text-sm">
                Approval / retirement review source
                <input className={style} name="reference" required />
              </label>
              <label className="text-sm">
                Clause / message locator
                <input className={style} name="locator" required />
              </label>
              <button
                disabled={busy}
                className="bg-slate-900 text-white rounded p-2"
              >
                {t.status === 'DRAFT'
                  ? 'Approve this exact template version'
                  : 'Retire from future selection'}
              </button>
            </form>
          )}
        </section>
      ))}
      {canManage && (
        <section className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-lg">
            Upload a new immutable template version
          </h2>
          <p className="text-sm text-amber-900">
            Business-classified template files only. Do not upload advice,
            redlines, mixed privileged content or sensitive identifiers to this
            registry; use restricted Legal instead. Showrunner/shopping
            templates remain provisional until explicitly approved.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              void run(() =>
                fetch('/api/agreements/templates', { method: 'POST', body: f }),
              )
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              Agreement type
              <select
                aria-label="Agreement type"
                name="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DealType)}
                className={style}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Version label
              <input
                className={style}
                name="versionLabel"
                required
                maxLength={100}
              />
            </label>
            <label className="block text-sm">
              Parent version
              <select
                key={selectedType}
                aria-label="Parent version"
                className={style}
                name="parentId"
              >
                <option value="">Original version</option>
                {rows
                  .filter((t) => t.type === selectedType)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.versionLabel}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Template file
              <input
                name="file"
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                required
                className="block w-full"
              />
            </label>
            <label className="block text-sm">
              Source reference
              <input name="reference" required className={style} />
            </label>
            <label className="block text-sm">
              Page / clause / message locator
              <input name="locator" required className={style} />
            </label>
            <label className="block text-sm">
              <input
                type="checkbox"
                name="classification"
                value="BUSINESS"
                required
              />{' '}
              I confirm this file is business-only, with no privileged
              advice/redlines or sensitive identifiers.
            </label>
            <button
              disabled={busy}
              className="bg-blue-700 text-white rounded-lg px-4 py-2"
            >
              Upload draft version for separate approval
            </button>
          </form>
        </section>
      )}
    </main>
  )
}
