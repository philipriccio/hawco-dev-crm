import Link from 'next/link'
import { MaterialType } from '@prisma/client'
import { prisma } from '@/lib/db'
import ScriptsToRead from '@/components/ScriptsToRead'

export const dynamic = 'force-dynamic'

const SCRIPT_TYPES: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']

function daysBetween(start: Date | null, end: Date | null = new Date()) {
  if (!start || !end) return null
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const staleFollowupCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    backlogToRead,
    firstReadProjects,
    writersEngaged,
    activeRewrites,
    staleFollowups,
    sourceProjects,
    highPriorityWriters,
    overdueRewriteCycles,
    overdueFirstReads,
    unreadScripts,
    recentlyReadScripts,
  ] = await Promise.all([
    prisma.project.count({ where: { status: { in: ['SUBMITTED', 'READING'] } } }),
    prisma.project.findMany({ where: { dateReceived: { not: null }, firstReadAt: { not: null } }, select: { dateReceived: true, firstReadAt: true } }),
    prisma.contact.count({ where: { type: 'WRITER', OR: [{ meetingAttendees: { some: { meeting: { date: { gte: monthStart } } } } }, { writerSignals: { some: { createdAt: { gte: monthStart } } } }] } }),
    prisma.project.count({ where: { status: 'REWRITE_IN_PROGRESS' } }),
    prisma.contact.count({ where: { type: 'WRITER', updatedAt: { lt: staleFollowupCutoff } } }),
    prisma.project.findMany({
      include: { contacts: { where: { role: 'SOURCE' }, include: { contact: true }, take: 1 }, rewriteCycles: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.contact.findMany({
      where: { type: 'WRITER' },
      include: { writerSignals: true, meetingAttendees: { include: { meeting: true } }, projectContacts: { include: { project: true } } },
    }),
    prisma.rewriteCycle.findMany({ where: { dueAt: { lt: now }, rewriteReceivedAt: null }, include: { project: { select: { id: true, title: true } } }, orderBy: { dueAt: 'asc' }, take: 5 }),
    prisma.project.findMany({ where: { firstReadAt: null, dateReceived: { not: null }, status: { in: ['SUBMITTED', 'READING'] } }, include: { contacts: { where: { role: 'WRITER' }, include: { contact: true }, take: 1 } }, orderBy: { dateReceived: 'asc' }, take: 5 }),
    prisma.material.findMany({
      where: { type: { in: SCRIPT_TYPES }, readAt: null },
      include: {
        project: {
          include: {
            contacts: { where: { role: 'WRITER' }, include: { contact: true }, take: 1 },
          },
        },
        writer: true,
        submittedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.material.findMany({
      where: { type: { in: SCRIPT_TYPES }, readAt: { not: null } },
      include: {
        project: {
          include: {
            contacts: { where: { role: 'WRITER' }, include: { contact: true }, take: 1 },
          },
        },
        writer: true,
        submittedBy: true,
      },
      orderBy: { readAt: 'desc' },
      take: 4,
    }),
  ])

  const avgDaysToFirstRead = firstReadProjects.length
    ? Math.round(firstReadProjects.reduce((sum, p) => sum + daysBetween(p.dateReceived, p.firstReadAt)!, 0) / firstReadProjects.length)
    : 0

  const sourceBuckets = sourceProjects.reduce<Record<string, { submitted: number; passed: number; relationPositive: number; rewriteProgressed: number }>>((acc, project) => {
    const source = project.contacts[0]?.contact.name || 'Unknown Source'
    if (!acc[source]) acc[source] = { submitted: 0, passed: 0, relationPositive: 0, rewriteProgressed: 0 }
    acc[source].submitted += 1
    if (project.status === 'PASSED') acc[source].passed += 1
    if (project.considerRelationship) acc[source].relationPositive += 1
    if (project.rewriteCycles.length > 0 || project.status === 'REWRITE_IN_PROGRESS') acc[source].rewriteProgressed += 1
    return acc
  }, {})

  const highPriority = highPriorityWriters
    .map((writer) => {
      const signalScore = writer.writerSignals.length * 8
      const recentMeetingScore = writer.meetingAttendees.some((m) => m.meeting.date >= monthStart) ? 15 : 0
      const relationshipProjects = writer.projectContacts.filter((pc) => pc.project.considerRelationship).length
      const rewriteScore = writer.projectContacts.filter((pc) => pc.project.status === 'REWRITE_IN_PROGRESS').length * 12
      const stalePenalty = writer.updatedAt < staleFollowupCutoff ? -10 : 0
      const score = Math.max(0, Math.min(100, 25 + signalScore + recentMeetingScore + relationshipProjects * 10 + rewriteScore + stalePenalty))
      return { id: writer.id, name: writer.name, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const scriptsForDashboard = [
    ...unreadScripts.map((material) => ({
      id: material.id,
      title: material.title || material.project?.title || 'Untitled',
      writer: material.writer?.name || material.submittedBy?.name || material.project?.contacts?.[0]?.contact.name || 'Unknown',
      genre: material.project?.genre || '—',
      dateReceived: material.createdAt,
      type: material.type,
      href: material.projectId ? `/projects/${material.projectId}` : '/materials',
      source: 'material' as const,
      projectId: material.projectId,
      isRead: false,
      readAt: null,
    })),
    ...recentlyReadScripts.map((material) => ({
      id: material.id,
      title: material.title || material.project?.title || 'Untitled',
      writer: material.writer?.name || material.submittedBy?.name || material.project?.contacts?.[0]?.contact.name || 'Unknown',
      genre: material.project?.genre || '—',
      dateReceived: material.createdAt,
      type: material.type,
      href: material.projectId ? `/projects/${material.projectId}` : '/materials',
      source: 'material' as const,
      projectId: material.projectId,
      isRead: true,
      readAt: material.readAt,
    })),
  ]

  const cards = [
    { name: 'Backlog to Read', value: backlogToRead, href: '/intake' },
    { name: 'Avg Days to First Read', value: avgDaysToFirstRead, href: '/intake' },
    { name: 'Writers Engaged This Month', value: writersEngaged, href: '/contacts?type=writer' },
    { name: 'Active Rewrites', value: activeRewrites, href: '/projects?status=rewrite_in_progress' },
    { name: 'Stale Relationship Follow-ups', value: staleFollowups, href: '/contacts?type=writer' },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Development Dashboard</h1>
        <p className="text-slate-500 mt-1">Writer relationship + project development operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link key={card.name} href={card.href} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-slate-500">{card.name}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
          </Link>
        ))}
      </div>

      <ScriptsToRead initialScripts={scriptsForDashboard} title="Scripts Read/Unread" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">High-priority writers to nurture</h2>
            <Link href="/contacts?type=writer&view=high-priority" className="text-sm text-amber-600">Saved view →</Link>
          </div>
          <div className="space-y-2">
            {highPriority.map((writer) => (
              <Link key={writer.id} href={`/contacts/${writer.id}`} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                <span className="text-slate-800">{writer.name}</span>
                <span className="text-sm font-semibold text-amber-700">{writer.score}/100</span>
              </Link>
            ))}
            {highPriority.length === 0 && <p className="text-sm text-slate-500">No writer data yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">Rules-based follow-up nudges</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Overdue rewrites</p>
              {overdueRewriteCycles.length ? overdueRewriteCycles.map((cycle) => (
                <Link key={cycle.id} href={`/projects/${cycle.project.id}`} className="block text-sm text-red-700 hover:underline">{cycle.project.title} — due {new Date(cycle.dueAt!).toLocaleDateString()}</Link>
              )) : <p className="text-sm text-slate-500">None overdue.</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Overdue first reads</p>
              {overdueFirstReads.length ? overdueFirstReads.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block text-sm text-amber-700 hover:underline">{project.title} ({project.contacts[0]?.contact.name || 'Unknown writer'})</Link>
              )) : <p className="text-sm text-slate-500">No overdue first reads.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-3">Source Quality Analytics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Source</th><th className="py-2">Volume</th><th className="py-2">Pass Rate</th><th className="py-2">Relationship-Positive Rate</th><th className="py-2">Rewrite Progression Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sourceBuckets).map(([source, metrics]) => {
                const passRate = metrics.submitted ? Math.round((metrics.passed / metrics.submitted) * 100) : 0
                const relationshipRate = metrics.submitted ? Math.round((metrics.relationPositive / metrics.submitted) * 100) : 0
                const rewriteRate = metrics.submitted ? Math.round((metrics.rewriteProgressed / metrics.submitted) * 100) : 0
                return (
                  <tr key={source} className="border-b last:border-b-0">
                    <td className="py-2">{source}</td>
                    <td className="py-2">{metrics.submitted}</td>
                    <td className="py-2">{passRate}%</td>
                    <td className="py-2">{relationshipRate}%</td>
                    <td className="py-2">{rewriteRate}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
