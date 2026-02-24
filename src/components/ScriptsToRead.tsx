'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ScriptToRead {
  id: string
  title: string
  writer: string
  genre: string
  dateReceived: string | Date
  type: string
  href: string
  source: 'material' | 'project'
  projectId?: string | null
}

interface ScriptsToReadProps {
  initialScripts: ScriptToRead[]
}

export default function ScriptsToRead({ initialScripts }: ScriptsToReadProps) {
  const [scripts, setScripts] = useState<ScriptToRead[]>(initialScripts)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function handleMarkAsRead(script: ScriptToRead) {
    // If it's from a project, update the project status
    if (script.projectId) {
      setUpdatingId(`${script.source}-${script.id}`)
      try {
        const response = await fetch(`/api/projects/${script.projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READ' }),
        })

        if (response.ok) {
          // Remove the script from the list
          setScripts((prev) => 
            prev.filter((s) => !(s.source === script.source && s.id === script.id))
          )
        }
      } catch (error) {
        console.error('Error updating project status:', error)
        alert('Failed to mark as read')
      } finally {
        setUpdatingId(null)
      }
    }
  }

  function formatDate(dateString: string | Date) {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Scripts to Read</h2>
        <Link href="/projects?status=reading" className="text-sm text-amber-600 hover:text-amber-700">
          View all →
        </Link>
      </div>
      {scripts.length > 0 ? (
        <div className="space-y-4">
          {scripts.map((script) => (
            <div
              key={`${script.source}-${script.id}`}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    {formatDate(script.dateReceived)}
                  </span>
                </div>
              </div>
              {script.projectId && (
                <button
                  onClick={() => handleMarkAsRead(script)}
                  disabled={updatingId === `${script.source}-${script.id}`}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                  title="Mark as Read"
                >
                  {updatingId === `${script.source}-${script.id}` ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Mark Read</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p>No scripts waiting to be read.</p>
          <Link href="/projects?status=submitted" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
            Check submitted projects →
          </Link>
        </div>
      )}
    </div>
  )
}