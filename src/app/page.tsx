import Link from 'next/link'
import { prisma } from '@/lib/db'
import { MaterialType, Verdict } from '@prisma/client'
import ScriptsToRead from '@/components/ScriptsToRead'

export const dynamic = 'force-dynamic'

// Script material types that need reading
const SCRIPT_TYPES: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']

const verdictColors: Record<Verdict, string> = {
  PASS: 'bg-red-100 text-red-700',
  CONSIDER: 'bg-amber-100 text-amber-700',
  RECOMMEND: 'bg-green-100 text-green-700',
}

const verdictLabels: Record<Verdict, string> = {
  PASS: 'Pass',
  CONSIDER: 'Consider',
  RECOMMEND: 'Recommend',
}

export default async function DashboardPage() {
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

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
      source: 'material' as const,
      projectId: material.projectId,
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
        projectId: project.id,
      })),
  ].slice(0, 10)

  // Fetch latest coverages
  const latestCoverages = await prisma.coverage.findMany({
    orderBy: { dateRead: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      writer: true,
      dateRead: true,
      scoreTotal: true,
      verdict: true,
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  // Fetch coverage stats
  const [coverageThisWeek, coverageThisMonth, coverageThisYear, allCoverages] = await Promise.all([
    prisma.coverage.count({
      where: {
        dateRead: { gte: startOfWeek },
      },
    }),
    prisma.coverage.count({
      where: {
        dateRead: { gte: startOfMonth },
      },
    }),
    prisma.coverage.count({
      where: {
        dateRead: { gte: startOfYear },
      },
    }),
    prisma.coverage.findMany({
      select: {
        verdict: true,
        scoreTotal: true,
      },
    }),
  ])

  // Calculate verdict breakdown
  const verdictCounts = allCoverages.reduce((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] || 0) + 1
    return acc
  }, {} as Record<Verdict, number>)

  // Calculate average score
  const scores = allCoverages
    .map((c) => c.scoreTotal)
    .filter((s): s is number => s !== null)
  const averageScore = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null

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
      href: `/meetings`,
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
        <ScriptsToRead initialScripts={scriptsToRead} />
      </div>

      {/* Coverage Section - Split into Latest Coverages and Reading Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Latest Coverage */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Latest Coverage</h2>
            <Link href="/coverage" className="text-sm text-amber-600 hover:text-amber-700">
              View all →
            </Link>
          </div>
          {latestCoverages.length > 0 ? (
            <div className="space-y-4">
              {latestCoverages.map((coverage) => (
                <Link
                  key={coverage.id}
                  href={`/coverage/${coverage.id}`}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{coverage.title}</p>
                    <p className="text-sm text-slate-500">{coverage.writer}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{formatDate(coverage.dateRead)}</span>
                      {coverage.scoreTotal !== null && (
                        <span className={`text-xs font-medium ${
                          coverage.scoreTotal >= 40 ? 'text-green-600' :
                          coverage.scoreTotal >= 30 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {coverage.scoreTotal}/50
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${verdictColors[coverage.verdict]}`}>
                    {verdictLabels[coverage.verdict]}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No coverage reports yet.</p>
              <Link href="/coverage/new" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
                Add coverage →
              </Link>
            </div>
          )}
        </div>

        {/* Reading Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Reading Stats</h2>
          </div>
          
          {/* Scripts Read Counts */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{coverageThisWeek}</p>
              <p className="text-xs text-slate-500">This Week</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{coverageThisMonth}</p>
              <p className="text-xs text-slate-500">This Month</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{coverageThisYear}</p>
              <p className="text-xs text-slate-500">This Year</p>
            </div>
          </div>

          {/* Verdict Breakdown */}
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Verdict Breakdown</p>
            <div className="flex gap-2">
              {(Object.keys(verdictLabels) as Verdict[]).map((v) => {
                const count = verdictCounts[v] || 0
                const total = allCoverages.length || 1
                const percentage = Math.round((count / total) * 100)
                return (
                  <div key={v} className="flex-1">
                    <div className={`${verdictColors[v]} rounded-lg p-2 text-center`}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs">{verdictLabels[v]}</p>
                    </div>
                    <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          v === 'PASS' ? 'bg-red-400' : v === 'CONSIDER' ? 'bg-amber-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Average Score */}
          {averageScore && (
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Average Score</span>
              <span className={`text-xl font-bold ${
                parseFloat(averageScore) >= 40 ? 'text-green-600' :
                parseFloat(averageScore) >= 30 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {averageScore}/50
              </span>
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
          <Link
            href="/coverage"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Coverage Reports
          </Link>
        </div>
      </div>
    </div>
  )
}
