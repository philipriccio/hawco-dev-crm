import Link from 'next/link'
import { prisma } from '@/lib/db'
import { MaterialType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Script material types that need reading
const SCRIPT_TYPES: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']

export default async function DashboardPage() {
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Fetch stats
  const [activeProjectsCount, inSubmissionsCount, writersCount, meetingsThisMonthCount] = await Promise.all([
    prisma.project.count({ where: { status: { in: ['DEVELOPING', 'PACKAGING', 'PITCHED'] } } }),
    prisma.project.count({ where: { status: 'SUBMITTED' } }),
    prisma.contact.count({ where: { type: 'WRITER' } }),
    prisma.meeting.count({
      where: {
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      },
    }),
  ])

  const stats = [
    { name: 'Active Projects', value: activeProjectsCount.toString(), href: '/projects?status=developing' },
    { name: 'In Submissions', value: inSubmissionsCount.toString(), href: '/projects?status=submitted' },
    { name: 'Writers Tracked', value: writersCount.toString(), href: '/contacts?type=writer' },
    { name: 'Meetings This Month', value: meetingsThisMonthCount.toString(), href: '/meetings' },
  ]

  // Fetch scripts to read (script materials OR projects with READING status)
  const [scriptMaterials, readingProjects] = await Promise.all([
    prisma.material.findMany({
      where: {
        type: { in: SCRIPT_TYPES },
      },
      include: {
        project: {
          include: {
            contacts: {
              include: { contact: true },
              where: { role: 'WRITER' },
              take: 1,
            },
          },
        },
        submittedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        status: 'READING',
      },
      include: {
        contacts: {
          include: { contact: true },
          where: { role: 'WRITER' },
          take: 1,
        },
        materials: {
          where: {
            type: { in: SCRIPT_TYPES },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { dateReceived: 'desc' },
      take: 10,
    }),
  ])

  // Combine and format scripts to read
  const scriptsToRead = [
    ...scriptMaterials.map((material) => ({
      id: material.id,
      title: material.title || material.project?.title || 'Untitled',
      writer: material.submittedBy?.name || material.project?.contacts[0]?.contact.name || 'Unknown',
      genre: material.project?.genre || '—',
      dateReceived: material.createdAt,
      type: material.type,
      href: material.projectId ? `/projects/${material.projectId}` : '#',
      source: 'material',
    })),
    ...readingProjects
      .filter((project) => !scriptMaterials.some((m) => m.projectId === project.id))
      .map((project) => ({
        id: project.id,
        title: project.title,
        writer: project.contacts[0]?.contact.name || 'Unknown',
        genre: project.genre || '—',
        dateReceived: project.dateReceived || project.createdAt,
        type: project.materials[0]?.type || 'SCRIPT',
        href: `/projects/${project.id}`,
        source: 'project' as const,
      })),
  ].slice(0, 10)

  // Fetch meetings - recent past (7-14 days ago) and upcoming
  const [recentPastMeetings, upcomingMeetings] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        date: {
          gte: fourteenDaysAgo,
          lt: now,
        },
      },
      include: {
        attendees: {
          include: {
            contact: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.meeting.findMany({
      where: {
        date: {
          gte: now,
        },
      },
      include: {
        attendees: {
          include: {
            contact: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
      take: 10,
    }),
  ])

  const formatMeeting = (meeting: typeof recentPastMeetings[0]) => {
    const primaryAttendee = meeting.attendees[0]?.contact
    return {
      id: meeting.id,
      contact: primaryAttendee?.name || meeting.title,
      company: primaryAttendee?.company?.name || '—',
      date: meeting.date,
      type: meeting.location || 'Meeting',
      href: `/meetings`, // Could link to specific meeting if detail page exists
    }
  }

  const formattedRecentMeetings = recentPastMeetings.map(formatMeeting)
  const formattedUpcomingMeetings = upcomingMeetings.map(formatMeeting)

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-slate-500">{stat.name}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Scripts to Read Section */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Scripts to Read</h2>
            <Link href="/projects?status=reading" className="text-sm text-amber-600 hover:text-amber-700">
              View all →
            </Link>
          </div>
          {scriptsToRead.length > 0 ? (
            <div className="space-y-4">
              {scriptsToRead.map((script) => (
                <Link
                  key={`${script.source}-${script.id}`}
                  href={script.href}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{script.title}</p>
                    <p className="text-sm text-slate-500">{script.writer}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {script.genre}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(script.dateReceived)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No scripts waiting to be read.</p>
              <Link href="/projects?status=submitted" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Check submitted projects →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Meetings Section - Split into two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Past Meetings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Past Meetings</h2>
            <span className="text-xs text-slate-400">Last 14 days</span>
          </div>
          {formattedRecentMeetings.length > 0 ? (
            <div className="space-y-4">
              {formattedRecentMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{meeting.contact}</p>
                    <p className="text-sm text-slate-500">{meeting.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{formatDate(meeting.date)}</p>
                    <p className="text-xs text-slate-500">{meeting.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No recent meetings.</p>
            </div>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Meetings</h2>
            <Link href="/meetings" className="text-sm text-amber-600 hover:text-amber-700">
              View all →
            </Link>
          </div>
          {formattedUpcomingMeetings.length > 0 ? (
            <div className="space-y-4">
              {formattedUpcomingMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{meeting.contact}</p>
                    <p className="text-sm text-slate-500">{meeting.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{formatDate(meeting.date)}</p>
                    <p className="text-xs text-slate-500">{meeting.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No upcoming meetings scheduled.</p>
              <Link href="/meetings/new" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Schedule a meeting →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log New Submission
          </Link>
          <Link
            href="/contacts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Contact
          </Link>
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule Meeting
          </Link>
          <Link
            href="/whiteboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17v4" />
            </svg>
            Development Board
          </Link>
        </div>
      </div>
    </div>
  )
}
