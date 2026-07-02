'use client'

import { useEffect, useMemo, useState } from 'react'

type BoardStatus = 'EARLY_DEVELOPMENT' | 'DEVELOPING' | 'PACKAGING' | 'PITCHED' | 'GREENLIT'

interface Project {
  id: string
  title: string
  status: string
  dateReceived: string | null
  createdAt: string
  genre: string | null
  origin: string
  contacts: {
    contact: {
      name: string
    }
  }[]
}

const BOARD_STATUSES: BoardStatus[] = ['EARLY_DEVELOPMENT', 'DEVELOPING', 'PACKAGING', 'PITCHED', 'GREENLIT']

const statusLabels: Record<BoardStatus, string> = {
  EARLY_DEVELOPMENT: 'Early Development',
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  GREENLIT: 'Greenlit',
}

function boardStatusFor(status: string): BoardStatus | null {
  return BOARD_STATUSES.includes(status as BoardStatus) ? (status as BoardStatus) : null
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return 'No received date'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AddProjectButton() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      excludeStatuses: BOARD_STATUSES.join(','),
      order: 'recentReceived',
      limit: '75',
    })
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }, [search])

  useEffect(() => {
    if (!showModal) return

    let cancelled = false
    const fetchProjects = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/projects?${queryString}`)
        if (!res.ok) throw new Error('Failed to fetch projects')
        const data = await res.json()
        if (!cancelled) setProjects(Array.isArray(data) ? data : data.projects || [])
      } catch (err) {
        console.error('Error fetching projects:', err)
        if (!cancelled) {
          setProjects([])
          setError('Could not load existing projects.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timeout = setTimeout(fetchProjects, search.trim() ? 200 : 0)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [queryString, search, showModal])

  const openModal = () => {
    setSearch('')
    setSelectedProject(null)
    setError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    if (savingId) return
    setShowModal(false)
    setSelectedProject(null)
  }

  const addToBoard = async (project: Project, status: BoardStatus) => {
    setSavingId(project.id)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update project status')
      window.location.reload()
    } catch (err) {
      console.error('Error adding project to board:', err)
      setError('Could not add the project to the board. Please try again.')
      setSavingId(null)
    }
  }

  const selectProject = (project: Project) => {
    const existingBoardStatus = boardStatusFor(project.status)
    if (existingBoardStatus) {
      addToBoard(project, existingBoardStatus)
      return
    }
    setSelectedProject(project)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors text-sm font-medium shadow-md"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
        Add existing project
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[84vh] flex flex-col">
            <div className="p-4 border-b border-[#E4E7EC] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Add existing project</h2>
                <p className="text-sm text-slate-500 mt-1">Choose a CRM project, then place it in the right board column.</p>
              </div>
              <button
                onClick={closeModal}
                disabled={Boolean(savingId)}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close"
              >
                x
              </button>
            </div>

            <div className="p-4 border-b border-[#E4E7EC]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, writer, genre, or logline"
                className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                autoFocus
              />
            </div>

            {error && (
              <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="p-4 overflow-y-auto flex-1">
              {selectedProject ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-sm text-[#2563EB] hover:text-[#1D4ED8]"
                  >
                    Back to project search
                  </button>
                  <div className="rounded-lg border border-[#E4E7EC] p-4">
                    <p className="font-semibold text-slate-900">{selectedProject.title}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedProject.contacts[0]?.contact.name || 'No writer linked'} · {formatStatus(selectedProject.status)} · {formatDate(selectedProject.dateReceived)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-2">Set board column</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {BOARD_STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => addToBoard(selectedProject, status)}
                          disabled={Boolean(savingId)}
                          className="rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-50"
                        >
                          {savingId === selectedProject.id ? 'Adding...' : statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                </div>
              ) : projects.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No matching projects outside the board.</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => selectProject(project)}
                      disabled={Boolean(savingId)}
                      className="w-full text-left p-3 rounded-lg border border-[#E4E7EC] hover:border-[#2563EB] hover:bg-[#F8F9FB] transition disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{project.title}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {project.contacts[0]?.contact.name || 'No writer linked'} · {formatStatus(project.status)} · {formatDate(project.dateReceived)}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[#1E40AF] whitespace-nowrap mt-1">
                          {project.genre || project.origin.replace(/_/g, ' ')}
                        </span>
                      </div>
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
