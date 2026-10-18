import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { SourceNotes } from '@/components/SourceNotes'

export const dynamic = 'force-dynamic'

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: 'asc' }, select: { id: true, name: true, type: true, email: true, execTitle: true, notes: true } },
      projects: { include: { project: { select: { id: true, title: true } } } },
    },
  })
  if (!company) notFound()
  const website = company.website && /^https?:\/\//i.test(company.website) ? company.website : null
  const isProductionOrDistribution = company.type === 'PRODUCTION_COMPANY' || company.type === 'DISTRIBUTOR'

  return <div className="p-4 sm:p-8 space-y-6">
    <Link href={isProductionOrDistribution ? '/buyers?tab=companies' : '/buyers'} className="text-blue-700 hover:underline">← Back to Buyers &amp; Companies</Link>
    <header className="space-y-2">
      <h1 className="break-words text-3xl font-bold text-slate-900">{company.name}</h1>
      <p className="text-slate-500">{company.type.replace(/_/g, ' ')}{company.region ? ` · ${company.region}` : ''}</p>
      <div className="flex flex-wrap gap-4">
        {website && <a href={website} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Company website ↗</a>}
        {company.isBuyer && <Link href={`/buyers/${company.id}`} className="text-blue-700 underline">Buyer mandates &amp; slate →</Link>}
      </div>
    </header>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-3 text-lg font-semibold">Relationship notes</h2>
      {company.notes ? <SourceNotes text={company.notes} /> : <p className="text-slate-500">No relationship notes yet.</p>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <Link href={`/contacts/new?companyId=${encodeURIComponent(company.id)}`} className="text-sm font-medium text-blue-700 underline">Add contact</Link>
      </div>
      {company.contacts.length === 0 ? <p className="text-slate-500">No contacts linked.</p> :
        <div className="divide-y divide-slate-100">{company.contacts.map((contact) => <article key={contact.id} className="space-y-2 py-4 first:pt-0">
          <Link href={`/contacts/${contact.id}`} className="font-semibold text-blue-700 hover:underline">{contact.name}</Link>
          <p className="text-sm text-slate-500">{contact.execTitle || contact.type.replace(/_/g, ' ')}</p>
          {contact.email && <p className="break-all text-sm text-slate-600">{contact.email}</p>}
          {contact.notes && <details className="rounded-lg border border-slate-100 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Relationship notes</summary>
            <div className="mt-3"><SourceNotes text={contact.notes} /></div>
          </details>}
        </article>)}</div>}
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="mb-3 text-lg font-semibold">Linked Hawco projects</h2>
      {company.projects.length === 0 ? <p className="text-slate-500">No Hawco projects linked.</p> :
        <div className="space-y-2">{company.projects.map((link) => <Link key={link.id} href={`/projects/${link.project.id}`} className="block rounded p-2 hover:bg-slate-50">
          <span className="font-medium text-blue-700">{link.project.title}</span>
          {link.role && <span className="ml-2 text-sm text-slate-500">{link.role.replace(/_/g, ' ')}</span>}
        </Link>)}</div>}
    </section>
  </div>
}
