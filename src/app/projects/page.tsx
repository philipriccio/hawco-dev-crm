import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  READING: 'bg-yellow-100 text-yellow-700',
  CONSIDERING: 'bg-purple-100 text-purple-700',
  PASSED: 'bg-red-100 text-red-700',
  DEVELOPING: 'bg-green-100 text-green-700',
  PACKAGING: 'bg-indigo-100 text-indigo-700',
  PITCHED: 'bg-orange-100 text-orange-700',
  GREENLIT: 'bg-emerald-100 text-emerald-700',
  IN_PRODUCTION: 'bg-teal-100 text-teal-700',
  ON_HOLD: 'bg-slate-100 text-slate-700',
}

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  READING: 'Reading',
  CONSIDERING: 'Considering',
  PASSED: 'Passed',
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  GREENLIT: 'Greenlit',
  IN_PRODUCTION: 'In Production',
  ON_HOLD: 'On Hold',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; origin?: string; search?: string }>
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
    ]
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      contacts: {
        include: { contact: true },
        where: { role: 'WRITER' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  const counts = await prisma.project.groupBy({
    by: ['status'],
    _count: { status: true },
  })

  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count.status])
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Track submissions, development, and your active slate</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterPill href="/projects" active={!params.status} count={projects.length}>
            All
          </FilterPill>
          <FilterPill href="/projects?status=submitted" active={params.status === 'submitted'} count={countMap['SUBMITTED'] || 0}>
            Submitted
          </FilterPill>
          <FilterPill href="/projects?status=reading" active={params.status === 'reading'} count={countMap['READING'] || 0}>
            Reading
          </FilterPill>
          <FilterPill href="/projects?status=developing" active={params.status === 'developing'} count={countMap['DEVELOPING'] || 0}>
            Developing
          </FilterPill>
          <FilterPill href="/projects?status=passed" active={params.status === 'passed'} count={countMap['PASSED'] || 0}>
            Passed
          </FilterPill>
        </div>
      </div>

      {/* Project List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Writer</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Genre</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/projects/${project.id}`} className="block">
                    <p className="font-medium text-slate-900 hover:text-amber-600">{project.title}</p>
                    {project.logline && (
                      <p className="text-sm text-slate-500 truncate max-w-md">{project.logline}</p>
                    )}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {project.contacts[0]?.contact.name || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {project.genre || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {project.format || '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-slate-100 text-slate-700'}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {project.verdict || '—'}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No projects found. <Link href="/projects/new" className="text-amber-600 hover:underline">Add your first project</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
          ? 'bg-amber-500 text-white' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-amber-200' : 'text-slate-400'}`}>
        {count}
      </span>
    </Link>
  )
}
