import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: 'asc' } },
      projects: { include: { project: true } },
    },
  })

  if (!company) notFound()

  return (
    <div className="p-8 space-y-6">
      <Link href="/projects" className="text-[#2563EB] hover:text-[#1D4ED8]">← Back to Projects</Link>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
        <p className="text-slate-500">{company.type.replace(/_/g, ' ')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
        <h2 className="text-lg font-semibold mb-3">Contacts</h2>
        {company.contacts.length === 0 ? (
          <p className="text-slate-500">No contacts linked.</p>
        ) : (
          <div className="space-y-2">
            {company.contacts.map((contact) => (
              <Link key={contact.id} href={`/contacts/${contact.id}`} className="block p-2 rounded hover:bg-[#F2F4F7]">
                {contact.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        {company.projects.length === 0 ? (
          <p className="text-slate-500">No projects linked.</p>
        ) : (
          <div className="space-y-2">
            {company.projects.map((projectLink) => (
              <Link key={projectLink.id} href={`/projects/${projectLink.project.id}`} className="block p-2 rounded hover:bg-[#F2F4F7]">
                {projectLink.project.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
