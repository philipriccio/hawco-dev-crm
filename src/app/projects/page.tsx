import Link from 'next/link'
import type { MaterialType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { targetBuyerRoleLabel } from '@/lib/target-buyers'

export const dynamic = 'force-dynamic'

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  READING: 'bg-yellow-100 text-yellow-700',
  CONSIDERING: 'bg-purple-100 text-purple-700',
  CONSIDER_RELATIONSHIP: 'bg-fuchsia-100 text-fuchsia-700',
  PASSED: 'bg-red-100 text-red-700',
  EARLY_DEVELOPMENT: 'bg-sky-100 text-sky-700',
  DEVELOPING: 'bg-green-100 text-green-700',
  REWRITE_IN_PROGRESS: 'bg-rose-100 text-rose-700',
  PACKAGING: 'bg-indigo-100 text-indigo-700',
  PITCHED: 'bg-orange-100 text-orange-700',
  DEVELOPING_WITH_NETWORK: 'bg-pink-100 text-pink-700',
  GREENLIT: 'bg-emerald-100 text-emerald-700',
  IN_PRODUCTION: 'bg-teal-100 text-teal-700',
  READ: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-[#F2F4F7] text-slate-700',
  RELEASED: 'bg-cyan-100 text-cyan-700',
}

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  READING: 'To be Read',
  CONSIDERING: 'Considering',
  CONSIDER_RELATIONSHIP: 'Consider Relationship',
  PASSED: 'Passed',
  EARLY_DEVELOPMENT: 'Early Development',
  DEVELOPING: 'Developing',
  REWRITE_IN_PROGRESS: 'Rewrite in Progress',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  DEVELOPING_WITH_NETWORK: 'Developing with Network',
  GREENLIT: 'Greenlit',
  IN_PRODUCTION: 'In Production',
  READ: 'Read',
  ON_HOLD: 'On Hold',
  RELEASED: 'Released',
}

const materialTypeLabels: Record<MaterialType, string> = {
  PILOT_SCRIPT: 'Pilot Script',
  SERIES_BIBLE: 'Series Bible',
  PITCH_DECK: 'Pitch Deck',
  ONE_PAGER: 'One Pager',
  TREATMENT: 'Treatment',
  FEATURE_SCRIPT: 'Feature Script',
  AGREEMENT: 'Agreement',
  OTHER: 'Other',
}

type ProjectsSearchParams = {
  status?: string
  origin?: string
  search?: string
  sort?: string
  verdict?: string
}

function projectsHref(
  params: ProjectsSearchParams,
  updates: Partial<Record<keyof ProjectsSearchParams, string | undefined>>
) {
  const nextParams = new URLSearchParams()
  Object.entries({ ...params, ...updates }).forEach(([key, value]) => {
    if (value) nextParams.set(key, value)
  })
  const query = nextParams.toString()
  return query ? `/projects?${query}` : '/projects'
}

function formatDate(value: Date | null) {
  return value
    ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not recorded'
}

function materialLabel(type: MaterialType, count: number) {
  const label = materialTypeLabels[type]
  return count === 1 ? label : `${count} ${label}${label.endsWith('s') ? '' : 's'}`
}

type CoverageVerdictRecord = {
  verdict: string
  dateRead: Date
  createdAt: Date
}

type ProjectVerdictSources = {
  verdict: string | null
  coverages: CoverageVerdictRecord[]
  materials: Array<{ coverages: CoverageVerdictRecord[] }>
}

