'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WriterSignal {
  id: string
  signalType: string
  note: string | null
  createdAt: string
}

const DEFAULT_SIGNALS = ['voice', 'craft', 'reliability', 'market fit', 'canadian fit']

export default function WriterSignalsClient({ contactId, signals }: { contactId: string; signals: WriterSignal[] }) {
  const router = useRouter()
  const [signalType, setSignalType] = useState(DEFAULT_SIGNALS[0])
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const addSignal = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/contacts/${contactId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalType, note }),
      })
      if (!response.ok) throw new Error('Failed to add signal')
      setNote('')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Failed to add signal')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Writer Positive Signals</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {signals.map((signal) => (
          <span key={signal.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800">
            {signal.signalType}
          </span>
        ))}
        {signals.length === 0 && <p className="text-sm text-slate-500 italic">No signals yet.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2">
        <select value={signalType} onChange={(e) => setSignalType(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          {DEFAULT_SIGNALS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        <button onClick={addSignal} disabled={isSaving} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
          Add
        </button>
      </div>
    </div>
  )
}
