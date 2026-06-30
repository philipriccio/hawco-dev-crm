import Link from 'next/link'
import { Prisma, Verdict } from '@prisma/client'
import { prisma } from '@/lib/db'
import FollowUpWidget from '@/components/FollowUpWidget'
import {
  READABLE_MATERIAL_TYPES,
  getAgeDisplay,
  getEstimatedReadTime,
  getPriority,
  getPrioritySortValue,
  getVerdictTone,
  writerLevelBoost,
} from '@/lib/dashboard-helpers'

export const dynamic = 'force-dynamic'

const WEEKLY_READ_GOAL = 3
const READ_QUEUE_HREF = `/materials?type=${READABLE_MATERIAL_TYPES.join(',')}&read=unread`
const READ_MATERIALS_HREF = `/materials?type=${READABLE_MATERIAL_TYPES.join(',')}&read=read`

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

function ageClass(tone: 'green' | 'amber' | 'red' | 'gray') {
  if (tone === 'red') return 'text-[#b91c1c]'
  if (tone === 'amber') return 'text-[#b45309]'
  if (tone === 'green') return 'text-[#166534]'
  return 'text-[#71717a]'
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function priorityTone(priority: 'HIGH' | 'MEDIUM' | 'LOW'): PillTone {
  if (priority === 'HIGH') return 'priority-high'
  if (priority === 'MEDIUM') return 'priority-medium'
  return 'priority-low'
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

function getUnreadRows(unreadMaterials: DashboardMaterial[], now: Date) {
  return unreadMaterials
    .map((material) => {
      const age = getAgeDisplay(receivedDate(material), now)
      const priority = getPriority(material.project?.status, age.days)
      return { material, age, priority }
    })
    .sort((a, b) => {
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

function buildSourceRollup(unreadMaterials: DashboardMaterial[], now: Date) {
  const groups = new Map<string, { name: string; items: DashboardMaterial[]; oldestDays: number | null; oldestTone: 'green' | 'amber' | 'red' | 'gray'; oldestLabel: string }>()

  for (const material of unreadMaterials) {
    const name = sourceName(material, true)
    const age = getAgeDisplay(receivedDate(material), now)
    const group = groups.get(name) || { name, items: [], oldestDays: null, oldestTone: age.tone, oldestLabel: age.label }
    group.items.push(material)
    if ((age.days || 0) > (group.oldestDays || 0)) {
      group.oldestDays = age.days
      group.oldestTone = age.tone
      group.oldestLabel = age.label
    }
    groups.set(name, group)
  }

  return Array.from(groups.values())
    .sort((a, b) => (b.oldestDays || 0) - (a.oldestDays || 0))
    .slice(0, 8)
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

export default async function DashboardPage() {
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
    readScripts,
    unreadScriptsCount,
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
  ] = await Promise.all([
    prisma.material.findMany({
      where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: null },
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
    prisma.material.count({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: null } }),
    prisma.material.count({ where: { type: { in: READABLE_MATERIAL_TYPES }, readAt: { not: null } } }),
    prisma.material.count({
      where: {
        type: { in: READABLE_MATERIAL_TYPES },
        readAt: null,
        OR: [
          { project: { dateReceived: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
          { project: { dateReceived: null }, createdAt: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
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
  ])

  const unreadRows = getUnreadRows(unreadScriptsAll, now)
  const todaysPick = getTodaysPick(unreadRows, new Set(priorRelationshipCoverages.map((coverage) => coverage.script?.writerId).filter(Boolean) as string[]))
  const sourceRollup = buildSourceRollup(unreadScriptsAll, now)
  const readingStats = buildReadingStats(recentReadForStats, now)
  const progressPercent = Math.min(100, Math.round((readingStats.thisWeek / WEEKLY_READ_GOAL) * 100))

  const followUpsForWidget = pendingFollowUps.map((fu) => ({
    id: fu.id,
    note: fu.note,
    completed: fu.completed,
    createdAt: fu.createdAt.toISOString(),
    contact: fu.contact,
  }))

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#fafafa] min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Development Dashboard</h1>
        <p className="text-slate-500 mt-1">Operational view: scripts, relationship risk, reading cadence, and follow-ups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={READ_QUEUE_HREF} className="bg-white rounded-xl border border-[#e4e4e7] p-5 hover:bg-[#F8F9FB] transition-colors">
          <p className="text-sm font-medium text-slate-500">Scripts to Read</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{unreadScriptsCount}</p>
          {agedThirtyCount > 0 && <p className={`text-xs font-semibold mt-2 ${agedThirtyCount > 2 ? 'text-[#b91c1c]' : 'text-[#b45309]'}`}>{agedThirtyCount} aged 30+ days</p>}
          <p className="text-xs text-[#2563EB] mt-2">View unread materials →</p>
        </Link>
        <Link href={READ_MATERIALS_HREF} className="bg-white rounded-xl border border-[#e4e4e7] p-5 hover:bg-[#F8F9FB] transition-colors">
          <p className="text-sm font-medium text-slate-500">Scripts Read</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Unread Scripts</h2>
            <Link href={READ_QUEUE_HREF} className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">View all →</Link>
          </div>

          {todaysPick && (
            <div className="mb-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#92400e]">Today&apos;s pick</p>
              <p className="mt-1 font-semibold text-slate-900">Read {materialTitle(todaysPick.material)} today</p>
              <p className="text-sm text-slate-600">Sitting <span className={ageClass(todaysPick.age.tone)}>{todaysPick.age.label}</span> · Source: {sourceName(todaysPick.material)}</p>
              <p className="text-xs text-[#92400e] mt-1">Why this one: {todaysPick.reasons.length > 0 ? todaysPick.reasons.join(' · ') : `Sitting ${todaysPick.age.label} — oldest active script.`}</p>
              <Link href={projectHref(todaysPick.material)} className="inline-flex mt-2 text-sm font-medium text-[#2563EB]">Open script →</Link>
            </div>
          )}

          {unreadRows.length > 0 ? (
            <div className="divide-y divide-[#f4f4f5]">
              {unreadRows.slice(0, 8).map(({ material, age, priority }) => (
                <Link key={material.id} href={projectHref(material)} className="block py-3 hover:bg-[#fafafa] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{materialTitle(material)}</p>
                      <p className="text-sm text-slate-500 truncate">{materialWriter(material)} · {sourceName(material)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Pill tone={priorityTone(priority)}>{priority}</Pill>
                      <Pill tone="status">{material.project?.status || 'SUBMITTED'}</Pill>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span title={formatDate(receivedDate(material))} className={`font-semibold ${ageClass(age.tone)}`}>{age.label}</span>
                    <span>·</span>
                    <span>{getEstimatedReadTime(material.type)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500">No unread scripts. Clean.</div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Read Scripts</h2>
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
            <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500">No read scripts yet.</div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Relationship risk — who&apos;s waiting</h2>
            <p className="text-xs text-slate-500 mt-1">Source populates from intake submissions going forward; legacy records may be incomplete.</p>
          </div>
          <Link href={READ_QUEUE_HREF} className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">View read queue →</Link>
        </div>
        {sourceRollup.length > 0 ? (
          <div className="divide-y divide-[#f4f4f5]">
            {sourceRollup.map((group) => (
              <div key={group.name} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900 truncate">{group.name}</p>
                  <p className="text-sm text-slate-600 shrink-0"><span className="font-semibold">{group.items.length}</span> unread · oldest <span className={`font-semibold ${ageClass(group.oldestTone)}`}>{group.oldestLabel}</span></p>
                </div>
                <p className="text-sm text-slate-500 truncate">{group.items.map((item) => `${materialWriter(item)} / ${materialTitle(item)}`).join(', ')}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500">No outstanding submissions sitting unread. Clean.</div>
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
