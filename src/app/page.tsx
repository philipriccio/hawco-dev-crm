import Link from 'next/link'
import { MaterialType, Prisma, Verdict } from '@prisma/client'
import { prisma } from '@/lib/db'
import FollowUpWidget from '@/components/FollowUpWidget'
import DashboardUnreadScripts from '@/components/DashboardUnreadScripts'
import {
  PITCH_DECK_MATERIAL_TYPES,
  READABLE_MATERIAL_TYPES,
  SCRIPT_MATERIAL_TYPES,
  getAgeDisplay,
  getEstimatedReadTime,
  getPriority,
  getPrioritySortValue,
  getVerdictTone,
  writerLevelBoost,
} from '@/lib/dashboard-helpers'

export const dynamic = 'force-dynamic'

const WEEKLY_READ_GOAL = 3
const SCRIPT_READ_QUEUE_HREF = `/materials?type=${SCRIPT_MATERIAL_TYPES.join(',')}&read=unread`
const PITCH_DECK_QUEUE_HREF = `/materials?type=${PITCH_DECK_MATERIAL_TYPES.join(',')}&read=unread`
const READ_MATERIALS_HREF = `/materials?type=${READABLE_MATERIAL_TYPES.join(',')}&read=read`
const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  PILOT_SCRIPT: 'TV Pilot',
  FEATURE_SCRIPT: 'Feature Script',
  PITCH_DECK: 'Pitch Deck',
  ONE_PAGER: 'One Pager',
  SERIES_BIBLE: 'Series Bible',
  TREATMENT: 'Treatment',
  OTHER: 'Other',
}
const MATERIAL_TYPE_PLURAL_LABELS: Record<MaterialType, string> = {
  PILOT_SCRIPT: 'TV pilots',
  FEATURE_SCRIPT: 'feature scripts',
  PITCH_DECK: 'pitch decks',
  ONE_PAGER: 'one pagers',
  SERIES_BIBLE: 'series bibles',
  TREATMENT: 'treatments',
  OTHER: 'other',
}

type DashboardMaterial = Prisma.MaterialGetPayload<{
  include: {
    writer: true
    submittedBy: true
    coverages: true
    project: {
      include: {
        sourceContact: true
        contacts: { where: { role: 'WRITER' }, include: { contact: true }, orderBy: { contact: { name: 'asc' } } }
        coverages: true
      }
    }
  }
}>

type ReadStatsMaterial = Pick<DashboardMaterial, 'readAt'>

type PillTone = 'priority-high' | 'priority-medium' | 'priority-low' | 'status' | 'verdict-green'
type UnreadSort = 'priority' | 'newest' | 'oldest'

function dashboardUnreadWhere(types: MaterialType[]): Prisma.MaterialWhereInput {
  return {
    type: { in: types },
    readAt: null,
    OR: [
      { projectId: null },
      { project: { status: { notIn: ['READ', 'PASSED', 'CONSIDERING'] }, verdict: null } },
    ],
  }
}

const DASHBOARD_UNREAD_SCRIPT_WHERE = dashboardUnreadWhere(SCRIPT_MATERIAL_TYPES)
const DASHBOARD_UNREAD_PITCH_DECK_WHERE = dashboardUnreadWhere(PITCH_DECK_MATERIAL_TYPES)

const UNREAD_SORT_OPTIONS: Array<{ value: UnreadSort; label: string }> = [
  { value: 'newest', label: 'Newest upload' },
  { value: 'oldest', label: 'Oldest upload' },
  { value: 'priority', label: 'Priority' },
]

function parseUnreadSort(value: string | undefined): UnreadSort {
  if (value === 'oldest' || value === 'priority') return value
  return 'newest'
}

function pillClass(tone: PillTone) {
  switch (tone) {
    case 'priority-high':
      return 'bg-[#fee2e2] text-[#991b1b]'
    case 'priority-medium':
      return 'bg-[#fef3c7] text-[#92400e]'
    case 'priority-low':
      return 'bg-[#f4f4f5] text-[#71717a]'
    case 'status':
      return 'bg-[#ede9fe] text-[#5b21b6]'
    case 'verdict-green':
      return 'bg-[#dcfce7] text-[#166534]'
  }
}

