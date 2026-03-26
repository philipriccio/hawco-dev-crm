'use client'

import { useState } from 'react'

interface FollowUpItem {
  id: string
  note: string
  completed: boolean
  createdAt: string
}

export default function ContactFollowUps({
  contactId,
  initialFollowUps,
}: {
  contactId: string
  initialFollowUps: FollowUpItem[]
}) {
  const [followUps, setFollowUps] = useState(initialFollowUps)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  async function addFollowUp(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, note: newNote.trim() }),
      })
      if (res.ok) {
        const created = await res.json()
        setFollowUps(prev => [{ ...created, createdAt: created.createdAt }, ...prev])
        setNewNote('')
      }
    } catch (error) {
      console.error('Error adding follow-up:', error)
    } finally {
      setAdding(false)
    }
  }

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

  async function deleteFollowUp(id: string) {
    try {
      const res = await fetch(`/api/follow-ups?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setFollowUps(prev => prev.filter(fu => fu.id !== id))
      }
    } catch (error) {
      console.error('Error deleting follow-up:', error)
    }
  }

  const incomplete = followUps.filter(fu => !fu.completed)
  const completed = followUps.filter(fu => fu.completed)

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Follow-up Items</h2>

      {/* Add form */}
      <form onSubmit={addFollowUp} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a follow-up item..."
          className="flex-1 px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-sm"
        />
        <button
          type="submit"
          disabled={adding || !newNote.trim()}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm font-medium disabled:opacity-50"
        >
          {adding ? '...' : 'Add'}
        </button>
      </form>

      {/* Incomplete items */}
      <div className="space-y-2">
        {incomplete.length === 0 && completed.length === 0 && (
          <p className="text-sm text-slate-500 italic">No follow-up items yet.</p>
        )}
        {incomplete.map(fu => (
          <div key={fu.id} className="flex items-start gap-3 p-2 rounded hover:bg-[#F2F4F7] group">
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggleComplete(fu.id, true)}
              className="mt-0.5 w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB] cursor-pointer"
            />
            <div className="flex-1">
              <p className="text-sm text-slate-700">{fu.note}</p>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(fu.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => deleteFollowUp(fu.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Completed items */}
      {completed.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-slate-400 mb-2">Completed ({completed.length})</p>
          <div className="space-y-1">
            {completed.map(fu => (
              <div key={fu.id} className="flex items-start gap-3 p-2 rounded hover:bg-[#F2F4F7] group">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleComplete(fu.id, false)}
                  className="mt-0.5 w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB] cursor-pointer"
                />
                <p className="text-sm text-slate-400 line-through flex-1">{fu.note}</p>
                <button
                  onClick={() => deleteFollowUp(fu.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
