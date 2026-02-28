'use client'

import { useState } from 'react'

interface HighPriorityToggleProps {
  contactId: string
  initialValue: boolean
}

export default function HighPriorityToggle({ contactId, initialValue }: HighPriorityToggleProps) {
  const [highPriority, setHighPriority] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleToggle() {
    const newValue = !highPriority
    setSaving(true)

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highPriority: newValue }),
      })

      if (res.ok) {
        setHighPriority(newValue)
      } else {
        console.error('Failed to update high-priority flag')
      }
    } catch (error) {
      console.error('Error updating high-priority flag:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={highPriority}
        onChange={handleToggle}
        disabled={saving}
        className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
      />
      <span className="text-slate-700 flex items-center gap-2">
        ⭐ High Priority Writer
        {saving && <span className="text-xs text-slate-400">(saving...)</span>}
      </span>
    </label>
  )
}