function effectiveProjectVerdict(project: ProjectVerdictSources) {
  if (project.verdict) return project.verdict

  const latestCoverage = [
    ...project.coverages,
    ...project.materials.flatMap((material) => material.coverages),
  ].sort((a, b) => {
    const dateReadDifference = b.dateRead.getTime() - a.dateRead.getTime()
    return dateReadDifference || b.createdAt.getTime() - a.createdAt.getTime()
  })[0]

  return latestCoverage?.verdict ?? null
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<ProjectsSearchParams>
}) {
  const params = await searchParams
  
  const where: Record<string, unknown> = {}
  
  if (params.status) {
    where.status = params.status.toUpperCase()
  }
  if (params.origin) {
    where.origin = params.origin.toUpperCase()
  }
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { logline: { contains: params.search, mode: 'insensitive' } },
      { genre: { contains: params.search, mode: 'insensitive' } },
      { contacts: { some: { contact: { name: { contains: params.search, mode: 'insensitive' } } } } },
    ]
  }

  // Date sorting happens below using the latest related Material.createdAt.
  // Projects without materials always stay at the end of either date view.
  let orderBy: { title: 'asc' | 'desc' } = { title: 'asc' }
  if (params.sort === 'title-desc') {
    orderBy = { title: 'desc' }
  }

  const coverageVerdictSelect = {
    verdict: true,
    dateRead: true,
    createdAt: true,
  } as const

  const [projects, counts, verdictSourceProjects] = await Promise.all([
    prisma.project.findMany({
    where,
    include: {
      contacts: {
        include: { contact: true },
        where: { role: 'WRITER' },
        orderBy: { contact: { name: 'asc' } },
      },
      coverages: {
        select: coverageVerdictSelect,
      },
      materials: {
        select: {
          type: true,
          createdAt: true,
          coverages: { select: coverageVerdictSelect },
        },
        orderBy: { createdAt: 'desc' },
      },
      companies: {
        where: { role: { startsWith: 'TARGET_BUYER' } },
        include: { company: true },
        orderBy: { company: { name: 'asc' } },
      },
    },
    orderBy,
    }),
    prisma.project.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.project.findMany({
      select: {
        verdict: true,
        coverages: { select: coverageVerdictSelect },
        materials: {
          select: { coverages: { select: coverageVerdictSelect } },
        },
      },
    }),
  ])

  const projectsWithEffectiveVerdict = projects.map((project) => ({
    ...project,
    effectiveVerdict: effectiveProjectVerdict(project),
  }))

  const verdictFilteredProjects = params.verdict
    ? projectsWithEffectiveVerdict.filter(
        (project) => project.effectiveVerdict === params.verdict?.toUpperCase()
      )
    : projectsWithEffectiveVerdict

  const sortedProjects = [...verdictFilteredProjects].sort((a, b) => {
    if (params.sort !== 'date-desc' && params.sort !== 'date-asc') return 0

    const aLatestUpload = a.materials[0]?.createdAt ?? null
    const bLatestUpload = b.materials[0]?.createdAt ?? null
    if (aLatestUpload === null && bLatestUpload !== null) return 1
    if (aLatestUpload !== null && bLatestUpload === null) return -1

    const direction = params.sort === 'date-desc' ? -1 : 1
    if (aLatestUpload && bLatestUpload) {
      const uploadDifference = aLatestUpload.getTime() - bLatestUpload.getTime()
      if (uploadDifference !== 0) return uploadDifference * direction
    }

    const aReceived = a.dateReceived?.getTime() ?? a.createdAt.getTime()
    const bReceived = b.dateReceived?.getTime() ?? b.createdAt.getTime()
    if (aReceived !== bReceived) return (aReceived - bReceived) * direction
    return a.title.localeCompare(b.title)
  })

  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count.status])
  )
  const verdictCountMap = verdictSourceProjects.reduce<Record<string, number>>((result, project) => {
    const verdict = effectiveProjectVerdict(project)
    if (verdict) result[verdict] = (result[verdict] ?? 0) + 1
    return result
  }, {})

  const verdictLabel = (verdict: string | null) => {
    if (verdict === 'PASS') return 'Pass'
    if (verdict === 'CONSIDER') return 'Consider'
    if (verdict === 'RECOMMEND') return 'Recommend'
    return verdict || '—'
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Track submissions, development, and your active slate</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ''}
              placeholder="Search projects by title, logline, writer, or genre..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {params.origin && <input type="hidden" name="origin" value={params.origin} />}
          {params.verdict && <input type="hidden" name="verdict" value={params.verdict} />}
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          <button type="submit" className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8]">
            Search
          </button>
          {params.search && (
            <Link href={projectsHref(params, { search: undefined })} className="px-4 py-2 text-center text-slate-600 hover:text-slate-900">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterPill href={projectsHref(params, { status: undefined, verdict: undefined })} active={!params.status && !params.verdict} count={projects.length}>
            All
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: undefined, verdict: 'recommend' })} active={params.verdict === 'recommend'} count={verdictCountMap['RECOMMEND'] || 0}>
            Recommend
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: undefined, verdict: 'consider' })} active={params.verdict === 'consider'} count={verdictCountMap['CONSIDER'] || 0}>
            Consider
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: undefined, verdict: 'pass' })} active={params.verdict === 'pass'} count={verdictCountMap['PASS'] || 0}>
            Pass
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'submitted', verdict: undefined })} active={params.status === 'submitted'} count={countMap['SUBMITTED'] || 0}>
            Submitted
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'reading', verdict: undefined })} active={params.status === 'reading'} count={countMap['READING'] || 0}>
            To be Read
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'read', verdict: undefined })} active={params.status === 'read'} count={countMap['READ'] || 0}>
            Read
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'considering', verdict: undefined })} active={params.status === 'considering'} count={countMap['CONSIDERING'] || 0}>
            Considering
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'early_development', verdict: undefined })} active={params.status === 'early_development'} count={countMap['EARLY_DEVELOPMENT'] || 0}>
            Early Development
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'developing', verdict: undefined })} active={params.status === 'developing'} count={countMap['DEVELOPING'] || 0}>
            Developing
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'consider_relationship', verdict: undefined })} active={params.status === 'consider_relationship'} count={countMap['CONSIDER_RELATIONSHIP'] || 0}>
            Consider Relationship
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'rewrite_in_progress', verdict: undefined })} active={params.status === 'rewrite_in_progress'} count={countMap['REWRITE_IN_PROGRESS'] || 0}>
            Rewrites
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'packaging', verdict: undefined })} active={params.status === 'packaging'} count={countMap['PACKAGING'] || 0}>
            Packaging
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'developing_with_network', verdict: undefined })} active={params.status === 'developing_with_network'} count={countMap['DEVELOPING_WITH_NETWORK'] || 0}>
            Developing with Network
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'passed', verdict: undefined })} active={params.status === 'passed'} count={countMap['PASSED'] || 0}>
            Passed
          </FilterPill>
          <FilterPill href={projectsHref(params, { status: 'released', verdict: undefined })} active={params.status === 'released'} count={countMap['RELEASED'] || 0}>
            Released
          </FilterPill>
        </div>
      </div>

      {/* Sort Options */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-sm text-slate-500">Sort by:</span>
          <div className="flex flex-wrap gap-2">
            <SortButton href={projectsHref(params, { sort: 'title' })} active={!params.sort || params.sort === 'title'}>
              A-Z
            </SortButton>
            <SortButton href={projectsHref(params, { sort: 'title-desc' })} active={params.sort === 'title-desc'}>
              Z-A
            </SortButton>
            <SortButton href={projectsHref(params, { sort: 'date-desc' })} active={params.sort === 'date-desc'}>
              Newest upload
            </SortButton>
            <SortButton href={projectsHref(params, { sort: 'date-asc' })} active={params.sort === 'date-asc'}>
              Oldest upload
            </SortButton>
          </div>
        </div>
      </div>

      {/* Project List */}
      <div className="space-y-3">
            {sortedProjects.map((project) => {
              const materialCounts = project.materials.reduce<Partial<Record<MaterialType, number>>>((countsByType, material) => {
                countsByType[material.type] = (countsByType[material.type] ?? 0) + 1
                return countsByType
              }, {})
              const latestUploadAt = project.materials[0]?.createdAt ?? null

              return (
              <article key={project.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-colors hover:border-slate-300 hover:bg-slate-50/50 sm:p-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(15rem,1.25fr)_minmax(11rem,0.8fr)_minmax(10rem,0.75fr)] xl:items-start">
                <div className="min-w-0">
                  <Link href={`/projects/${project.id}`} className="block">
                    <h2 className="text-lg font-semibold text-slate-900 hover:text-[#2563EB]">{project.title}</h2>
                    {project.logline && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.logline}</p>
                    )}
                  </Link>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Writer:</span>{' '}
                    {project.contacts.map((pc) => pc.contact.name).join(', ') || 'Not recorded'}
                  </p>
                  {(project.genre || project.format) && (
                    <p className="mt-1 text-xs text-slate-500">{[project.genre, project.format].filter(Boolean).join(' · ')}</p>
                  )}
                  {project.companies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.companies.map((pc) => (
                        <Link
                          key={pc.id}
                          href={`/buyers/${pc.company.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE]"
                        >
                          <span>{pc.company.name}</span>
                          <span className="text-[#64748B]">{targetBuyerRoleLabel(pc.role)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Materials</p>
                    {project.materials.length > 0 && (
                      <Link href={`/materials?projectId=${project.id}`} className="text-xs font-medium text-[#2563EB] hover:underline">
                        View all {project.materials.length}
                      </Link>
                    )}
                  </div>
                  {project.materials.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(Object.entries(materialCounts) as Array<[MaterialType, number]>).map(([type, count]) => (
                        <span key={type} className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {materialLabel(type, count)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-amber-700">No materials uploaded</p>
                  )}
                </div>

                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest upload</dt>
                    <dd className={`mt-1 font-medium ${latestUploadAt ? 'text-slate-800' : 'text-slate-400'}`}>{formatDate(latestUploadAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email received</dt>
                    <dd className={`mt-1 ${project.dateReceived ? 'text-slate-700' : 'text-slate-400'}`}>{formatDate(project.dateReceived)}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workflow</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-[#F2F4F7] text-slate-700'}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                    {project.effectiveVerdict && (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {verdictLabel(project.effectiveVerdict)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-sm">
                    {project.coverages.length > 0 || project.materials.some((material) => material.coverages.length > 0) ? (
                      <Link href={`/projects/${project.id}`} className="font-medium text-green-700 hover:underline">Coverage available</Link>
                    ) : (
                      <Link href={`/projects/${project.id}`} className="text-slate-500 hover:underline">No coverage yet</Link>
                    )}
                  </div>
                </div>
                </div>
              </article>
              )
            })}
            {sortedProjects.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
                  No projects found. <Link href="/projects/new" className="text-[#2563EB] hover:underline">Add your first project</Link>
              </div>
            )}
      </div>
    </div>
  )
}

function FilterPill({ 
  href, 
  active, 
  count, 
  children 
}: { 
  href: string
  active: boolean
  count: number
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active 
          ? 'bg-[#2563EB] text-white' 
          : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-blue-200' : 'text-slate-400'}`}>
        {count}
      </span>
    </Link>
  )
}

function SortButton({ 
  href, 
  active, 
  children 
}: { 
  href: string
  active: boolean
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        active 
          ? 'bg-slate-700 text-white' 
          : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </Link>
  )
}