function Pill({ children, tone }: { children: React.ReactNode; tone: PillTone }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClass(tone)}`}>{children}</span>
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function materialTypeLabel(type: MaterialType) {
  return MATERIAL_TYPE_LABELS[type] || type.replace('_', ' ')
}

function materialTitle(material: DashboardMaterial) {
  return material.title || material.project?.title || 'Untitled'
}

function materialWriter(material: DashboardMaterial) {
  const projectWriters = material.project?.contacts?.map((pc) => pc.contact.name).filter(Boolean).join(', ')
  return material.writer?.name || projectWriters || material.submittedBy?.name || 'Unknown writer'
}

function sourceName(material: DashboardMaterial, directFallback = false) {
  const source = material.project?.sourceContact || material.submittedBy
  if (source?.name) return source.name
  if (directFallback) return material.writer?.name ? `${material.writer.name} (direct)` : '—'
  return '—'
}

function receivedDate(material: DashboardMaterial) {
  return material.project?.dateReceived || material.createdAt
}

function projectHref(material: DashboardMaterial) {
  return material.projectId ? `/projects/${material.projectId}` : '/materials'
}

function verdictPillTone(verdict: Verdict | null | undefined): PillTone {
  const tone = getVerdictTone(verdict)
  if (tone === 'green') return 'verdict-green'
  if (tone === 'amber') return 'priority-medium'
  return 'priority-low'
}

function pickCoverage(material: DashboardMaterial) {
  const projectCoverages = material.projectId
    ? (material.project?.coverages || []).filter((coverage) => coverage.projectId === material.projectId)
    : []
  const directCoverages = material.coverages.filter((coverage) => coverage.scriptId === material.id)
  const coverageMap = new Map<string, (typeof projectCoverages | typeof directCoverages)[number]>()

  for (const coverage of [...projectCoverages, ...directCoverages]) {
    coverageMap.set(coverage.id, coverage)
  }

  const projectFirst = Array.from(coverageMap.values())
  const phil = projectFirst.filter((coverage) => coverage.reader?.toLowerCase() === 'phil')
  const candidates = phil.length > 0 ? phil : projectFirst
  const selected = candidates.sort((a, b) => b.dateRead.getTime() - a.dateRead.getTime())[0]
  return {
    selected,
    duplicatePhilCount: phil.length,
    nonPhilReader: phil.length === 0 ? selected?.reader : null,
  }
}

function getUnreadRows(unreadMaterials: DashboardMaterial[], now: Date, sort: UnreadSort) {
  const rows = unreadMaterials
    .map((material) => {
      const age = getAgeDisplay(receivedDate(material), now)
      const priority = getPriority(material.project?.status, age.days)
      return { material, age, priority }
    })

  return rows.sort((a, b) => {
    if (sort === 'newest') {
      return b.material.createdAt.getTime() - a.material.createdAt.getTime()
    }

    if (sort === 'oldest') {
      return a.material.createdAt.getTime() - b.material.createdAt.getTime()
    }

      const priorityDelta = getPrioritySortValue(b.priority) - getPrioritySortValue(a.priority)
      if (priorityDelta !== 0) return priorityDelta
      return (b.age.days || 0) - (a.age.days || 0)
  })
}

function getTodaysPick(unreadRows: ReturnType<typeof getUnreadRows>, priorBoostWriterIds: Set<string>) {
  const scored = unreadRows
    .filter(({ material }) => material.project?.status === 'SUBMITTED' || material.project?.status === 'READING')
    .map(({ material, age }) => {
      const reasons: string[] = []
      const ageDays = age.days || 0
      let score = ageDays
      if (material.writer?.writerTier === 'WANT_TO_WORK_WITH') {
        score += 30
        reasons.push('writer tier: want to work with')
      }
      const source = material.project?.sourceContact || material.submittedBy
      if (source?.writerTier === 'WANT_TO_WORK_WITH') {
        score += 30
        reasons.push('source writer tier: want to work with')
      }
      if (material.project?.considerRelationship) {
        score += 30
        reasons.push('relationship consideration')
      }
      if (material.writerId && priorBoostWriterIds.has(material.writerId)) {
        score += 14
        reasons.push('prior CONSIDER/RECOMMEND from this writer')
      }
      if (writerLevelBoost(material.writer?.writerLevel)) {
        score += 7
        reasons.push(`${material.writer?.writerLevel?.toLowerCase().replace('_', ' ')} writer`)
      }
      return { material, age, score, reasons }
    })
    .sort((a, b) => (b.score - a.score) || ((b.age.days || 0) - (a.age.days || 0)))

  return scored[0]
}

function splitNextSteps(value: string | null) {
  return (value || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getWeekBuckets(now: Date) {
  return Array.from({ length: 12 }, (_, index) => {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    end.setDate(end.getDate() - (11 - index) * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return { start, end, count: 0 }
  })
}

function buildReadingStats(readMaterials: ReadStatsMaterial[], now: Date) {
  const buckets = getWeekBuckets(now)
  for (const material of readMaterials) {
    if (!material.readAt) continue
    const readAt = material.readAt.getTime()
    const bucket = buckets.find((week) => readAt >= week.start.getTime() && readAt <= week.end.getTime())
    if (bucket) bucket.count += 1
  }

  let streak = 0
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    if (buckets[i].count >= WEEKLY_READ_GOAL) streak += 1
    else break
  }

  return { buckets, thisWeek: buckets[buckets.length - 1].count, streak, max: Math.max(WEEKLY_READ_GOAL, ...buckets.map((b) => b.count)) }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ unreadSort?: string }>
}) {
  const params = await searchParams
  const unreadSort = parseUnreadSort(params.unreadSort)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  const monthStart = new Date(now)
  monthStart.setMonth(now.getMonth() - 1)
  const yearStart = new Date(now)
  yearStart.setFullYear(now.getFullYear() - 1)
  const activeWriterStart = new Date(now)
  activeWriterStart.setDate(now.getDate() - 90)
  const twelveWeekStart = new Date(now)
  twelveWeekStart.setDate(now.getDate() - 83)

  const [
    unreadScriptsAll,
    unreadPitchDecksAll,
    readScripts,
    unreadScriptsCount,
    unreadPitchDecksCount,
    readScriptsCount,
    agedThirtyCount,
    writersTrackedCount,
    activeWritersCount,
    readCountWeek,
    readCountMonth,
    readCountYear,
    recentReadForStats,
    priorRelationshipCoverages,
    pendingFollowUps,
    recentMeetings,
    projectsWithNextSteps,
  ] = await Promise.all([
    prisma.material.findMany({
      where: DASHBOARD_UNREAD_SCRIPT_WHERE,
      include: {
        writer: true,
        submittedBy: true,
        coverages: true,
        project: {
          include: {
            sourceContact: true,
            contacts: { where: { role: 'WRITER' }, include: { contact: true }, orderBy: { contact: { name: 'asc' } } },
            coverages: true,
          },
        },
      },
    }),
    prisma.material.findMany({
      where: DASHBOARD_UNREAD_PITCH_DECK_WHERE,
      include: {
        writer: true,
        submittedBy: true,
        coverages: true,
        project: {
          include: {
            sourceContact: true,
            contacts: { where: { role: 'WRITER' }, include: { contact: true }, orderBy: { contact: { name: 'asc' } } },
            coverages: true,
          },
        },
      },
    }),
    prisma.material.findMany({
      where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { not: null } },
      include: {
        writer: true,
        submittedBy: true,
        coverages: true,
        project: {
          include: {
            sourceContact: true,
            contacts: { where: { role: 'WRITER' }, include: { contact: true }, orderBy: { contact: { name: 'asc' } } },
            coverages: true,
          },
        },
      },
      orderBy: { readAt: 'desc' },
      take: 8,
    }),
    prisma.material.count({ where: DASHBOARD_UNREAD_SCRIPT_WHERE }),
    prisma.material.count({ where: DASHBOARD_UNREAD_PITCH_DECK_WHERE }),
    prisma.material.count({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { not: null } } }),
    prisma.material.count({
      where: {
        AND: [
          DASHBOARD_UNREAD_SCRIPT_WHERE,
          {
            OR: [
              { project: { dateReceived: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
              { project: { dateReceived: null }, createdAt: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
        ],
      },
    }),
    prisma.contact.count({ where: { type: 'WRITER' } }),
    prisma.contact.count({ where: { type: 'WRITER', OR: [{ updatedAt: { gte: activeWriterStart } }, { createdAt: { gte: activeWriterStart } }] } }),
    prisma.material.count({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { gte: weekStart } } }),
    prisma.material.count({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { gte: monthStart } } }),
    prisma.material.count({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { gte: yearStart } } }),
    prisma.material.findMany({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { gte: twelveWeekStart } }, select: { readAt: true } }),
    prisma.coverage.findMany({
      where: { verdict: { in: ['CONSIDER', 'RECOMMEND'] }, script: { writerId: { not: null } } },
      select: { script: { select: { writerId: true } } },
    }),
    prisma.followUp.findMany({
      where: { completed: false },
      include: { contact: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.meeting.findMany({
      include: {
        attendees: { include: { contact: true }, take: 3 },
        projects: { include: { project: true }, take: 2 },
      },
      orderBy: { date: 'desc' },
      take: 6,
    }),
    prisma.project.findMany({
      where: {
        AND: [
          { nextAction: { not: null } },
          { nextAction: { not: '' } },
          { OR: [{ verdict: null }, { verdict: 'RECOMMEND' }] },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        nextAction: true,
        updatedAt: true,
        contacts: {
          where: { role: 'WRITER' },
          include: { contact: { select: { name: true } } },
          orderBy: { contact: { name: 'asc' } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const unreadRows = getUnreadRows(unreadScriptsAll, now, unreadSort)
  const unreadPitchDeckRows = getUnreadRows(unreadPitchDecksAll, now, unreadSort)
  const unreadScriptTypeCounts = SCRIPT_MATERIAL_TYPES.map((type) => ({
    type,
    label: MATERIAL_TYPE_PLURAL_LABELS[type],
    count: unreadScriptsAll.filter((material) => material.type === type).length,
  }))
  const unreadPitchDeckTypeCounts = PITCH_DECK_MATERIAL_TYPES.map((type) => ({
    type,
    label: MATERIAL_TYPE_PLURAL_LABELS[type],
    count: unreadPitchDecksAll.filter((material) => material.type === type).length,
  }))
  const todaysPick = getTodaysPick(unreadRows, new Set(priorRelationshipCoverages.map((coverage) => coverage.script?.writerId).filter(Boolean) as string[]))
  const readingStats = buildReadingStats(recentReadForStats, now)
  const progressPercent = Math.min(100, Math.round((readingStats.thisWeek / WEEKLY_READ_GOAL) * 100))
  const unreadDashboardRows = unreadRows.map(({ material, age, priority }) => ({
    id: material.id,
    href: projectHref(material),
    title: materialTitle(material),
    writer: materialWriter(material),
    source: sourceName(material),
    materialTypeLabel: materialTypeLabel(material.type),
    ageLabel: age.label,
    ageTone: age.tone,
    uploadedLabel: formatDate(material.createdAt),
    estimatedReadTime: getEstimatedReadTime(material.type),
    priority,
    projectStatus: material.project?.status || 'SUBMITTED',
  }))
  const unreadPitchDeckDashboardRows = unreadPitchDeckRows.map(({ material, age, priority }) => ({
    id: material.id,
    href: projectHref(material),
    title: materialTitle(material),
    writer: materialWriter(material),
    source: sourceName(material),
    materialTypeLabel: materialTypeLabel(material.type),
    ageLabel: age.label,
    ageTone: age.tone,
    uploadedLabel: formatDate(material.createdAt),
    estimatedReadTime: getEstimatedReadTime(material.type),
    priority,
    projectStatus: material.project?.status || 'SUBMITTED',
  }))

  const followUpsForWidget = pendingFollowUps.map((fu) => ({
    id: fu.id,
    note: fu.note,
    completed: fu.completed,
    createdAt: fu.createdAt.toISOString(),
    contact: fu.contact,
  }))
  const nextStepProjects = projectsWithNextSteps
    .map((project) => ({
      ...project,
      steps: splitNextSteps(project.nextAction),
      writers: project.contacts.map((pc) => pc.contact.name).join(', '),
    }))
    .filter((project) => project.steps.length > 0)

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#fafafa] min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Development Dashboard</h1>
        <p className="text-slate-500 mt-1">Operational view: reading queue, next steps, cadence, and follow-ups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link href={SCRIPT_READ_QUEUE_HREF} className="bg-white rounded-xl border border-[#e4e4e7] p-5 hover:bg-[#F8F9FB] transition-colors">
          <p className="text-sm font-medium text-slate-500">Unread Full Scripts</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{unreadScriptsCount}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {unreadScriptTypeCounts.map((item) => <span key={item.type}><span className="font-semibold text-slate-900">{item.count}</span> {item.label}</span>)}
          </div>
          {agedThirtyCount > 0 && <p className={`text-xs font-semibold mt-2 ${agedThirtyCount > 2 ? 'text-[#b91c1c]' : 'text-[#b45309]'}`}>{agedThirtyCount} aged 30+ days</p>}
          <p className="text-xs text-[#2563EB] mt-2">View unread scripts →</p>
        </Link>
        <Link href={PITCH_DECK_QUEUE_HREF} className="bg-white rounded-xl border border-[#e4e4e7] p-5 hover:bg-[#F8F9FB] transition-colors">
          <p className="text-sm font-medium text-slate-500">Unread Pitch Decks</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{unreadPitchDecksCount}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {unreadPitchDeckTypeCounts.map((item) => <span key={item.type}><span className="font-semibold text-slate-900">{item.count}</span> {item.label}</span>)}
          </div>
          <p className="text-xs text-[#2563EB] mt-2">View unread decks →</p>
        </Link>
        <Link href={READ_MATERIALS_HREF} className="bg-white rounded-xl border border-[#e4e4e7] p-5 hover:bg-[#F8F9FB] transition-colors">
          <p className="text-sm font-medium text-slate-500">Materials Reviewed</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{readScriptsCount}</p>
          <p className="text-xs text-slate-600 mt-2">This week: <span className="font-semibold">{readCountWeek}</span> · This month: <span className="font-semibold">{readCountMonth}</span></p>
          <p className="text-xs text-[#2563EB] mt-2">View read materials →</p>
        </Link>
        <Link href="/contacts?type=writer" className="bg-white rounded-xl border border-[#e4e4e7] p-5 hover:bg-[#F8F9FB] transition-colors">
          <p className="text-sm font-medium text-slate-500">Writers Tracked</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{writersTrackedCount}</p>
          <p className="text-xs text-slate-600 mt-2">{activeWritersCount} active in last 90 days</p>
          <p className="text-xs text-[#2563EB] mt-2">View writer contacts →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <DashboardUnreadScripts
          initialRows={unreadDashboardRows}
          readQueueHref={SCRIPT_READ_QUEUE_HREF}
          title="Unread Full Scripts"
          emptyLabel="No unread full scripts. Clean."
          viewAllLabel="View scripts"
          sort={unreadSort}
          sortOptions={UNREAD_SORT_OPTIONS}
          todaysPickId={todaysPick?.material.id || null}
          todaysPickReasons={todaysPick?.reasons || []}
        />

        <DashboardUnreadScripts
          initialRows={unreadPitchDeckDashboardRows}
          readQueueHref={PITCH_DECK_QUEUE_HREF}
          title="Unread Pitch Decks"
          emptyLabel="No unread pitch decks or outlines. Clean."
          viewAllLabel="View decks"
          sort={unreadSort}
          sortOptions={UNREAD_SORT_OPTIONS}
        />

        <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Reviewed Materials</h2>
            <Link href={READ_MATERIALS_HREF} className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">View all →</Link>
          </div>
          {readScripts.length > 0 ? (
            <div className="divide-y divide-[#f4f4f5]">
              {readScripts.map((material) => {
                const coverage = pickCoverage(material)
                return (
                  <Link key={material.id} href={projectHref(material)} className="block py-3 hover:bg-[#fafafa] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{materialTitle(material)}</p>
                        <p className="text-sm text-slate-500 truncate">{materialWriter(material)}</p>
                        <p className="text-xs text-slate-500 mt-1">Read {formatDate(material.readAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {coverage.selected ? <Pill tone={verdictPillTone(coverage.selected.verdict)}>{coverage.selected.verdict}</Pill> : <Pill tone="priority-low">No verdict</Pill>}
                        {coverage.duplicatePhilCount > 1 && <p className="mt-1 text-[11px] text-[#b45309]">({coverage.duplicatePhilCount} by Phil — possible duplicate)</p>}
                        {coverage.nonPhilReader && <p className="mt-1 text-[11px] text-slate-400">by {coverage.nonPhilReader}</p>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500">No reviewed materials yet.</div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Next Steps Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">Projects with saved next steps from their project page.</p>
          </div>
          <Link href="/projects" className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">View all projects →</Link>
        </div>
        {nextStepProjects.length > 0 ? (
          <div className="divide-y divide-[#f4f4f5]">
            {nextStepProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block py-4 hover:bg-[#fafafa] transition-colors">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.title}</p>
                    <p className="text-sm text-slate-500 truncate">{project.writers || 'No writer linked'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 md:shrink-0">
                    <Pill tone="status">{project.status.replaceAll('_', ' ')}</Pill>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {project.steps.map((step, index) => (
                    <li key={`${project.id}-${index}`} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563EB] shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500">No project next steps saved yet.</div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`bg-white rounded-xl border border-[#e4e4e7] p-5 ${readingStats.thisWeek >= WEEKLY_READ_GOAL ? 'bg-green-50/40' : ''}`}>
          <h2 className="text-lg font-semibold mb-3">Reading Stats</h2>
          <p className="text-sm text-slate-600">Goal: <span className="font-semibold text-slate-900">{WEEKLY_READ_GOAL} / week</span></p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{readingStats.thisWeek} of {WEEKLY_READ_GOAL} this week</span>
              <span className="font-semibold text-slate-900">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#f4f4f5] overflow-hidden">
              <div className="h-full rounded-full bg-[#166534]" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: WEEKLY_READ_GOAL }).map((_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < readingStats.thisWeek ? 'bg-[#166534]' : 'bg-[#e4e4e7]'}`} />)}
            </div>
          </div>
          {readingStats.streak > 0 && <p className="mt-3 text-xs font-medium text-[#166534]">{readingStats.streak} weeks in a row hitting goal</p>}
          <div className="mt-4 flex h-12 items-end gap-1" aria-label="12-week reading sparkline">
            {readingStats.buckets.map((bucket, index) => <div key={index} title={`${bucket.count} read`} className="flex-1 rounded-t bg-[#93c5fd]" style={{ height: `${Math.max(8, (bucket.count / readingStats.max) * 48)}px` }} />)}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-600">Last 7 days</span><span className="font-bold text-slate-900">{readCountWeek}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">Last 30 days</span><span className="font-bold text-slate-900">{readCountMonth}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-600">Last 12 months</span><span className="font-bold text-slate-900">{readCountYear}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Meetings</h2>
            <Link href="/meetings" className="text-sm text-[#2563EB]">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <Link key={meeting.id} href="/meetings" className="block p-3 rounded-lg hover:bg-[#F2F4F7]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{meeting.title}</p>
                  <span className="text-xs text-slate-500">{formatDate(meeting.date)}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{meeting.attendees.map((a) => a.contact.name).join(', ') || 'No attendees logged'}</p>
                {meeting.projects.length > 0 && <p className="text-xs text-slate-400 mt-1">Projects: {meeting.projects.map((p) => p.project.title).join(', ')}</p>}
              </Link>
            ))}
            {recentMeetings.length === 0 && <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500"><p>No meetings logged yet.</p><p className="mt-1 text-xs">Coming with Cowork integration.</p></div>}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Follow-up Items</h2>
          <span className="text-sm text-slate-500">{pendingFollowUps.length} pending</span>
        </div>
        {pendingFollowUps.length === 0 && <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500"><p>No pending follow-ups.</p><p className="mt-1 text-xs">Coming with Cowork integration.</p></div>}
        {pendingFollowUps.length > 0 && <FollowUpWidget initialFollowUps={followUpsForWidget} />}
      </section>
    </div>
  )
}
