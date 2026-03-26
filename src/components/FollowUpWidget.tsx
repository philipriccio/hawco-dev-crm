'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FollowUpItem {
  id: string
  note: string
  completed: boolean
  createdAt: string
  contact: {
    id: string
    name: string
    type: string
  }
}

export default function FollowUpWidget({ initialFollowUps }: { initialFollowUps: FollowUpItem[] }) {
  const [followUps, setFollowUps] = useState(initialFollowUps)

  async function toggleComplete(id: string, completed: boolean) {
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      })
      if (res.ok) {
        setFollowUps(prev => prev.map(fu => fu.id === id ? { ...fu, completed } : fu))
      }
    } catch (error) {
      console.error('Error toggling follow-up:', error)
    }
  }

  const incomplete = followUps.filter(fu => !fu.completed)

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Follow-up Items</h2>
        <span className="text-sm text-slate-500">{incomplete.length} pending</span>
      </div>
      <div className="space-y-2">
        {incomplete.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No pending follow-ups.</p>
        ) : (
          incomplete.slice(0, 10).map(fu => (
            <div key={fu.id} className="flex items-start gap-3 p-2 rounded hover:bg-[#F2F4F7] group">
              <input
                type="checkbox"
                checked={fu.completed}
                onChange={() => toggleComplete(fu.id, !fu.completed)}
                className="mt-0.5 w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB] cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/contacts/${fu.contact.id}`} className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]">
                    {fu.contact.name}
                  </Link>
                  <span className="text-xs text-slate-400">{new Date(fu.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5">{fu.note}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
