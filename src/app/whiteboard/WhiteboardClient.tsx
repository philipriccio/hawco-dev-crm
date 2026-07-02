'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import AddProjectButton from './AddProjectButton'

type WhiteboardStatus = 'EARLY_DEVELOPMENT' | 'DEVELOPING' | 'PACKAGING' | 'PITCHED' | 'GREENLIT'

export type ProjectItem = {
  id: string
  title: string
  genre: string | null
  origin: 'EXTERNAL' | 'HAWCO_ORIGINAL'
  status: WhiteboardStatus
  currentStage: string | null
  notes: string | null
  nextAction: string | null
  updatedAt: string
  contacts: {
    contact: {
      name: string
    }
  }[]
}

const WHITEBOARD_COLUMNS: WhiteboardStatus[] = [
  'EARLY_DEVELOPMENT',
  'DEVELOPING',
  'PACKAGING',
  'PITCHED',
  'GREENLIT',
]

const columnLabels: Record<WhiteboardStatus, string> = {
  EARLY_DEVELOPMENT: 'Early Development',
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  GREENLIT: 'Greenlit',
}

const columnColors: Record<WhiteboardStatus, string> = {
  EARLY_DEVELOPMENT: 'from-sky-700 to-cyan-600',
  DEVELOPING: 'from-blue-700 to-blue-600',
  PACKAGING: 'from-orange-700 to-orange-600',
  PITCHED: 'from-violet-700 to-violet-600',
  GREENLIT: 'from-emerald-700 to-emerald-600',
}

const cardColors = [
  'bg-[#F8F9FB] border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
]

export default function WhiteboardClient({ initialProjects }: { initialProjects: ProjectItem[] }) {
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<WhiteboardStatus>>(new Set())

  const columns = useMemo(() => {
    const grouped: Record<WhiteboardStatus, ProjectItem[]> = {
      EARLY_DEVELOPMENT: [],
      DEVELOPING: [],
      PACKAGING: [],
      PITCHED: [],
      GREENLIT: [],
    }

    for (const project of projects) {
      grouped[project.status].push(project)
    }

    for (const key of WHITEBOARD_COLUMNS) {
      grouped[key].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    }

    return grouped
  }, [projects])

  const toggleSection = (status: WhiteboardStatus) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }

  const moveProject = async (projectId: string, toStatus: WhiteboardStatus) => {
    const existing = projects.find((p) => p.id === projectId)
    if (!existing || existing.status === toStatus) return

    const fromStatus = existing.status

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: toStatus, updatedAt: new Date().toISOString() } : p))
    )
    setSavingId(projectId)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus }),
      })

      if (!res.ok) {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      // Rollback
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: fromStatus } : p))
      )
      console.error(error)
      alert('Could not move project. Please try again.')
    } finally {
      setSavingId(null)
      setDraggingId(null)
    }
  }

  return (
    <div className="h-full min-h-screen bg-[#F2F4F7]">
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">In Development</h1>
            <p className="text-slate-300/80 text-sm mt-1">
              Expand the stage you need and drag projects between sections - {projects.length} projects
            </p>
          </div>
          <AddProjectButton />
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {WHITEBOARD_COLUMNS.map((status, columnIndex) => (
            <section key={status} className="overflow-hidden rounded-xl border border-[#D0D5DD] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08)]">
              <button
                type="button"
                onClick={() => toggleSection(status)}
                className={`w-full bg-gradient-to-r ${columnColors[status]} p-4 text-left shadow-md`}
                aria-expanded={!collapsedSections.has(status)}
                aria-controls={`development-section-${status}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className={`h-5 w-5 text-white transition-transform ${collapsedSections.has(status) ? '-rotate-90' : 'rotate-0'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <h2 className="font-semibold text-white">{columnLabels[status]}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingId && columns[status].some((project) => project.id === savingId) && (
                      <span className="text-xs font-medium text-white/80">Saving...</span>
                    )}
                    <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                      {columns[status].length}
                    </span>
                  </div>
                </div>
              </button>

              {!collapsedSections.has(status) && (
                <div
                  id={`development-section-${status}`}
                  className="bg-[#F8FAFC] p-4 min-h-[220px] shadow-inner"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const projectId = e.dataTransfer.getData('text/project-id')
                    if (projectId) moveProject(projectId, status)
                  }}
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.035) 1px, transparent 1px),
                      radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.035) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {columns[status].map((project, cardIndex) => {
                      const colorClass = cardColors[(columnIndex + cardIndex) % cardColors.length]
                      const writerName = project.contacts[0]?.contact.name
                      const isSaving = savingId === project.id

                      return (
                        <div
                          key={project.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(project.id)
                            e.dataTransfer.setData('text/project-id', project.id)
                          }}
                          onDragEnd={() => setDraggingId(null)}
                          className={`${draggingId === project.id ? 'opacity-50' : ''} ${isSaving ? 'ring-2 ring-[#2563EB] rounded-lg' : ''}`}
                        >
                          <ProjectCard project={project} colorClass={colorClass} writerName={writerName} />
                        </div>
                      )
                    })}
                  </div>

                  {columns[status].length === 0 && (
                    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-white/60 text-[#1E40AF]/50">
                      <p className="text-sm">Drop projects here</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  colorClass,
  writerName,
}: {
  project: ProjectItem
  colorClass: string
  writerName: string | undefined
}) {
  const isHawcoOriginal = project.origin === 'HAWCO_ORIGINAL'

  return (
    <Link href={`/projects/${project.id}`}>
      <div
        className={`
          ${colorClass}
          rounded-lg p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:shadow-md
          transition-all duration-200
          hover:-translate-y-0.5
          border
          relative
          overflow-hidden
          cursor-grab active:cursor-grabbing
        `}
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-700/30 shadow-[0_1px_3px_rgba(16,24,40,0.06)]" />

        <div className="absolute top-2 right-2">
          {isHawcoOriginal ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] block" title="Hawco Original" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" title="External" />
          )}
        </div>

        <div className="pt-3">
          <h3 className="font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">{project.title}</h3>

          {project.genre && (
            <span className="inline-block px-2 py-0.5 bg-[#EFF6FF] text-[#1E40AF] text-xs rounded font-medium mb-2">
              {project.genre}
            </span>
          )}

          {writerName && (
            <p className="text-sm text-slate-600 mb-2">
              <span className="text-slate-400">by </span>
              {writerName}
            </p>
          )}

          {(project.currentStage || project.notes) && (
            <div className="mt-3 pt-3 border-t border-[#E4E7EC]">
              <p className="text-xs text-slate-500 line-clamp-2">{project.currentStage || project.notes}</p>
            </div>
          )}

          {project.nextAction && (
            <div className="mt-2">
              <p className="text-xs text-[#1E40AF] font-medium line-clamp-2">{project.nextAction}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
