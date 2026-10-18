import Link from 'next/link'
import { prisma } from '@/lib/db'
import { CompanyTabs } from '@/components/CompanyTabs'

export async function CompanyDirectory({ filters }: { filters: { q?: string; type?: string } }) {
  const q = (filters.q || '').trim().slice(0, 120)
  const type = filters.type === 'PRODUCTION_COMPANY' || filters.type === 'DISTRIBUTOR' ? filters.type : undefined
  const companies = await prisma.company.findMany({
    where: {
      type: type || { in: ['PRODUCTION_COMPANY', 'DISTRIBUTOR'] },
      ...(q ? { OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { contacts: { some: { name: { contains: q, mode: 'insensitive' as const } } } },
      ] } : {}),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true, region: true, notes: true, isBuyer: true,
      contacts: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
      _count: { select: { projects: true } },
    },
  })
  return <div className="p-4 sm:p-8 space-y-6">
    <header><h1 className="text-3xl font-bold text-slate-900">Buyers &amp; Companies</h1>
      <p className="mt-2 text-slate-500">Production and distribution relationships, the people we know, and relevant conversations.</p></header>
    <CompanyTabs active="companies" />
    <form action="/buyers" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="tab" value="companies" />
      <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Search company or contact
        <input name="q" defaultValue={q} maxLength={120} placeholder="Company or person…" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="text-sm font-medium text-slate-700">Company type
        <select name="type" defaultValue={type || ''} className="mt-1 block max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="">All</option><option value="PRODUCTION_COMPANY">Production companies</option><option value="DISTRIBUTOR">Distributors</option>
        </select>
      </label>
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Search</button>
      {(q || type) && <Link href="/buyers?tab=companies" className="px-2 py-2 text-sm text-blue-700 underline">Clear filters</Link>}
    </form>
    <p className="text-sm text-slate-500">{companies.length} {companies.length === 1 ? 'company' : 'companies'}{q || type ? ' matching filters' : ''}</p>
    {companies.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">{q || type ? 'No matching companies. Try another name or clear the filters.' : 'No production companies or distributors added yet.'}</div> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => <Link key={company.id} href={`/companies/${company.id}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-600">
          <p className="text-xs font-medium text-slate-500">{company.type === 'DISTRIBUTOR' ? 'Distributor' : 'Production company'}{company.isBuyer ? ' · Buyer' : ''}{company.region ? ` · ${company.region}` : ''}</p>
          <h2 className="mt-2 break-words text-lg font-bold text-slate-900">{company.name}</h2>
          <p className="mt-2 text-sm text-slate-600">{company.contacts.length ? company.contacts.map((contact) => contact.name).join(', ') : 'No contacts linked yet'}</p>
          {company.notes && <p className="mt-3 line-clamp-3 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">{company.notes}</p>}
          <p className="mt-4 text-xs text-slate-500">{company._count.projects} linked Hawco {company._count.projects === 1 ? 'project' : 'projects'}</p>
        </Link>)}
      </div>}
  </div>
}
