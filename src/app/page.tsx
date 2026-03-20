import Link from 'next/link'
import { MaterialType } from '@prisma/client'
import { prisma } from '@/lib/db'
import ScriptsToRead from '@/components/ScriptsToRead'

export const dynamic = 'force-dynamic'

const SCRIPT_TYPES: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']

export default async function DashboardPage() {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  const monthStart = new Date(now)
  monthStart.setMonth(now.getMonth() - 1)
  const yearStart = new Date(now)
  yearStart.setFullYear(now.getFullYear() - 1)

  const [
    unreadScripts,
    readScripts,
    unreadScriptsCount,
    readScriptsCount,
    writersTrackedCount,
    readCountWeek,
    readCountMonth,
    readCountYear,
    highPriorityWriters,
    recentMeetings,
  ] = await Promise.all([
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
      take: 8,
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
      take: 8,
    }),
    prisma.material.count({ where: { type: { in: SCRIPT_TYPES }, readAt: null } }),
    prisma.material.count({ where: { type: { in: SCRIPT_TYPES }, readAt: { not: null } } }),
    prisma.contact.count({ where: { type: 'WRITER' } }),
    prisma.material.count({ where: { type: { in: SCRIPT_TYPES }, readAt: { gte: weekStart } } }),
    prisma.material.count({ where: { type: { in: SCRIPT_TYPES }, readAt: { gte: monthStart } } }),
    prisma.material.count({ where: { type: { in: SCRIPT_TYPES }, readAt: { gte: yearStart } } }),
    prisma.contact.findMany({
      where: { type: 'WRITER', highPriority: true },
      include: {
        writerSignals: true,
        meetingAttendees: { include: { meeting: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
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

  const unreadScriptsForDashboard = unreadScripts.map((material) => ({
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
  }))

  const readScriptsForDashboard = readScripts.map((material) => ({
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
  }))

  const highPriority = highPriorityWriters
    .map((writer) => {
      const recentMeeting = writer.meetingAttendees.some((m) => m.meeting.date >= monthStart) ? 15 : 0
      const score = Math.max(0, Math.min(100, 25 + writer.writerSignals.length * 8 + recentMeeting))
      return { id: writer.id, name: writer.name, score }
    })
    .sort((a, b) => b.score - a.score)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Development Dashboard</h1>
        <p className="text-slate-500 mt-1">Operational view: scripts, reading cadence, meetings, and priority writers</p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/projects?status=reading" className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6 hover:bg-[#F2F4F7] transition-colors">
          <p className="text-sm font-medium text-slate-500">Scripts to Read</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{unreadScriptsCount}</p>
          <p className="text-xs text-[#2563EB] mt-2">View unread scripts →</p>
        </Link>
        <Link href="/projects?status=read" className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6 hover:bg-[#F2F4F7] transition-colors">
          <p className="text-sm font-medium text-slate-500">Scripts Read</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{readScriptsCount}</p>
          <p className="text-xs text-[#2563EB] mt-2">View read scripts →</p>
        </Link>
        <Link href="/contacts?type=writer" className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6 hover:bg-[#F2F4F7] transition-colors">
          <p className="text-sm font-medium text-slate-500">Writers Tracked</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{writersTrackedCount}</p>
          <p className="text-xs text-[#2563EB] mt-2">View writer contacts →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScriptsToRead initialScripts={unreadScriptsForDashboard} title="Unread Scripts" />
        <ScriptsToRead initialScripts={readScriptsForDashboard} title="Read Scripts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold mb-3">Reading Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Last 7 days</span>
              <span className="text-2xl font-bold text-slate-900">{readCountWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Last 30 days</span>
              <span className="text-2xl font-bold text-slate-900">{readCountMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Last 12 months</span>
              <span className="text-2xl font-bold text-slate-900">{readCountYear}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Meetings</h2>
            <Link href="/meetings" className="text-sm text-[#2563EB]">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <Link key={meeting.id} href="/meetings" className="block p-3 rounded-lg hover:bg-[#F2F4F7]">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{meeting.title}</p>
                  <span className="text-xs text-slate-500">{new Date(meeting.date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {meeting.attendees.map((a) => a.contact.name).join(', ') || 'No attendees logged'}
                </p>
                {meeting.projects.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Projects: {meeting.projects.map((p) => p.project.title).join(', ')}</p>
                )}
              </Link>
            ))}
            {recentMeetings.length === 0 && <p className="text-sm text-slate-500">No meetings logged yet.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">High Priority Writers</h2>
          <Link href="/contacts?type=writer&view=high-priority" className="text-sm text-[#2563EB]">Saved view →</Link>
        </div>
        <div className="space-y-2">
          {highPriority.map((writer) => (
            <Link key={writer.id} href={`/contacts/${writer.id}`} className="flex items-center justify-between p-2 rounded hover:bg-[#F2F4F7]">
              <span className="text-slate-800">{writer.name}</span>
              <span className="text-xs font-semibold text-slate-500">Health score {writer.score}/100</span>
            </Link>
          ))}
          {highPriority.length === 0 && <p className="text-sm text-slate-500">No high-priority writers flagged yet.</p>}
        </div>
      </div>
    </div>
  )
}
