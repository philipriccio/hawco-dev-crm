'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  genre: string | null
  origin: string
}

export default function AddProjectButton() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const fetchSubmittedProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects?status=submitted&limit=50')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFromSubmissions = () => {
    setShowDropdown(false)
    fetchSubmittedProjects()
    setShowModal(true)
  }

  const moveToDeveloping = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DEVELOPING' }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (err) {
      console.error('Error moving project:', err)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors text-sm font-medium shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Project
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <Link
              href="/projects/new"
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowDropdown(false)}
            >
              Create New Project
            </Link>
            <button
              onClick={handleAddFromSubmissions}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Add from Submissions
            </button>
          </div>
        )}
      </div>

      {/* Modal for selecting from submissions */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add from Submissions</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : projects.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No submitted projects available</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => moveToDeveloping(project.id)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition"
                    >
                      <p className="font-medium text-slate-900">{project.title}</p>
                      <p className="text-sm text-slate-500">
                        {project.genre || 'No genre'} · {project.origin === 'HAWCO_ORIGINAL' ? 'Hawco Original' : 'External'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
