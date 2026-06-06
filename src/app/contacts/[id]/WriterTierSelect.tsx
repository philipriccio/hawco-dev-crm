'use client'

import { useState } from 'react'
import { writerTierDescriptions, writerTierLabels, writerTierOrder } from '@/lib/writer-tier'

interface WriterTierSelectProps {
  contactId: string
  initialValue: string | null
}

export default function WriterTierSelect({ contactId, initialValue }: WriterTierSelectProps) {
  const [writerTier, setWriterTier] = useState(initialValue || 'CONSIDER_WORKING_WITH')
  const [saving, setSaving] = useState(false)

  async function handleChange(value: string) {
    setWriterTier(value)
    setSaving(true)

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writerTier: value }),
      })

      if (!res.ok) {
        console.error('Failed to update writer tier')
      }
    } catch (error) {
      console.error('Error updating writer tier:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <select
        value={writerTier}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] disabled:opacity-50"
      >
        {writerTierOrder.map((tier) => (
          <option key={tier} value={tier}>{writerTierLabels[tier]}</option>
        ))}
      </select>
      <p className="text-xs text-slate-500">{writerTierDescriptions[writerTier]}</p>
      {saving && <p className="text-xs text-slate-400">Saving...</p>}
    </div>
  )
}
