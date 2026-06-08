import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function BuyersPage() {
  const [buyers, documents] = await Promise.all([
    prisma.company.findMany({
      where: { isBuyer: true },
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
      include: {
        contacts: { select: { id: true } },
        projects: { where: { role: { startsWith: 'TARGET_BUYER' } }, select: { id: true } },
        slateItems: { select: { id: true, confirmed: true } },
      },
    }),
    prisma.researchDocument.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
  ])

  const phaseOneOrder = ['CBC', 'Bell Media', 'Netflix Canada', 'Disney+ Canada']
  const orderedBuyers = [...buyers].sort((a, b) => {
    const ai = phaseOneOrder.indexOf(a.name)
    const bi = phaseOneOrder.indexOf(b.name)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buyers</h1>
          <p className="text-slate-500 mt-1">Buyer mandates, slate intelligence, contacts, and Hawco projects targeting each outlet.</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-sm font-semibold border border-[#DBEAFE]">
          {orderedBuyers.length} buyers tracked
        </span>
      </div>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {orderedBuyers.map((buyer) => {
            const pendingCount = buyer.slateItems.filter((item) => !item.confirmed).length
            return (
              <Link key={buyer.id} href={`/buyers/${buyer.id}`} className="group block bg-white rounded-2xl border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold tracking-tight">
                    {buyer.name.split(/\s|\+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                  </div>
                  {pendingCount > 0 && (
                    <span className="px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-[#1D4ED8]">{buyer.name}</h2>
                {buyer.brands && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{buyer.brands}</p>}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-[#F2F4F7] text-slate-700">{buyer.region || 'Region unset'}</span>
                  <span className="px-2 py-1 rounded-full bg-[#F2F4F7] text-slate-700">{buyer.contacts.length} contacts</span>
                  <span className="px-2 py-1 rounded-full bg-[#F2F4F7] text-slate-700">{buyer.projects.length} projects</span>
                  <span className="px-2 py-1 rounded-full bg-[#F2F4F7] text-slate-700">{buyer.slateItems.length} slate</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Research docs</h2>
            <p className="text-sm text-slate-500">General research documents preserved from the old Research tab.</p>
          </div>
          <Link href="/research" className="text-sm font-semibold text-[#1D4ED8] hover:underline">Legacy upload view</Link>
        </div>
        {documents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No research documents yet.</div>
        ) : (
          <div className="divide-y divide-[#E4E7EC]">
            {documents.map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                  {doc.description && <p className="text-sm text-slate-500 mt-0.5">{doc.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{doc.fileName} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8]">View</a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
