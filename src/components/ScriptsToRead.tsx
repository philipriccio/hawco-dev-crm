'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ScriptItem {
  id: string
  title: string
  writer: string
  genre: string
  dateReceived: string | Date
  type: string
  href: string
  source: 'material' | 'project'
  projectId?: string | null
  isRead: boolean
  readAt?: string | Date | null
}

interface ScriptsToReadProps {
  initialScripts: ScriptItem[]
  title?: string
}

export default function ScriptsToRead({ initialScripts, title = 'Scripts' }: ScriptsToReadProps) {
  const [scripts, setScripts] = useState<ScriptItem[]>(initialScripts)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function setReadState(script: ScriptItem, markAsRead: boolean) {
    setUpdatingId(`${script.source}-${script.id}`)

    const previous = scripts
    setScripts((prev) =>
      prev.map((s) =>
        s.id === script.id && s.source === script.source
          ? { ...s, isRead: markAsRead, readAt: markAsRead ? new Date().toISOString() : null }
          : s
      )
    )

    try {
      if (script.source === 'material') {
        const materialResponse = await fetch(`/api/materials/${script.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAsRead }),
        })

        if (!materialResponse.ok) {
          throw new Error('Failed to update material read state')
        }
      }

      if (script.projectId) {
        const projectResponse = await fetch(`/api/projects/${script.projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAsRead }),
        })

        if (!projectResponse.ok) {
          throw new Error('Failed to update project read state')
        }
      }
    } catch (error) {
      console.error('Error updating read state:', error)
      setScripts(previous)
      alert('Failed to update read state')
    } finally {
      setUpdatingId(null)
    }
  }

  function formatDate(dateString: string | Date) {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Link href="/materials?type=PILOT_SCRIPT,FEATURE_SCRIPT,SERIES_BIBLE" className="text-sm text-amber-600 hover:text-amber-700">
          View all →
        </Link>
      </div>

      {scripts.length > 0 ? (
        <div className="space-y-4">
          {scripts.map((script) => {
            const key = `${script.source}-${script.id}`
            const isUpdating = updatingId === key

            return (
              <div
                key={key}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${script.isRead ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <svg className={`w-5 h-5 ${script.isRead ? 'text-green-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={script.href} className="font-medium text-slate-900 hover:text-amber-600">
                    {script.title}
                  </Link>
                  <p className="text-sm text-slate-500">{script.writer}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                      {script.genre}
                    </span>
                    <span className="text-xs text-slate-400">
                      {script.isRead ? `Read ${script.readAt ? formatDate(script.readAt) : ''}` : formatDate(script.dateReceived)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setReadState(script, !script.isRead)}
                  disabled={isUpdating}
                  className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 ${
                    script.isRead
                      ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  }`}
                  title={script.isRead ? 'Mark as Unread' : 'Mark as Read'}
                >
                  {isUpdating ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={script.isRead ? 'M10 14L21 3m0 0l-7 0m7 0l0 7M3 10l0 11 11 0' : 'M5 13l4 4L19 7'} />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{script.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p>No scripts found.</p>
        </div>
      )}
    </div>
  )
}
