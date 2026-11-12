'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  COMMON_FIELDS,
  TYPES,
  TYPE_LABELS,
  TYPE_FIELDS,
  STAGES,
  emptyMoney,
  resolveDate,
  paymentStatus,
  executionBlockers,
  operativeTerms,
  type Money,
  type Source,
} from '@/lib/agreements/domain'
import { intakeText } from '@/lib/agreements/intake'
import type { getDeal } from '@/lib/agreements/service'
type Deal = Awaited<ReturnType<typeof getDeal>>
type Choice = { id: string; title: string; status: string; updatedAt: string }
const inputClass =
  'block w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm'
function human(s: string) {
  return s.replaceAll('_', ' ').toLowerCase()
}
function text(f: FormData, k: string) {
  return String(f.get(k) || '').trim()
}
function source(f: FormData, p = ''): Source {
  return {
    reference: text(f, p + 'reference'),
    locator: text(f, p + 'locator'),
  }
}
function money(f: FormData, p = ''): Money {
  return Object.fromEntries(
    Object.keys(emptyMoney()).map((k) => [k, text(f, p + k)]),
  ) as Money
}
function Field({
  name,
  label,
  value = '',
  type = 'text',
  required = false,
}: {
  name: string
  label: string
  value?: string | number
  type?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        className={inputClass}
      />
    </label>
  )
}
function Area({
  name,
  label,
  value = '',
}: {
  name: string
  label: string
  value?: string
}) {
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <textarea
        name={name}
        defaultValue={value}
        rows={3}
        className={inputClass}
      />
    </label>
  )
}
function Select({
  name,
  label,
  options,
  value,
}: {
  name: string
  label: string
  options: (string | { value: string; label: string })[]
  value?: string
}) {
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <select
        aria-label={label}
        name={name}
        defaultValue={value}
        className={inputClass}
      >
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {human(o)}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </label>
  )
}
function Evidence({
  prefix = '',
  label = 'Source evidence',
}: {
  prefix?: string
  label?: string
}) {
  return (
    <fieldset className="rounded-lg bg-slate-50 p-3 grid gap-2 sm:grid-cols-2">
      <legend className="text-xs text-slate-600">{label}</legend>
      <Field
        name={prefix + 'reference'}
        label="Document / thread / message reference"
      />
      <Field
        name={prefix + 'locator'}
        label="Page, clause or message locator"
      />
    </fieldset>
  )
}
function MoneyFields() {
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Structured money, formula or percentage
      </summary>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        {Object.keys(emptyMoney()).map((k) => (
          <Field
            key={k}
            name={k}
            label={
              (
                {
                  amount: 'Amount (blank = unknown; 0 = explicit zero)',
                  currency: 'Currency (CAD, USD…)',
                  tax: 'Tax treatment',
                  basis: 'Basis / percentage definition',
                  exclusions: 'Budget exclusions',
                  floor: 'Floor',
                  cap: 'Cap',
                  credits: 'Credits / offsets',
                  formula: 'Formula source text',
                  inputs: 'Formula inputs',
                  currencyRule: 'Conditional currency rule',
                } as Record<string, string>
              )[k]
            }
          />
        ))}
      </div>
    </details>
  )
}
function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 min-w-0">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}
function Display({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1 break-words min-w-0">
      {children}
    </div>
  )
}
function Citation({ s }: { s: Source }) {
  return (
    <p className="text-xs text-slate-500">
      Source: {s.reference || 'Unknown'} · {s.locator || 'No locator'}
    </p>
  )
}
function Button({
  children,
  busy,
}: {
  children: React.ReactNode
  busy: boolean
}) {
  return (
    <button
      disabled={busy}
      className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm disabled:opacity-50"
    >
      {busy ? 'Saving…' : children}
    </button>
  )
}
export default function Detail({
  initial,
  canLegal,
  ips,
  contacts,
  templates,
}: {
  initial: Deal
  canLegal: boolean
  ips: Choice[]
  contacts: { id: string; name: string }[]
  templates: { id: string; type: string; versionLabel: string; hash: string }[]
}) {
  const [deal, setDeal] = useState(initial)
  const [tab, setTab] = useState('Overview')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [legal, setLegal] = useState<
    {
      id: string
      kind: string
      name: string
      body: string
      mimeType: string | null
      hash: string | null
      createdAt: string
    }[]
  >([])
  const [exportData, setExportData] = useState<string | null>(null)
  const [partyEdit, setPartyEdit] = useState('')
  const [issueEdit, setIssueEdit] = useState('')
  const [dateEdit, setDateEdit] = useState('')
  const [paymentEdit, setPaymentEdit] = useState('')
  const id = deal.legacy.id
  const w = deal.workspace
  const base = '/api/agreements/' + id
  async function refresh() {
    const r = await fetch(base, { cache: 'no-store' })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error)
    setDeal(d)
  }
  async function request(path: string, body: unknown, method = 'POST') {
    const r = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const b = await r.json()
    if (!r.ok) throw new Error(b.error)
    return b
  }
  async function perform(
    fn: () => Promise<unknown>,
    message = 'Saved. Evidence and prior history retained.',
  ) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await fn()
      await refresh()
      setSuccess(message)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function mutate(action: string, value: unknown, type?: string) {
    return request(
      base,
      {
        action,
        value,
        type,
        version: deal.version,
        classification: 'BUSINESS',
      },
      'PATCH',
    )
  }
  function submit(fn: (f: FormData) => Promise<unknown>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const f = new FormData(e.currentTarget)
      void perform(() => fn(f))
    }
  }

  async function loadLegal() {
    setTab('Legal')
    await perform(async () => {
      const r = await fetch(base + '/legal', { cache: 'no-store' })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      setLegal(b)
    }, 'Restricted records loaded.')
  }
  const editedParty = w?.parties.find((p) => p.id === partyEdit)
  const editedIssue = w?.issues.find((i) => i.id === issueEdit)
  const editedDate = w?.dates.find((d) => d.id === dateEdit)
  const editedPayment = w?.payments.find((p) => p.id === paymentEdit)
  return (
    <main className="p-4 md:p-8 space-y-5 max-w-6xl mx-auto">
      <Link href="/agreements" className="text-sm text-blue-700">
        ← All agreements
      </Link>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold break-words">
          {deal.legacy.title}
        </h1>
        <p className="text-slate-500">
          <Link href={'/projects/' + deal.legacy.project.id}>
            {deal.legacy.project.title}
          </Link>{' '}
          · {w ? TYPE_LABELS[w.type] : 'Legacy type unreviewed'} · version{' '}
          {deal.version}
        </p>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        {w?.templateVersion
          ? 'Selected approved template lineage retained; terms still require individual review.'
          : 'No template selected — manual record only.'}{' '}
        Business tabs must not contain advice, mixed/redline text or sensitive
        identifiers. Legal access is restricted to the two explicitly configured
        principals.
      </div>
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 rounded p-3 text-red-800"
        >
          {error}
        </div>
      )}
      {success && (
        <p role="status" className="text-sm text-emerald-800">
          {success}
        </p>
      )}
      {!w ? (
        <Panel title="Review legacy record">
          <p>
            Legacy status: <strong>{deal.legacy.status || 'unknown'}</strong>.
            No stage, signatures, operative terms or rights are inferred.
          </p>
          <p className="whitespace-pre-wrap">{deal.legacy.notes}</p>
          <form
            onSubmit={submit((f) =>
              mutate('initialize', null, text(f, 'type')),
            )}
            className="space-y-3"
          >
            <Select
              name="type"
              label="Confirm agreement type"
              options={TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            />
            <Button busy={busy}>
              Initialize workspace without changing legacy evidence
            </Button>
          </form>
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-200 px-3 py-1">
              {human(w.stage)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Ball: {w.ballHolder || 'unassigned'} · since{' '}
              {w.ballSince || 'unknown'}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1">
              Title is never automatically cleared
            </span>
          </div>
          <nav aria-label="Agreement detail" className="flex flex-wrap gap-2">
            {[
              'Overview',
              'Terms',
              'Negotiation',
              'Documents',
              'Rights checks',
              'Dates & payments',
              'Legal',
            ].map((t) => (
              <button
                key={t}
                onClick={() => (t === 'Legal' ? void loadLegal() : setTab(t))}
                className={`px-3 py-2 rounded-lg text-sm ${tab === t ? 'bg-slate-900 text-white' : 'bg-white border'}`}
              >
                {t}
                {t === 'Legal' ? ' · restricted' : ''}
              </button>
            ))}
          </nav>
          {tab === 'Overview' && (
            <div className="space-y-5">
              <Panel title="Template lineage">
                <p className="text-sm">
                  {w.templateVersion
                    ? 'Selected version: ' + w.templateVersion
                    : 'Template unavailable / not selected; manual draft'}
                </p>
                {w.templateLineage?.map((t, i) => (
                  <Display key={i}>
                    <a
                      href={'/api/agreements/templates/' + t.id}
                      className="text-blue-700 underline"
                    >
                      {t.versionLabel}
                    </a>
                    <p className="text-xs break-all">
                      {t.hash} · selected {t.selectedAt}
                    </p>
                  </Display>
                ))}
                {templates.some((t) => t.type === w.type) ? (
                  <form
                    onSubmit={submit((f) =>
                      mutate('template', text(f, 'templateVersion')),
                    )}
                    className="space-y-3"
                  >
                    <Select
                      name="templateVersion"
                      label="Select exact approved version"
                      options={[
                        { value: '', label: 'Choose approved version' },
                        ...templates
                          .filter((t) => t.type === w.type)
                          .map((t) => ({
                            value: t.id,
                            label: t.versionLabel + ' · ' + t.hash.slice(0, 8),
                          })),
                      ]}
                    />
                    <Button busy={busy}>Record template selection</Button>
                  </form>
                ) : (
                  <p className="text-sm text-amber-800">
                    No approved template is currently available for this type.
                    No substitute will be selected.
                  </p>
                )}
                <Link
                  className="text-blue-700 underline text-sm"
                  href="/agreements/templates"
                >
                  Template catalog / approval
                </Link>
              </Panel>
              <Panel title="Ownership & next action">
                <form
                  key={deal.version}
                  onSubmit={submit((f) =>
                    mutate('overview', {
                      ballHolder: text(f, 'ballHolder'),
                      ballSince: text(f, 'ballSince'),
                      nextAction: text(f, 'nextAction'),
                      businessNotes: text(f, 'businessNotes'),
                      ipIds: f.getAll('ipIds'),
                      leadDays: text(f, 'leadDays')
                        .split(',')
                        .map((n) => Number(n.trim())),
                    }),
                  )}
                  className="space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      name="ballHolder"
                      label="Ball holder"
                      value={w.ballHolder}
                    />
                    <Field
                      name="ballSince"
                      label="Since"
                      type="date"
                      value={w.ballSince}
                    />
                  </div>
                  <Field
                    name="nextAction"
                    label="Next action"
                    value={w.nextAction}
                  />
                  <Area
                    name="businessNotes"
                    label="Business notes only"
                    value={w.businessNotes}
                  />
                  <fieldset>
                    <legend className="text-sm">Linked IP works</legend>
                    {ips.map((ip) => (
                      <label className="block text-sm" key={ip.id}>
                        <input
                          name="ipIds"
                          type="checkbox"
                          value={ip.id}
                          defaultChecked={w.ipIds.includes(ip.id)}
                        />{' '}
                        <Link href={'/ip/' + ip.id}>{ip.title}</Link>
                      </label>
                    ))}
                  </fieldset>
                  <Field
                    name="leadDays"
                    label="In-app reminder lead days (comma separated)"
                    value={w.leadDays.join(',')}
                  />
                  <Button busy={busy}>Save business overview</Button>
                </form>
              </Panel>
              <Panel title="Parties, roles & signature requirements">
                {w.parties.map((p) => (
                  <Display key={p.id}>
                    <strong>{p.name}</strong> · {p.role} ·{' '}
                    {p.requiredSignature
                      ? 'Signature required'
                      : 'No signature requirement recorded'}
                    <p>
                      {[
                        p.loanOut && `Loan-out: ${p.loanOut}`,
                        p.agent && `Agent: ${p.agent}`,
                        p.lawyer && `Lawyer: ${p.lawyer}`,
                        p.payee && `Payee: ${p.payee}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {p.contactId && (
                      <Link
                        className="text-blue-700"
                        href={'/contacts/' + p.contactId}
                      >
                        Linked contact
                      </Link>
                    )}{' '}
                    <button
                      type="button"
                      className="text-blue-700 underline"
                      onClick={() => setPartyEdit(p.id)}
                    >
                      Edit party
                    </button>
                  </Display>
                ))}
                <form
                  key={partyEdit + deal.version}
                  onSubmit={submit((f) =>
                    mutate('overview', {
                      parties: [
                        ...w.parties.filter((p) => p.id !== partyEdit),
                        {
                          id: partyEdit || crypto.randomUUID(),
                          name: text(f, 'name'),
                          role: text(f, 'role'),
                          contactId: text(f, 'contactId'),
                          loanOut: text(f, 'loanOut'),
                          agent: text(f, 'agent'),
                          lawyer: text(f, 'lawyer'),
                          payee: text(f, 'payee'),
                          requiredSignature:
                            f.get('requiredSignature') === 'on',
                        },
                      ],
                    }),
                  )}
                  className="space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      name="name"
                      label="Party / legal name"
                      value={editedParty?.name}
                      required
                    />
                    <Field
                      name="role"
                      label="Role (assignor, assignee, co-owner…)"
                      value={editedParty?.role}
                      required
                    />
                    <Select
                      name="contactId"
                      label="Contact link"
                      value={editedParty?.contactId}
                      options={[
                        { value: '', label: 'No contact link' },
                        ...contacts.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                    />
                    {['loanOut', 'agent', 'lawyer', 'payee'].map((k) => (
                      <Field
                        key={k}
                        name={k}
                        label={k}
                        value={editedParty?.[k as 'loanOut']}
                      />
                    ))}
                  </div>
                  <label className="text-sm">
                    <input
                      name="requiredSignature"
                      type="checkbox"
                      defaultChecked={editedParty?.requiredSignature}
                    />{' '}
                    Required signatory (capacity recorded in sourced terms)
                  </label>
                  <div>
                    <Button busy={busy}>
                      {partyEdit ? 'Save party revision' : 'Add party'}
                    </Button>
                    {partyEdit && (
                      <button
                        type="button"
                        className="ml-3 underline text-sm"
                        onClick={() => setPartyEdit('')}
                      >
                        Add another party
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Party changes require execution review again; return a filed
                    deal to lawyer review before revising signatories.
                  </p>
                </form>
              </Panel>
              <Panel title="Internal approval — independent of negotiation">
                <p className="text-sm">
                  {w.approval.decision} · {w.approval.actorId || 'No actor'} ·{' '}
                  {w.approval.at || 'No time'}
                </p>
                <Citation s={w.approval.source} />
                {canLegal ? (
                  <form
                    onSubmit={submit((f) =>
                      mutate('approval', {
                        decision: text(f, 'decision'),
                        source: source(f),
                      }),
                    )}
                    className="space-y-3"
                  >
                    <Select
                      name="decision"
                      label="Decision"
                      options={['APPROVED', 'DECLINED']}
                    />
                    <Evidence />
                    <Button busy={busy}>Record approval decision</Button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-500">
                    Only an explicitly authorized principal can record internal
                    approval.
                  </p>
                )}
              </Panel>
              <Panel title="Business-only lawyer intake">
                <p className="text-sm">
                  Preview excludes all restricted content, private files and
                  unclassified legacy attachments. Nothing is emailed.
                </p>
                <button
                  disabled={busy}
                  className="text-blue-700 underline"
                  onClick={() =>
                    void perform(async () => {
                      const b = await request(base + '/actions', {
                        action: 'export',
                      })
                      setExportData(intakeText(b))
                    }, 'Business-only preview prepared. Nothing was sent.')
                  }
                >
                  Preview business intake
                </button>
                {exportData && (
                  <>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs bg-slate-50 p-3">
                      {exportData}
                    </pre>
                    <button
                      className="rounded bg-slate-800 text-white px-4 py-2"
                      onClick={() => {
                        const url = URL.createObjectURL(
                          new Blob([exportData], {
                            type: 'text/plain;charset=utf-8',
                          }),
                        )
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'business-intake.txt'
                        a.click()
                        setTimeout(() => URL.revokeObjectURL(url), 1000)
                      }}
                    >
                      Download reviewed preview
                    </button>
                  </>
                )}
              </Panel>
            </div>
          )}
          {tab === 'Terms' && (
            <div className="space-y-5">
              <Panel title="Sourced terms">
                <p className="text-sm text-slate-500">
                  {operativeTerms(w).length} operative terms. Proposals remain
                  separate. Amendments name the specific prior term they
                  supersede; prior records are retained.
                </p>
                {w.terms.map((t) => (
                  <Display key={t.id}>
                    <strong>{human(t.field)}</strong> · {t.state} · {t.status}
                    <p>{t.text || 'No narrative value'}</p>
                    {t.money && (
                      <p>
                        {Object.entries(t.money)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${human(k)}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                    {t.percentage && (
                      <p>
                        {t.percentage.rate}% of {t.percentage.basis} ·{' '}
                        {t.percentage.definition}
                      </p>
                    )}
                    {t.allocations?.map((a) => (
                      <p key={a.partyId}>
                        {w.parties.find((p) => p.id === a.partyId)?.name}:{' '}
                        {a.share}% · {a.basis}
                      </p>
                    ))}
                    {t.field.includes('ipa') && (
                      <Link
                        className="text-blue-700 underline"
                        href={
                          '/union-cheat-sheet?q=' +
                          encodeURIComponent(t.text.slice(0, 160))
                        }
                      >
                        Check cited WGC edition / article in source library
                      </Link>
                    )}
                    <Citation s={t.source} />
                    <p className="text-xs text-slate-400">
                      {t.createdAt} · {t.actorId}
                      {t.supersedes ? ` · supersedes ${t.supersedes}` : ''}
                    </p>
                  </Display>
                ))}
                <form
                  onSubmit={submit((f) =>
                    mutate('term', {
                      field: text(f, 'field'),
                      state: text(f, 'state'),
                      status: text(f, 'status'),
                      text: text(f, 'value'),
                      ...(Object.values(money(f)).some(Boolean)
                        ? { money: money(f) }
                        : {}),
                      ...(text(f, 'percentageRate')
                        ? {
                            percentage: {
                              rate: text(f, 'percentageRate'),
                              basis: text(f, 'percentageBasis'),
                              definition: text(f, 'percentageDefinition'),
                            },
                          }
                        : {}),
                      ...(w.parties.some((p) => text(f, 'share' + p.id))
                        ? {
                            allocations: w.parties
                              .filter((p) => text(f, 'share' + p.id))
                              .map((p) => ({
                                partyId: p.id,
                                share: text(f, 'share' + p.id),
                                basis: text(f, 'shareBasis' + p.id),
                                source: source(f),
                              })),
                          }
                        : {}),
                      source: source(f),
                      supersedes: text(f, 'supersedes') || undefined,
                    }),
                  )}
                  className="space-y-3"
                >
                  <Select
                    name="field"
                    label="Type-specific term"
                    options={[...COMMON_FIELDS, ...TYPE_FIELDS[w.type]]}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      name="state"
                      label="Value state"
                      options={[
                        'UNKNOWN',
                        'KNOWN',
                        'ZERO',
                        'NOT_APPLICABLE',
                        'NOT_AGREED',
                      ]}
                    />
                    <Select
                      name="status"
                      label="Negotiation status"
                      options={['PROPOSED', 'AGREED', 'EXECUTED']}
                    />
                  </div>
                  <Area
                    name="value"
                    label="Exact term / scope / definition (business only)"
                  />
                  <MoneyFields />
                  <details className="border rounded-lg p-3">
                    <summary>Percentage and co-owner allocations</summary>
                    <div className="space-y-3 mt-3">
                      <Field
                        name="percentageRate"
                        label="Percentage rate (0–100)"
                      />
                      <Field name="percentageBasis" label="Percentage basis" />
                      <Field
                        name="percentageDefinition"
                        label="Full percentage definition"
                      />
                      {w.parties.map((p) => (
                        <fieldset className="border p-2 rounded" key={p.id}>
                          <legend>{p.name}</legend>
                          <Field
                            name={'share' + p.id}
                            label="Allocation share % (blank if not applicable)"
                          />
                          <Field
                            name={'shareBasis' + p.id}
                            label="Allocation basis / definition"
                          />
                        </fieldset>
                      ))}
                    </div>
                  </details>
                  <Evidence />
                  <Select
                    name="supersedes"
                    label="Amends / supersedes this prior term"
                    options={[
                      { value: '', label: 'No prior term' },
                      ...w.terms.map((t) => ({
                        value: t.id,
                        label: `${human(t.field)} — ${t.status} — ${t.text.slice(0, 50)}`,
                      })),
                    ]}
                  />
                  <Button busy={busy}>Add immutable term</Button>
                </form>
              </Panel>
              <Panel title="Repeatable option / extension periods">
                {w.periods.map((p) => (
                  <Display key={p.id}>
                    <strong>{p.label}</strong>
                    <p>
                      Start: {p.anchor || 'unknown'} · duration{' '}
                      {p.duration || 'unknown'} · creditable {p.creditable}
                    </p>
                    <p>
                      {Object.entries(p.fee)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                    <p>
                      Notice/payment prerequisites:{' '}
                      {p.prerequisites || 'unknown'}
                    </p>
                    <p>
                      Automatic extensions / limits:{' '}
                      {p.automaticExtension || 'unknown'}
                    </p>
                    <Citation s={p.source} />
                  </Display>
                ))}
                <form
                  onSubmit={submit((f) =>
                    mutate('period', {
                      id: '',
                      label: text(f, 'label'),
                      anchor: text(f, 'anchor'),
                      duration: text(f, 'duration'),
                      fee: money(f),
                      creditable: text(f, 'creditable'),
                      prerequisites: text(f, 'prerequisites'),
                      automaticExtension: text(f, 'automaticExtension'),
                      source: source(f),
                    }),
                  )}
                  className="space-y-3"
                >
                  <Field
                    name="label"
                    label="Period label (first, second, third, extension…)"
                    required
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      name="anchor"
                      label="Start anchor / triggering event"
                    />
                    <Field name="duration" label="Exact duration" />
                  </div>
                  <MoneyFields />
                  <Select
                    name="creditable"
                    label="Fee creditability"
                    options={['UNKNOWN', 'YES', 'NO']}
                  />
                  <Area
                    name="prerequisites"
                    label="Notice, payment and exercise prerequisites"
                  />
                  <Area
                    name="automaticExtension"
                    label="Automatic extensions and limits"
                  />
                  <Evidence />
                  <Button busy={busy}>Add period</Button>
                </form>
              </Panel>
              <Panel title="Stage a cited business backfill">
                <p className="text-sm">
                  A proposal never changes the record until an authorized
                  reviewer applies it. Import one bounded, cited term at a time
                  here; API supports batches up to 100.
                </p>
                <form
                  onSubmit={submit((f) =>
                    request(base + '/actions', {
                      action: 'import',
                      classification: 'BUSINESS',
                      requestId: text(f, 'requestId'),
                      version: deal.version,
                      terms: [
                        {
                          field: text(f, 'field'),
                          state: text(f, 'state'),
                          status: 'PROPOSED',
                          text: text(f, 'value'),
                          source: source(f),
                        },
                      ],
                    }),
                  )}
                  className="space-y-3"
                >
                  <Field
                    name="requestId"
                    label="Stable import request reference (16–80 letters, digits, _ or -)"
                    required
                  />
                  <Select
                    name="field"
                    label="Term"
                    options={[...COMMON_FIELDS, ...TYPE_FIELDS[w.type]]}
                  />
                  <Select
                    name="state"
                    label="Value state"
                    options={[
                      'KNOWN',
                      'ZERO',
                      'NOT_APPLICABLE',
                      'NOT_AGREED',
                      'UNKNOWN',
                    ]}
                  />
                  <Area name="value" label="Proposed value" />
                  <Evidence />
                  <Button busy={busy}>Stage for review</Button>
                </form>
                {deal.imports.map((p) => (
                  <Display key={p.id}>
                    <strong>{p.state}</strong> · expected version{' '}
                    {p.expectedVersion}
                    <pre className="whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(p.data, null, 2)}
                    </pre>
                    {canLegal && p.state === 'STAGED' && (
                      <button
                        disabled={busy}
                        className="text-blue-700 underline"
                        onClick={() =>
                          void perform(() => mutate('applyImport', p.id))
                        }
                      >
                        Review and apply this proposal
                      </button>
                    )}
                  </Display>
                ))}
              </Panel>
            </div>
          )}
          {tab === 'Negotiation' && (
            <div className="space-y-5">
              <Panel title="Explicit negotiation stage">
                <form
                  onSubmit={submit((f) =>
                    mutate('stage', {
                      stage: text(f, 'stage'),
                      source: source(f),
                    }),
                  )}
                  className="space-y-3"
                >
                  <Select
                    name="stage"
                    label="Stage (returning to an earlier stage preserves history)"
                    options={[...STAGES]}
                    value={w.stage}
                  />
                  <Evidence />
                  <Button busy={busy}>Record stage change</Button>
                </form>
              </Panel>
              <Panel title="Issues, asks and counters">
                {w.issues.map((i) => (
                  <Display key={i.id}>
                    <strong>{i.title}</strong> · {i.state}
                    <p>Ask: {i.ask}</p>
                    <p>Counter: {i.counter}</p>
                    <p>Current: {i.current}</p>
                    <p>Outcome: {i.outcome || 'unresolved'}</p>
                    <Citation s={i.source} />
                    <p className="text-xs">
                      {i.history
                        .map((h) => `${h.at}: ${h.state} ${h.outcome}`)
                        .join(' → ')}
                    </p>
                    <button
                      className="text-blue-700 underline"
                      onClick={() => setIssueEdit(i.id)}
                    >
                      Update / reopen
                    </button>
                  </Display>
                ))}
                <form
                  key={issueEdit + deal.version}
                  onSubmit={submit((f) =>
                    mutate('issue', {
                      id: issueEdit,
                      title: text(f, 'title'),
                      ask: text(f, 'ask'),
                      counter: text(f, 'counter'),
                      current: text(f, 'current'),
                      outcome: text(f, 'outcome'),
                      state: text(f, 'state'),
                      source: source(f),
                    }),
                  )}
                  className="space-y-3"
                >
                  <Field
                    name="title"
                    label={issueEdit ? 'Update issue' : 'New issue'}
                    value={editedIssue?.title}
                    required
                  />
                  {['ask', 'counter', 'current', 'outcome'].map((k) => (
                    <Area
                      key={k}
                      name={k}
                      label={human(k)}
                      value={editedIssue?.[k as 'ask']}
                    />
                  ))}
                  <Select
                    name="state"
                    label="Resolution"
                    options={['OPEN', 'RESOLVED']}
                    value={editedIssue?.state}
                  />
                  <Evidence />
                  <Button busy={busy}>
                    {issueEdit ? 'Save issue revision' : 'Add issue'}
                  </Button>
                  {issueEdit && (
                    <button
                      type="button"
                      className="ml-3 text-sm underline"
                      onClick={() => setIssueEdit('')}
                    >
                      Start another issue
                    </button>
                  )}
                </form>
              </Panel>
              <Panel title="Immutable business history">
                {deal.events.map((e) => (
                  <details key={e.id} className="border-b pb-2">
                    <summary className="cursor-pointer text-sm">
                      Version {e.version} · {human(e.action)} ·{' '}
                      {String(e.createdAt)} · {e.actorId}
                    </summary>
                    <pre className="whitespace-pre-wrap break-all text-xs max-h-80 overflow-auto p-2">
                      {JSON.stringify(e.data, null, 2)}
                    </pre>
                  </details>
                ))}
              </Panel>
            </div>
          )}
          {tab === 'Documents' && (
            <div className="space-y-5">
              <Panel title="Immutable document versions">
                {deal.legacy.fileUrl && (
                  <Display>
                    <strong>
                      Preserved legacy attachment (classification unreviewed)
                    </strong>
                    <p>{deal.legacy.fileName}</p>
                    <a
                      href={deal.legacy.fileUrl}
                      className="text-blue-700 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Existing attachment reference
                    </a>
                    <p>
                      Not treated as executed or used as a precedent without
                      review.
                    </p>
                  </Display>
                )}
                {deal.documents.map((d) => (
                  <Display key={d.id}>
                    <a
                      href={`${base}/documents/${d.id}`}
                      className="text-blue-700 underline"
                    >
                      {d.name}
                    </a>
                    <p>
                      {d.classification} · {d.source}
                    </p>
                    <p className="text-xs break-all">SHA-256 {d.hash}</p>
                    <p className="text-xs">
                      Parent: {d.parentId || 'original'} · {String(d.createdAt)}
                    </p>
                  </Display>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const f = new FormData(e.currentTarget)
                    void perform(async () => {
                      const r = await fetch(base + '/documents', {
                        method: 'POST',
                        body: f,
                      })
                      const b = await r.json()
                      if (!r.ok) throw new Error(b.error)
                    })
                  }}
                  className="space-y-3"
                >
                  <Select
                    name="classification"
                    label="Classify before storing"
                    options={[
                      'RESTRICTED',
                      'MIXED',
                      'REDLINE',
                      'ADVICE',
                      'BUSINESS',
                    ]}
                  />
                  <p className="text-xs text-slate-500">
                    Mixed, redline and advice are always restricted. Only an
                    explicitly authorized principal can upload or read them;
                    they never appear in business exports.
                  </p>
                  <input
                    aria-label="Agreement file"
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.txt,.doc,.docx"
                    className="block w-full text-sm"
                  />
                  <Field
                    name="source"
                    label="Source document / message reference"
                    required
                  />
                  <Select
                    name="parentId"
                    label="Version lineage (business documents)"
                    options={[
                      { value: '', label: 'Original version' },
                      ...deal.documents.map((d) => ({
                        value: d.id,
                        label: d.name,
                      })),
                    ]}
                  />
                  <Button busy={busy}>
                    Store classified immutable version
                  </Button>
                </form>
              </Panel>
              <Panel title="Executed-copy review">
                <p className="text-sm">
                  Choosing a file alone does not establish execution. All
                  required signatures, effective basis and conditions must be
                  evidenced.
                </p>
                <ul className="list-disc pl-5 text-sm text-amber-800">
                  {executionBlockers(w).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <form
                  onSubmit={submit((f) =>
                    mutate('execution', {
                      documentId: text(f, 'documentId'),
                      signatures: w.parties
                        .filter((p) => p.requiredSignature)
                        .map((p) => ({
                          partyId: p.id,
                          source: source(f, p.id),
                        })),
                      effectiveBasis: source(f, 'effective'),
                      conditions: text(f, 'conditions'),
                      conditionEvidence: source(f, 'conditions'),
                    }),
                  )}
                  className="space-y-3"
                >
                  <Select
                    name="documentId"
                    label="Business-classified fully executed copy"
                    options={[
                      { value: '', label: 'Choose exact version' },
                      ...deal.documents.map((d) => ({
                        value: d.id,
                        label: d.name + ' · ' + d.hash.slice(0, 8),
                      })),
                    ]}
                  />
                  {w.parties
                    .filter((p) => p.requiredSignature)
                    .map((p) => (
                      <Evidence
                        key={p.id}
                        prefix={p.id}
                        label={'Signature: ' + p.name + ' / ' + p.role}
                      />
                    ))}
                  <Evidence prefix="effective" label="Effective-date basis" />
                  <Select
                    name="conditions"
                    label="Conditions precedent review"
                    options={['UNKNOWN', 'OPEN', 'SATISFIED']}
                  />
                  <Evidence
                    prefix="conditions"
                    label="Reviewed condition satisfaction / not-applicable evidence"
                  />
                  <Button busy={busy}>Record execution review</Button>
                </form>
              </Panel>
            </div>
          )}
          {tab === 'Rights checks' && (
            <div className="space-y-5">
              <Panel title="Chain-of-title checklist">
                <p className="text-sm">
                  Unknown is not clear. Confirm each title, ownership,
                  reservation and supporting-document check with evidence. The
                  IP chain-of-title status is never automatically changed.
                </p>
                {w.checks.map((c) => (
                  <Display key={c.id}>
                    <strong>{c.label}</strong> · {c.state}
                    <Citation s={c.source} />
                  </Display>
                ))}
                <form
                  onSubmit={submit((f) =>
                    mutate('check', {
                      id: text(f, 'id'),
                      label: text(f, 'label'),
                      state: text(f, 'state'),
                      source: source(f),
                    }),
                  )}
                  className="space-y-3"
                >
                  <Select
                    name="id"
                    label="Create / update check"
                    options={[
                      { value: '', label: 'New check' },
                      ...w.checks.map((c) => ({ value: c.id, label: c.label })),
                    ]}
                  />
                  <Field name="label" label="Check description" required />
                  <Select
                    name="state"
                    label="State"
                    options={['UNKNOWN', 'OPEN', 'CONFIRMED']}
                  />
                  <Evidence />
                  <Button busy={busy}>Record rights check</Button>
                </form>
              </Panel>
              <Panel title="Reviewed IP synchronization">
                <p className="text-sm">
                  This is a proposed business update, not legal clearance.
                  Verified execution, satisfied conditions and evidenced title
                  checks are required. Competing executed agreements block
                  changes. Existing IP title-clearance fields remain untouched.
                </p>
                {w.ipIds.map((ipId) => {
                  const ip = ips.find((i) => i.id === ipId)
                  return ip ? (
                    <Display key={ip.id}>
                      <Link href={'/ip/' + ip.id} className="text-blue-700">
                        {ip.title}
                      </Link>
                      <p>
                        Current status: {ip.status} · last modified{' '}
                        {ip.updatedAt}
                      </p>
                    </Display>
                  ) : null
                })}
                {canLegal ? (
                  <form
                    onSubmit={submit((f) => {
                      const ip = ips.find((i) => i.id === text(f, 'ipId'))
                      return request(base + '/actions', {
                        action: 'syncIp',
                        classification: 'BUSINESS',
                        version: deal.version,
                        ipId: ip?.id,
                        ipVersion: ip?.updatedAt,
                        status: text(f, 'status'),
                        dates: Object.fromEntries(
                          [
                            'optionStartDate',
                            'optionExpiryDate',
                            'extensionDeadline',
                          ].map((k) => [k, text(f, k)]),
                        ),
                        reviewed: f.get('reviewed') === 'on',
                        source: source(f),
                      })
                    })}
                    className="space-y-3"
                  >
                    <Select
                      name="ipId"
                      label="Linked IP"
                      options={ips
                        .filter((ip) => w.ipIds.includes(ip.id))
                        .map((ip) => ({ value: ip.id, label: ip.title }))}
                    />
                    <Select
                      name="status"
                      label="Proposed IP rights status"
                      options={[
                        { value: 'OPTIONED', label: 'Optioned — not acquired' },
                        {
                          value: 'SECURED',
                          label:
                            'Acquired / secured — explicit evidence required',
                        },
                      ]}
                    />
                    {[
                      'optionStartDate',
                      'optionExpiryDate',
                      'extensionDeadline',
                    ].map((k) => (
                      <Select
                        key={k}
                        name={k}
                        label={'Proposed ' + k}
                        options={[
                          { value: '', label: 'Leave existing date unchanged' },
                          ...w.dates.map((d) => ({
                            value: d.id,
                            label: `${d.label}: ${resolveDate(d.id, w.dates) || 'unresolved'}`,
                          })),
                        ]}
                      />
                    ))}
                    <Evidence />
                    <label className="block text-sm">
                      <input name="reviewed" type="checkbox" required /> I
                      reviewed the proposed status and dates against the
                      operative agreement and conditions.
                    </label>
                    <Button busy={busy}>
                      Apply reviewed IP update atomically
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-500">
                    Only an explicitly authorized reviewer may apply an IP
                    synchronization.
                  </p>
                )}
              </Panel>
            </div>
          )}
          {tab === 'Dates & payments' && (
            <div className="space-y-5">
              <Panel title="Obligations & reviewed date calculations">
                {w.dates.map((d) => (
                  <Display key={d.id}>
                    <strong>{d.label}</strong> ·{' '}
                    {resolveDate(d.id, w.dates) ||
                      'UNRESOLVED — no due date fabricated'}
                    <p>
                      {d.timezone} · {d.rule} · offset {d.offset}{' '}
                      {d.unit || 'DAY'} · month-end{' '}
                      {d.monthEnd || 'not applicable'} · {d.owner || 'No owner'}{' '}
                      · notice: {d.notice || 'unknown'}
                    </p>
                    <Citation s={d.source} />
                    <button
                      className="text-blue-700 underline"
                      onClick={() => setDateEdit(d.id)}
                    >
                      Review extension / revise calculation
                    </button>
                  </Display>
                ))}
                <form
                  key={dateEdit + deal.version}
                  onSubmit={submit((f) =>
                    mutate('date', {
                      id: dateEdit,
                      label: text(f, 'label'),
                      absolute: text(f, 'absolute'),
                      anchorId: text(f, 'anchorId'),
                      offset: Number(text(f, 'offset')),
                      unit: text(f, 'unit'),
                      monthEnd: text(f, 'monthEnd'),
                      rule: text(f, 'rule'),
                      timezone: text(f, 'timezone'),
                      holidays: text(f, 'holidays')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                      notice: text(f, 'notice'),
                      owner: text(f, 'owner'),
                      source: source(f),
                      reviewed: f.get('reviewed') === 'on',
                    }),
                  )}
                  className="space-y-3"
                >
                  <Field
                    name="label"
                    label={
                      dateEdit
                        ? 'Revised date label'
                        : 'Date / obligation label'
                    }
                    value={editedDate?.label}
                    required
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      name="absolute"
                      label="Absolute anchor date (leave blank for relative)"
                      type="date"
                      value={editedDate?.absolute}
                    />
                    <Select
                      name="anchorId"
                      label="Relative anchor"
                      options={[
                        { value: '', label: 'Unknown / no relative anchor' },
                        ...w.dates
                          .filter((d) => d.id !== dateEdit)
                          .map((d) => ({ value: d.id, label: d.label })),
                      ]}
                      value={editedDate?.anchorId}
                    />
                    <Field
                      name="offset"
                      label="Offset quantity (negative = before)"
                      type="number"
                      value={editedDate?.offset ?? 0}
                    />
                    <Select
                      name="unit"
                      label="Offset unit"
                      options={['DAY', 'MONTH', 'YEAR']}
                      value={editedDate?.unit || 'DAY'}
                    />
                    <Select
                      name="monthEnd"
                      label="Month / year end-of-month policy"
                      options={[
                        { value: 'CLAMP', label: 'Clamp to last valid day' },
                        {
                          value: 'PRESERVE_END',
                          label: 'Preserve end-of-month anchor',
                        },
                        {
                          value: 'REJECT',
                          label: 'Leave unresolved if day does not exist',
                        },
                      ]}
                      value={editedDate?.monthEnd || 'CLAMP'}
                    />
                    <Select
                      name="rule"
                      label="Day rule"
                      options={['CALENDAR', 'BUSINESS']}
                      value={editedDate?.rule}
                    />
                    <Field
                      name="timezone"
                      label="IANA timezone"
                      value={editedDate?.timezone || 'America/Toronto'}
                    />
                    <Field
                      name="owner"
                      label="Responsible owner"
                      value={editedDate?.owner}
                    />
                  </div>
                  <Field
                    name="holidays"
                    label="Excluded holidays (YYYY-MM-DD, comma separated)"
                    value={editedDate?.holidays.join(',')}
                  />
                  <Area
                    name="notice"
                    label="Notice mechanics / delivery requirements"
                    value={editedDate?.notice}
                  />
                  <Evidence />
                  <label className="block text-sm">
                    <input
                      name="reviewed"
                      type="checkbox"
                      defaultChecked={editedDate?.reviewed}
                    />{' '}
                    Calculation and anchor reviewed
                  </label>
                  <Button busy={busy}>Save dated obligation</Button>
                  {dateEdit && (
                    <button
                      type="button"
                      className="ml-3 underline text-sm"
                      onClick={() => setDateEdit('')}
                    >
                      Add another date
                    </button>
                  )}
                </form>
              </Panel>
              <Panel title="Payments — records only, no transfers">
                {w.payments.map((p) => (
                  <Display key={p.id}>
                    <strong>{p.label}</strong> · {paymentStatus(p)}
                    <p>
                      {p.money.amount || 'Unknown amount'}{' '}
                      {p.money.currency || 'unknown currency'} · tax{' '}
                      {p.money.tax || 'unknown'} · payee {p.payee || 'unknown'}
                    </p>
                    <p>
                      Trigger {p.trigger}:{' '}
                      {p.conditions
                        .map((c) => `${c.label} [${c.state}]`)
                        .join(' / ')}
                    </p>
                    <p>
                      Offsets {p.offsets || 'unknown'} · exclusions{' '}
                      {p.exclusions || 'none stated'} · currency rule{' '}
                      {p.money.currencyRule || 'none stated'}
                    </p>
                    <Citation s={p.source} />
                    <button
                      className="text-blue-700 underline"
                      onClick={() => setPaymentEdit(p.id)}
                    >
                      Review / record payment evidence
                    </button>
                  </Display>
                ))}
                <form
                  key={paymentEdit + deal.version}
                  onSubmit={submit((f) => {
                    const m = money(f)
                    return mutate('payment', {
                      id: paymentEdit,
                      label: text(f, 'label'),
                      money: Object.values(m).some(Boolean)
                        ? m
                        : editedPayment?.money || m,
                      payee: text(f, 'payee'),
                      trigger: text(f, 'trigger'),
                      conditions: [1, 2, 3]
                        .filter((n) => text(f, 'condition' + n))
                        .map((n) => ({
                          label: text(f, 'condition' + n),
                          state: text(f, 'conditionState' + n),
                          source: source(f, 'c' + n),
                        })),
                      exclusions: text(f, 'exclusionsPayment'),
                      offsets: text(f, 'offsets'),
                      dueDateId: text(f, 'dueDateId'),
                      state: text(f, 'state'),
                      paidEvidence: source(f, 'paid'),
                      source: source(f),
                    })
                  })}
                  className="space-y-3"
                >
                  <Field
                    name="label"
                    label={paymentEdit ? 'Review payment' : 'Payment label'}
                    value={editedPayment?.label}
                    required
                  />
                  <Field
                    name="payee"
                    label="Payee (no banking identifiers)"
                    value={editedPayment?.payee}
                  />
                  <MoneyFields />
                  {editedPayment && (
                    <p className="text-xs">
                      Leave all money fields empty to retain existing structured
                      money.
                    </p>
                  )}
                  <Select
                    name="trigger"
                    label="Compound trigger"
                    options={['AND', 'OR']}
                    value={editedPayment?.trigger}
                  />
                  {[1, 2, 3].map((n) => (
                    <fieldset
                      key={n}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <legend className="text-xs">Trigger condition {n}</legend>
                      <Field
                        name={'condition' + n}
                        label="Condition / trigger"
                        value={editedPayment?.conditions[n - 1]?.label}
                      />
                      <Select
                        name={'conditionState' + n}
                        label="Evidence status"
                        options={['UNKNOWN', 'MET', 'NOT_MET']}
                        value={editedPayment?.conditions[n - 1]?.state}
                      />
                      <Evidence prefix={'c' + n} />
                    </fieldset>
                  ))}
                  <Field
                    name="exclusionsPayment"
                    label="Unresolved trigger exclusions (block due state)"
                    value={editedPayment?.exclusions}
                  />
                  <Field
                    name="offsets"
                    label="Payment offsets / credits"
                    value={editedPayment?.offsets}
                  />
                  <Select
                    name="dueDateId"
                    label="Related obligation date"
                    options={[
                      { value: '', label: 'No resolved due date' },
                      ...w.dates.map((d) => ({ value: d.id, label: d.label })),
                    ]}
                    value={editedPayment?.dueDateId}
                  />
                  <Select
                    name="state"
                    label="Recorded payment state"
                    options={['CONTINGENT', 'NEEDS_REVIEW', 'DUE', 'PAID']}
                    value={editedPayment?.state}
                  />
                  <Evidence />
                  <Evidence
                    prefix="paid"
                    label="Proof of paid status (required for paid)"
                  />
                  <Button busy={busy}>Save payment evidence</Button>
                  {paymentEdit && (
                    <button
                      type="button"
                      className="ml-3 underline text-sm"
                      onClick={() => setPaymentEdit('')}
                    >
                      Add another payment
                    </button>
                  )}
                </form>
              </Panel>
              <Panel title="In-app reminders">
                <p className="text-sm">
                  Manual local run only; no scheduler is activated. Idempotent
                  reminders use reviewed resolved dates and configured lead
                  times. No external channel is configured and nothing is sent
                  externally.
                </p>
                <button
                  disabled={busy}
                  className="rounded-lg bg-blue-700 text-white px-4 py-2"
                  onClick={() =>
                    void perform(() =>
                      request(base + '/actions', { action: 'reminders' }),
                    )
                  }
                >
                  Run in-app reminders now
                </button>
                {deal.reminders.map((r) => (
                  <Display key={r.id}>
                    <strong>
                      {w.dates.find((d) => d.id === r.dateId)?.label}
                    </strong>{' '}
                    · {r.state}
                    <p>
                      Due {String(r.dueAt)} · attempts {r.attempts} ·{' '}
                      {r.error || 'No delivery error'}
                    </p>
                    {r.snoozedUntil && (
                      <p>Snoozed until {String(r.snoozedUntil)}</p>
                    )}
                    <div className="flex flex-wrap gap-4">
                      <button
                        disabled={busy || r.state === 'SUPERSEDED'}
                        className="underline text-blue-700"
                        onClick={() =>
                          void perform(() =>
                            request(base + '/actions', {
                              action: 'reminder',
                              id: r.id,
                              state: 'ACKNOWLEDGED',
                            }),
                          )
                        }
                      >
                        Acknowledge
                      </button>
                      <button
                        disabled={busy || r.state === 'SUPERSEDED'}
                        className="underline text-blue-700"
                        onClick={() =>
                          void perform(() =>
                            request(base + '/actions', {
                              action: 'reminder',
                              id: r.id,
                              state: 'SNOOZED',
                              until: new Date(
                                Date.now() + 86400000,
                              ).toISOString(),
                            }),
                          )
                        }
                      >
                        Snooze 1 day
                      </button>
                      <button
                        disabled={busy || r.state === 'SUPERSEDED'}
                        className="underline text-blue-700"
                        onClick={() =>
                          void perform(() =>
                            request(base + '/actions', {
                              action: 'reminder',
                              id: r.id,
                              state: 'DELIVERED',
                            }),
                          )
                        }
                      >
                        Retry in-app delivery
                      </button>
                    </div>
                  </Display>
                ))}
              </Panel>
            </div>
          )}
          {tab === 'Legal' && (
            <Panel title="Restricted legal workspace">
              {!canLegal ? (
                <p role="status">
                  Access denied. Generic administrators, members, other agents
                  and shared MCP connections are not authorized. Missing
                  principal configuration fails closed.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    Separate private records, not included in business history,
                    search, exports or ordinary agreement/IP APIs. Notes and
                    documents are append-only.
                  </p>
                  {legal.map((l) => (
                    <Display key={l.id}>
                      <strong>{l.name}</strong> · {l.kind}
                      <p className="whitespace-pre-wrap">{l.body}</p>
                      <p className="text-xs">{l.createdAt}</p>
                      {l.mimeType && (
                        <a
                          href={`${base}/documents/${l.id}?restricted=1`}
                          className="text-blue-700 underline"
                        >
                          Download restricted file
                        </a>
                      )}
                      {l.hash && (
                        <p className="text-xs break-all">SHA-256 {l.hash}</p>
                      )}
                    </Display>
                  ))}
                  <form
                    onSubmit={submit(async (f) => {
                      await request(base + '/legal', {
                        name: text(f, 'name'),
                        body: text(f, 'body'),
                      })
                      const r = await fetch(base + '/legal', {
                        cache: 'no-store',
                      })
                      if (r.ok) setLegal(await r.json())
                    })}
                    className="space-y-3"
                  >
                    <Field name="name" label="Private note title" required />
                    <Area
                      name="body"
                      label="Privileged advice / restricted identifiers (never copied to business fields)"
                    />
                    <Button busy={busy}>Add restricted immutable note</Button>
                  </form>
                  <p className="text-sm">
                    For private files, use Documents → classified upload.
                    Default classification is restricted.
                  </p>
                </>
              )}
            </Panel>
          )}
        </>
      )}
    </main>
  )
}
