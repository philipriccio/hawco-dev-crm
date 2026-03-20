'use client'

import { useState } from 'react'

interface CanadianToggleProps {
  contactId: string
  initialValue: boolean
}

export default function CanadianToggle({ contactId, initialValue }: CanadianToggleProps) {
  const [isCanadian, setIsCanadian] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleToggle() {
    const newValue = !isCanadian
    setSaving(true)
    
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCanadian: newValue }),
      })
      
      if (res.ok) {
        setIsCanadian(newValue)
      } else {
        console.error('Failed to update')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={isCanadian}
        onChange={handleToggle}
        disabled={saving}
        className="w-5 h-5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer disabled:opacity-50"
      />
      <span className="text-slate-700 flex items-center gap-2">
        🇨🇦 Canadian
        {saving && <span className="text-xs text-slate-400">(saving...)</span>}
      </span>
    </label>
  )
}
