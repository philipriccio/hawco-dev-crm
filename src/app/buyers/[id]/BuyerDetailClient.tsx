'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { BuyerSlateStatus } from '@prisma/client'

type Buyer = {
  id: string
  name: string
  brands: string | null
  region: string | null
  lookingFor: string | null
  updatedAt: Date
  contacts: { id: string; name: string; email: string | null; execTitle: string | null; execRole: string | null }[]
  projects: { id: string; role: string | null; project: { id: string; title: string; status: string; currentStage: string | null } }[]
  slateItems: { id: string; title: string; status: BuyerSlateStatus; logline: string | null; productionCompany: string | null; source: string | null; sourceUrl: string | null; dateNoted: Date; confirmed: boolean; notes: string | null }[]
}

const statusLabels: Record<BuyerSlateStatus, string> = {
  ON_AIR: 'On Air',
  IN_DEVELOPMENT: 'In Development',
  GREENLIT: 'Greenlit',
  ANNOUNCED: 'Announced',
  ENDED: 'Ended',
}

const statusClasses: Record<BuyerSlateStatus, string> = {
  ON_AIR: 'bg-green-100 text-green-700 border-green-200',
  GREENLIT: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_DEVELOPMENT: 'bg-amber-100 text-amber-800 border-amber-200',
  ANNOUNCED: 'bg-purple-100 text-purple-700 border-purple-200',
  ENDED: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function BuyerDetailClient({ buyer }: { buyer: Buyer }) {
  const router = useRouter()
  const [lookingFor, setLookingFor] = useState(buyer.lookingFor || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showSlateForm, setShowSlateForm] = useState(false)
  const [slateForm, setSlateForm] = useState({ title: '', status: 'IN_DEVELOPMENT' as BuyerSlateStatus, logline: '', productionCompany: '', source: '', sourceUrl: '', notes: '', confirmed: false })

  async function saveLookingFor() {
    setSavingNotes(true)
    try {
      const response = await fetch(`/api/buyers/${buyer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookingFor }),
      })
      if (!response.ok) throw new Error('Failed to save')
      router.refresh()
    } catch {
      alert('Could not save buyer notes.')
    } finally {
      setSavingNotes(false)
    }
  }

  async function addSlateItem(e: React.FormEvent) {
    e.preventDefault()
    const response = await fetch(`/api/buyers/${buyer.id}/slate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slateForm),
    })
    if (!response.ok) {
      alert('Could not add slate item.')
      return
    }
    setSlateForm({ title: '', status: 'IN_DEVELOPMENT', logline: '', productionCompany: '', source: '', sourceUrl: '', notes: '', confirmed: false })
    setShowSlateForm(false)
    router.refresh()
  }

  const slateByStatus = buyer.slateItems.reduce((acc, item) => {
    if (!acc[item.status]) acc[item.status] = []
    acc[item.status].push(item)
    return acc
  }, {} as Record<BuyerSlateStatus, typeof buyer.slateItems>)
  const statuses: BuyerSlateStatus[] = ['ON_AIR', 'IN_DEVELOPMENT', 'GREENLIT', 'ANNOUNCED', 'ENDED']

  return (
    <div className="p-8 space-y-6">
      <Link href="/buyers" className="text-sm font-medium text-[#1D4ED8] hover:underline">← Back to Buyers</Link>
      <header className="bg-white rounded-2xl border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-lg">
              {buyer.name.split(/\s|\+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{buyer.name}</h1>
              {buyer.brands && <p className="text-slate-500 mt-1">{buyer.brands}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Stat label="Region" value={buyer.region || 'Unset'} />
            <Stat label="Contacts" value={buyer.contacts.length.toString()} />
            <Stat label="Projects" value={buyer.projects.length.toString()} />
            <Stat label="Slate" value={buyer.slateItems.length.toString()} />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card title="What they’re looking for" subtitle={`Last updated ${new Date(buyer.updatedAt).toLocaleDateString()}`}>
            <textarea value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} rows={10} className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" placeholder="Mandate, current priorities, format preferences, budget posture…" />
            <div className="mt-3 flex justify-end">
              <button onClick={saveLookingFor} disabled={savingNotes} className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-semibold hover:bg-[#1D4ED8] disabled:opacity-50">{savingNotes ? 'Saving…' : 'Save notes'}</button>
            </div>
          </Card>
          <Card title="Their slate" subtitle="Cowork drafts can sit here as pending review until Philip confirms them.">
            <div className="mb-4 flex justify-end">
              <button onClick={() => setShowSlateForm((value) => !value)} className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm font-semibold hover:bg-[#1D4ED8]">+ Add slate item</button>
            </div>
            {showSlateForm && (
              <form onSubmit={addSlateItem} className="mb-5 p-4 rounded-xl bg-[#F8F9FB] border border-[#E4E7EC] grid grid-cols-1 md:grid-cols-2 gap-3">
                <input required value={slateForm.title} onChange={(e) => setSlateForm({ ...slateForm, title: e.target.value })} placeholder="Title" className="px-3 py-2 border rounded-lg text-sm" />
                <select value={slateForm.status} onChange={(e) => setSlateForm({ ...slateForm, status: e.target.value as BuyerSlateStatus })} className="px-3 py-2 border rounded-lg text-sm">{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
                <input value={slateForm.productionCompany} onChange={(e) => setSlateForm({ ...slateForm, productionCompany: e.target.value })} placeholder="Production company" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={slateForm.source} onChange={(e) => setSlateForm({ ...slateForm, source: e.target.value })} placeholder="Source" className="px-3 py-2 border rounded-lg text-sm" />
                <input value={slateForm.sourceUrl} onChange={(e) => setSlateForm({ ...slateForm, sourceUrl: e.target.value })} placeholder="Source URL" className="px-3 py-2 border rounded-lg text-sm md:col-span-2" />
                <textarea value={slateForm.logline} onChange={(e) => setSlateForm({ ...slateForm, logline: e.target.value })} placeholder="Logline" rows={2} className="px-3 py-2 border rounded-lg text-sm md:col-span-2" />
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={slateForm.confirmed} onChange={(e) => setSlateForm({ ...slateForm, confirmed: e.target.checked })} /> Confirmed</label>
                <button className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Add</button>
              </form>
            )}
            <div className="space-y-5">
              {statuses.map((status) => (
                <div key={status}>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">{statusLabels[status]}</h3>
                  {(slateByStatus[status] || []).length === 0 ? <p className="text-sm text-slate-400 italic">No slate items tracked yet.</p> : <div className="space-y-2">{slateByStatus[status].map((item) => <SlateItem key={item.id} item={item} />)}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Our contacts there">
            {buyer.contacts.length === 0 ? <p className="text-sm text-slate-400 italic">No contacts logged for this buyer yet.</p> : <div className="space-y-2">{buyer.contacts.map((contact) => <Link key={contact.id} href={`/contacts/${contact.id}`} className="block p-3 rounded-xl border border-[#E4E7EC] hover:bg-[#F8F9FB]"><p className="font-semibold text-slate-900">{contact.name}</p>{contact.execTitle && <p className="text-xs text-slate-500 mt-0.5">{contact.execTitle}</p>}{contact.execRole && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{contact.execRole}</p>}{contact.email && <p className="text-xs text-[#1D4ED8] mt-1">{contact.email}</p>}</Link>)}</div>}
            <Link href={`/contacts/new?companyId=${buyer.id}&type=NETWORK_EXEC`} className="mt-4 inline-flex w-full justify-center px-3 py-2 rounded-lg bg-[#2563EB]/10 text-[#1D4ED8] text-sm font-semibold hover:bg-[#2563EB]/20">Add contact</Link>
          </Card>
          <Card title="Our projects targeting them">
            {buyer.projects.length === 0 ? <p className="text-sm text-slate-400 italic">No Hawco projects are marked as targeting this buyer yet.</p> : <div className="space-y-2">{buyer.projects.map((entry) => <Link key={entry.id} href={`/projects/${entry.project.id}`} className="block p-3 rounded-xl border border-[#E4E7EC] hover:bg-[#F8F9FB]"><p className="font-semibold text-slate-900">{entry.project.title}</p><div className="mt-1 flex gap-2 text-xs"><span className="px-2 py-0.5 rounded-full bg-[#F2F4F7] text-slate-700">{entry.project.status}</span>{entry.project.currentStage && <span className="text-slate-500">{entry.project.currentStage}</span>}</div></Link>)}</div>}
          </Card>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="px-3 py-2 rounded-xl bg-[#F8F9FB] border border-[#E4E7EC]"><p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p><p className="text-sm font-bold text-slate-900">{value}</p></div> }
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="bg-white rounded-2xl border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5"><div className="mb-4"><h2 className="text-lg font-bold text-slate-900">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}</div>{children}</section> }
function SlateItem({ item }: { item: Buyer['slateItems'][number] }) { return <div className="p-3 rounded-xl border border-[#E4E7EC] bg-white"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.title}</p>{item.logline && <p className="text-sm text-slate-600 mt-1">{item.logline}</p>}</div><div className="flex flex-col items-end gap-1"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClasses[item.status]}`}>{statusLabels[item.status]}</span>{!item.confirmed && <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-amber-300 text-amber-700 bg-amber-50">Pending review</span>}</div></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">{item.productionCompany && <span>{item.productionCompany}</span>}{item.sourceUrl ? <a className="text-[#1D4ED8] hover:underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.source || 'Source'}</a> : item.source && <span>{item.source}</span>}<span>{new Date(item.dateNoted).toLocaleDateString()}</span></div>{item.notes && <p className="mt-2 text-sm text-slate-500">{item.notes}</p>}</div> }
