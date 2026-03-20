import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const INTAKE_STATUSES = ['SUBMITTED', 'READING', 'PASSED', 'CONSIDER_RELATIONSHIP', 'REWRITE_IN_PROGRESS'] as const
const FIRST_READ_SLA_DAYS = 7

function daysBetween(start: Date | null, end: Date = new Date()) {
  if (!start) return null
  return Math.floor((end.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
}

export default async function IntakeQueuePage() {
  const projects = await prisma.project.findMany({
    where: { status: { in: [...INTAKE_STATUSES] } },
    include: {
      contacts: { include: { contact: true }, where: { role: 'WRITER' }, take: 1 },
      rewriteCycles: { orderBy: { cycleNumber: 'desc' }, take: 1 },
    },
    orderBy: [{ readPriority: 'desc' }, { dateReceived: 'asc' }],
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Intake Queue</h1>
          <p className="text-slate-500 mt-1">Early funnel submissions and first-read SLA tracking</p>
        </div>
        <Link href="/projects/new" className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8]">New Submission</Link>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E4E7EC] text-xs uppercase text-slate-500">
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Writer</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Days Since Received</th>
              <th className="px-4 py-3 text-left">Days to First Read</th>
              <th className="px-4 py-3 text-left">SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((project) => {
              const daysSinceReceived = daysBetween(project.dateReceived || project.createdAt)
              const daysToFirstRead = project.firstReadAt && project.dateReceived
                ? daysBetween(project.dateReceived, new Date(project.firstReadAt))
                : null
              const overdueFirstRead = !project.firstReadAt && (daysSinceReceived ?? 0) > FIRST_READ_SLA_DAYS

              return (
                <tr key={project.id} className="hover:bg-[#F2F4F7]">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:text-[#2563EB]">
                      {project.title}
                    </Link>
                    {project.readPriority !== null && <p className="text-xs text-slate-500">Priority: {project.readPriority}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{project.contacts[0]?.contact.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{project.status.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{daysSinceReceived ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{daysToFirstRead ?? '—'}</td>
                  <td className="px-4 py-3">
                    {overdueFirstRead ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue first read</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">On track</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {projects.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No intake projects in early funnel.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
