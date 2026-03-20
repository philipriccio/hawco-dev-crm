'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RewriteCycle {
  id: string
  cycleNumber: number
  notesSentAt: string | null
  dueAt: string | null
  rewriteReceivedAt: string | null
  rereadAt: string | null
  outcomeNote: string | null
  createdAt: string
}

export default function RewriteCycleTracker({ projectId, initialCycles }: { projectId: string; initialCycles: RewriteCycle[] }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    notesSentAt: '',
    dueAt: '',
    rewriteReceivedAt: '',
    rereadAt: '',
    outcomeNote: '',
  })

  const handleAddCycle = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/rewrite-cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error('Failed to add rewrite cycle')
      setForm({ notesSentAt: '', dueAt: '', rewriteReceivedAt: '', rereadAt: '', outcomeNote: '' })
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to add rewrite cycle')
    } finally {
      setIsSaving(false)
    }
  }

  const fmt = (date: string | null) => (date ? new Date(date).toLocaleDateString() : '—')

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {initialCycles.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No rewrite cycles yet.</p>
        ) : (
          initialCycles.map((cycle) => (
            <div key={cycle.id} className="p-3 rounded-lg bg-white/60 border border-[#E4E7EC]">
              <p className="font-semibold text-slate-800 text-sm mb-2">Cycle {cycle.cycleNumber}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <p>Notes sent: {fmt(cycle.notesSentAt)}</p>
                <p>Due: {fmt(cycle.dueAt)}</p>
                <p>Rewrite received: {fmt(cycle.rewriteReceivedAt)}</p>
                <p>Re-read: {fmt(cycle.rereadAt)}</p>
              </div>
              {cycle.outcomeNote && <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{cycle.outcomeNote}</p>}
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-[#E4E7EC]/60 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Add rewrite cycle</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={form.notesSentAt} onChange={(e) => setForm((f) => ({ ...f, notesSentAt: e.target.value }))} className="px-2 py-1.5 rounded border border-slate-300 text-sm" placeholder="Notes sent" />
          <input type="date" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} className="px-2 py-1.5 rounded border border-slate-300 text-sm" />
          <input type="date" value={form.rewriteReceivedAt} onChange={(e) => setForm((f) => ({ ...f, rewriteReceivedAt: e.target.value }))} className="px-2 py-1.5 rounded border border-slate-300 text-sm" />
          <input type="date" value={form.rereadAt} onChange={(e) => setForm((f) => ({ ...f, rereadAt: e.target.value }))} className="px-2 py-1.5 rounded border border-slate-300 text-sm" />
        </div>
        <textarea value={form.outcomeNote} onChange={(e) => setForm((f) => ({ ...f, outcomeNote: e.target.value }))} rows={2} className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm" placeholder="Outcome note" />
        <button onClick={handleAddCycle} disabled={isSaving} className="px-3 py-1.5 bg-[#2563EB] text-white rounded text-sm hover:bg-[#1D4ED8] disabled:opacity-50">
          {isSaving ? 'Saving...' : 'Add Cycle'}
        </button>
      </div>
    </div>
  )
}
