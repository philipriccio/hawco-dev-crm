import Link from 'next/link'
import { prisma } from '@/lib/db'
import { ProjectStatus, ProjectOrigin } from '@prisma/client'
import AddProjectButton from './AddProjectButton'

export const dynamic = 'force-dynamic'

// Whiteboard columns in order
const WHITEBOARD_COLUMNS: ProjectStatus[] = [
  'DEVELOPING',
  'PACKAGING', 
  'PITCHED',
  'GREENLIT',
]

const columnLabels: Record<string, string> = {
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  GREENLIT: 'Greenlit',
}

const columnColors: Record<string, string> = {
  DEVELOPING: 'from-amber-700 to-amber-600',
  PACKAGING: 'from-orange-700 to-orange-600',
  PITCHED: 'from-amber-600 to-yellow-500',
  GREENLIT: 'from-emerald-700 to-emerald-600',
}

// Corkboard paper colors for cards
const cardColors = [
  'bg-amber-50 border-amber-200',
  'bg-orange-50 border-orange-200',
  'bg-yellow-50 border-yellow-200',
  'bg-stone-50 border-stone-200',
]

interface ProjectWithContacts {
  id: string
  title: string
  genre: string | null
  origin: ProjectOrigin
  currentStage: string | null
  notes: string | null
  nextAction: string | null
  updatedAt: Date
  contacts: {
    contact: {
      name: string
    }
  }[]
}

export default async function WhiteboardPage() {
  // Fetch all projects in whiteboard statuses
  const projects = await prisma.project.findMany({
    where: {
      status: {
        in: WHITEBOARD_COLUMNS,
      },
    },
    include: {
      contacts: {
        include: { contact: true },
        where: { role: 'WRITER' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Group projects by status
  const columns: Record<string, ProjectWithContacts[]> = {
    DEVELOPING: [],
    PACKAGING: [],
    PITCHED: [],
    GREENLIT: [],
  }

  for (const project of projects) {
    if (WHITEBOARD_COLUMNS.includes(project.status as ProjectStatus)) {
      columns[project.status].push(project as ProjectWithContacts)
    }
  }

  return (
    <div className="h-full min-h-screen bg-amber-50/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white px-8 py-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">In Development</h1>
            <p className="text-amber-200/80 text-sm mt-1">
              Active development slate — {projects.length} projects
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-200/80">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              Hawco Original
              <span className="w-3 h-3 rounded-full bg-slate-400 ml-2"></span>
              External
            </div>
            <AddProjectButton />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {WHITEBOARD_COLUMNS.map((status, columnIndex) => (
            <div
              key={status}
              className="w-80 flex-shrink-0"
            >
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${columnColors[status]} rounded-t-xl p-4 shadow-md`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">{columnLabels[status]}</h2>
                  <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                    {columns[status].length}
                  </span>
                </div>
              </div>

              {/* Column Body - Corkboard texture */}
              <div 
                className="bg-amber-100/80 rounded-b-xl p-3 min-h-[calc(100vh-220px)] shadow-inner"
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

                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        colorClass={colorClass}
                        writerName={writerName}
                      />
                    )
                  })}
                </div>

                {columns[status].length === 0 && (
                  <div className="text-center py-12 text-amber-800/40">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm">No projects</p>
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
  project: ProjectWithContacts
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
        `}
      >
        {/* Pin effect */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-700/30 shadow-sm" />
        
        {/* Origin indicator */}
        <div className="absolute top-2 right-2">
          {isHawcoOriginal ? (
            <span 
              className="w-2.5 h-2.5 rounded-full bg-amber-500 block" 
              title="Hawco Original"
            />
          ) : (
            <span 
              className="w-2.5 h-2.5 rounded-full bg-slate-400 block" 
              title="External"
            />
          )}
        </div>

        {/* Content */}
        <div className="pt-3">
          {/* Title */}
          <h3 className="font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">
            {project.title}
          </h3>

          {/* Genre Badge */}
          {project.genre && (
            <span className="inline-block px-2 py-0.5 bg-amber-800/10 text-amber-900 text-xs rounded font-medium mb-2">
              {project.genre}
            </span>
          )}

          {/* Writer */}
          {writerName && (
            <p className="text-sm text-slate-600 mb-2">
              <span className="text-slate-400">by </span>
              {writerName}
            </p>
          )}

          {/* Current Stage / Notes */}
          {(project.currentStage || project.notes) && (
            <div className="mt-3 pt-3 border-t border-amber-900/10">
              <p className="text-xs text-slate-500 line-clamp-2">
                {project.currentStage || project.notes}
              </p>
            </div>
          )}

          {/* Next Action */}
          {project.nextAction && (
            <div className="mt-2 flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-xs text-amber-800 font-medium line-clamp-2">
                {project.nextAction}
              </p>
            </div>
          )}

          {/* Origin label for Hawco Originals */}
          {isHawcoOriginal && (
            <div className="mt-3 pt-2 border-t border-amber-900/10">
              <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                Hawco Original
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
