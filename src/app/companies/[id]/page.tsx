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
      <Link href="/projects" className="text-amber-600 hover:text-amber-700">← Back to Projects</Link>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
        <p className="text-slate-500">{company.type.replace(/_/g, ' ')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-3">Contacts</h2>
        {company.contacts.length === 0 ? (
          <p className="text-slate-500">No contacts linked.</p>
        ) : (
          <div className="space-y-2">
            {company.contacts.map((contact) => (
              <Link key={contact.id} href={`/contacts/${contact.id}`} className="block p-2 rounded hover:bg-slate-50">
                {contact.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-3">Projects</h2>
        {company.projects.length === 0 ? (
          <p className="text-slate-500">No projects linked.</p>
        ) : (
          <div className="space-y-2">
            {company.projects.map((projectLink) => (
              <Link key={projectLink.id} href={`/projects/${projectLink.project.id}`} className="block p-2 rounded hover:bg-slate-50">
                {projectLink.project.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
