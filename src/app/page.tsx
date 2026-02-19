import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Placeholder stats - will be replaced with real data
const stats = [
  { name: 'Active Projects', value: '12', href: '/projects?status=developing' },
  { name: 'In Submissions', value: '28', href: '/projects?status=submitted' },
  { name: 'Writers Tracked', value: '45', href: '/contacts?type=writer' },
  { name: 'Meetings This Month', value: '8', href: '/meetings' },
]

const recentSubmissions = [
  { title: 'Indian Country', writer: 'William Jehu Garroutte', source: 'Kung Fu Monkey Productions', genre: 'Crime/Mystery' },
  { title: 'Hobart Memorial', writer: 'Nick Thiel', source: 'Mark Gordon Pictures', genre: 'Medical Drama' },
  { title: 'Endlings', writer: 'TBD', source: 'Wavewalker Films', genre: 'Murder Mystery' },
]

const upcomingMeetings = [
  { contact: 'Brent Jordan Sherman', company: 'The Characters', date: 'Feb 10', type: 'Zoom' },
  { contact: 'Sohrab Merchant', company: 'Characters', date: 'Feb 9', type: 'Zoom' },
]

export default function DashboardPage() {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Submissions</h2>
            <Link href="/projects" className="text-sm text-amber-600 hover:text-amber-700">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentSubmissions.map((project) => (
              <div key={project.title} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{project.title}</p>
                  <p className="text-sm text-slate-500">{project.writer} · via {project.source}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {project.genre}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Meetings</h2>
            <Link href="/meetings" className="text-sm text-amber-600 hover:text-amber-700">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.contact} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{meeting.contact}</p>
                  <p className="text-sm text-slate-500">{meeting.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{meeting.date}</p>
                  <p className="text-xs text-slate-500">{meeting.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
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
        </div>
      </div>
    </div>
  )
}
