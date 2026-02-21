import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Verdict } from '@prisma/client'

export const dynamic = 'force-dynamic'

const verdictColors: Record<Verdict, string> = {
  PASS: 'bg-red-100 text-red-700 border-red-200',
  CONSIDER: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  RECOMMEND: 'bg-green-100 text-green-700 border-green-200',
}

const verdictLabels: Record<Verdict, string> = {
  PASS: 'Pass',
  CONSIDER: 'Consider',
  RECOMMEND: 'Recommend',
}

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string; search?: string }>
}) {
  const params = await searchParams

  const where: Record<string, unknown> = {}

  if (params.verdict) {
    where.verdict = params.verdict.toUpperCase()
  }

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { writer: { contains: params.search, mode: 'insensitive' } },
      { logline: { contains: params.search, mode: 'insensitive' } },
    ]
  }

  const coverages = await prisma.coverage.findMany({
    where,
    orderBy: { dateRead: 'desc' },
  })

  const counts = await prisma.coverage.groupBy({
    by: ['verdict'],
    _count: { verdict: true },
  })

  const countMap = Object.fromEntries(
    counts.map((c) => [c.verdict, c._count.verdict])
  )

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Coverage</h1>
          <p className="text-slate-500 mt-1">Script assessments and reading notes</p>
        </div>
        <Link
          href="/coverage/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Coverage
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterPill href="/coverage" active={!params.verdict} count={coverages.length}>
            All
          </FilterPill>
          <FilterPill href="/coverage?verdict=recommend" active={params.verdict === 'recommend'} count={countMap['RECOMMEND'] || 0}>
            Recommend
          </FilterPill>
          <FilterPill href="/coverage?verdict=consider" active={params.verdict === 'consider'} count={countMap['CONSIDER'] || 0}>
            Consider
          </FilterPill>
          <FilterPill href="/coverage?verdict=pass" active={params.verdict === 'pass'} count={countMap['PASS'] || 0}>
            Pass
          </FilterPill>
        </div>
      </div>

      {/* Coverage List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Writer</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Read</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coverages.map((coverage) => (
              <tr key={coverage.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link href={`/coverage/${coverage.id}`} className="block">
                    <p className="font-medium text-slate-900 hover:text-amber-600">{coverage.title}</p>
                    {coverage.logline && (
                      <p className="text-sm text-slate-500 truncate max-w-md">{coverage.logline}</p>
                    )}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {coverage.writer}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {coverage.format || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {formatDate(coverage.dateRead)}
                </td>
                <td className="px-6 py-4">
                  {coverage.scoreTotal !== null ? (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      coverage.scoreTotal >= 40 ? 'bg-green-100 text-green-700' :
                      coverage.scoreTotal >= 30 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {coverage.scoreTotal}/50
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${verdictColors[coverage.verdict]}`}>
                    {verdictLabels[coverage.verdict]}
                  </span>
                </td>
              </tr>
            ))}
            {coverages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No coverage found. <Link href="/coverage/new" className="text-amber-600 hover:underline">Add your first coverage</Link>
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
  children,
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
