'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import AddProjectButton from './AddProjectButton'

type WhiteboardStatus = 'PACKAGING' | 'PITCHED' | 'DEVELOPING' | 'GREENLIT'

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
  'PACKAGING',
  'PITCHED',
  'DEVELOPING',
  'GREENLIT',
]

const columnLabels: Record<WhiteboardStatus, string> = {
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  DEVELOPING: 'Developing',
  GREENLIT: 'Greenlit',
}

const columnColors: Record<WhiteboardStatus, string> = {
  PACKAGING: 'from-orange-700 to-orange-600',
  PITCHED: 'from-amber-600 to-yellow-500',
  DEVELOPING: 'from-amber-700 to-amber-600',
  GREENLIT: 'from-emerald-700 to-emerald-600',
}

const cardColors = [
  'bg-amber-50 border-amber-200',
  'bg-orange-50 border-orange-200',
  'bg-yellow-50 border-yellow-200',
  'bg-stone-50 border-stone-200',
]

export default function WhiteboardClient({ initialProjects }: { initialProjects: ProjectItem[] }) {
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const columns = useMemo(() => {
    const grouped: Record<WhiteboardStatus, ProjectItem[]> = {
      PACKAGING: [],
      PITCHED: [],
      DEVELOPING: [],
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
    <div className="h-full min-h-screen bg-amber-50/50">
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">In Development</h1>
            <p className="text-amber-200/80 text-sm mt-1">
              Drag and drop projects between columns — {projects.length} projects
            </p>
          </div>
          <AddProjectButton />
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {WHITEBOARD_COLUMNS.map((status, columnIndex) => (
            <div key={status} className="w-80 flex-shrink-0">
              <div className={`bg-gradient-to-r ${columnColors[status]} rounded-t-xl p-4 shadow-md`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">{columnLabels[status]}</h2>
                  <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                    {columns[status].length}
                  </span>
                </div>
              </div>

              <div
                className="bg-amber-100/80 rounded-b-xl p-3 min-h-[calc(100vh-220px)] shadow-inner"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const projectId = e.dataTransfer.getData('text/project-id')
                  if (projectId) moveProject(projectId, status)
                }}
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 20% 20%, rgba(139, 69, 19, 0.03) 1px, transparent 1px),
                    radial-gradient(circle at 80% 80%, rgba(139, 69, 19, 0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              >
                <div className="space-y-3">
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
                        className={`${draggingId === project.id ? 'opacity-50' : ''} ${isSaving ? 'ring-2 ring-amber-500' : ''}`}
                      >
                        <ProjectCard project={project} colorClass={colorClass} writerName={writerName} />
                      </div>
                    )
                  })}
                </div>

                {columns[status].length === 0 && (
                  <div className="text-center py-12 text-amber-800/40">
                    <p className="text-sm">Drop projects here</p>
                  </div>
                )}
              </div>
            </div>
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
          rounded-lg p-4 shadow-sm hover:shadow-md
          transition-all duration-200
          hover:-translate-y-0.5
          border
          relative
          overflow-hidden
          cursor-grab active:cursor-grabbing
        `}
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-700/30 shadow-sm" />

        <div className="absolute top-2 right-2">
          {isHawcoOriginal ? (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" title="Hawco Original" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" title="External" />
          )}
        </div>

        <div className="pt-3">
          <h3 className="font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">{project.title}</h3>

          {project.genre && (
            <span className="inline-block px-2 py-0.5 bg-amber-800/10 text-amber-900 text-xs rounded font-medium mb-2">
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
            <div className="mt-3 pt-3 border-t border-amber-900/10">
              <p className="text-xs text-slate-500 line-clamp-2">{project.currentStage || project.notes}</p>
            </div>
          )}

          {project.nextAction && (
            <div className="mt-2">
              <p className="text-xs text-amber-800 font-medium line-clamp-2">{project.nextAction}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
