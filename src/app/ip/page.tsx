import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatDate, ipInterestColors, ipInterestLabels, ipStatusColors, ipStatusLabels, ipTypeLabels } from '@/lib/ip-display'

export const dynamic = 'force-dynamic'

export default async function IpHubPage() {
  const ipProperties = await prisma.ipProperty.findMany({
    orderBy: [
      { interest: 'desc' },
      { optionExpiryDate: 'asc' },
      { title: 'asc' },
    ],
    include: {
      rightsHolderContact: true,
      rightsHolderCompany: true,
      project: { select: { id: true, title: true, status: true } },
    },
  })

  const statusCounts = await prisma.ipProperty.groupBy({
    by: ['status'],
    _count: { status: true },
  })
  const countMap = Object.fromEntries(statusCounts.map((count) => [count.status, count._count.status]))
  const activeCount = ipProperties.filter((ip) => !['PASSED', 'UNAVAILABLE', 'EXPIRED'].includes(ip.status)).length
  const securedCount = countMap.SECURED || 0
  const deadlineCount = ipProperties.filter((ip) => ip.optionExpiryDate || ip.extensionDeadline).length

  return (
    <div className="p-8 min-w-[760px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">IP</h1>
          <p className="text-slate-500 mt-1">Track underlying works, rights status, and development handoff.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryStat label="Active pursuits" value={activeCount} />
        <SummaryStat label="Secured" value={securedCount} />
        <SummaryStat label="Rights dates tracked" value={deadlineCount} />
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E4E7EC]">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">IP</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rights</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Interest</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Holder</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry / Next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ipProperties.map((ip) => {
              const holder = ip.rightsHolderContact?.name || ip.rightsHolderCompany?.name || ip.rightsHolderName || 'To confirm'
              const nextDate = ip.optionExpiryDate || ip.extensionDeadline

              return (
                <tr key={ip.id} className="hover:bg-[#F2F4F7]">
                  <td className="px-6 py-4">
                    <Link href={`/ip/${ip.id}`} className="font-semibold text-slate-900 hover:text-[#2563EB]">
                      {ip.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1">{ip.creator || 'Creator to confirm'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{ipTypeLabels[ip.type] || ip.type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ipStatusColors[ip.status] || 'bg-slate-100 text-slate-700'}`}>
                      {ipStatusLabels[ip.status] || ip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ipInterestColors[ip.interest] || 'bg-slate-100 text-slate-700'}`}>
                      {ipInterestLabels[ip.interest] || ip.interest}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{holder}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {nextDate ? (
                      <span>{formatDate(nextDate)}</span>
                    ) : (
                      <span className="text-slate-400">No date set</span>
                    )}
                    {ip.project && <p className="text-xs text-emerald-700 mt-1">Linked: {ip.project.title}</p>}
                  </td>
                </tr>
              )
            })}
            {ipProperties.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                  No IP records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
    </div>
  )
}
