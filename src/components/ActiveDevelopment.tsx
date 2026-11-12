import Link from 'next/link'
import type { ProjectStatus } from '@prisma/client'

type ActiveProject = {
  id: string
  title: string
  status: ProjectStatus
  currentStage: string | null
  nextAction: string | null
  contacts: { contact: { id: string; name: string } }[]
  ipProperties: { id: string; title: string }[]
}

const statusLabels: Partial<Record<ProjectStatus, string>> = {
  EARLY_DEVELOPMENT: 'Early Development',
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  DEVELOPING_WITH_NETWORK: 'Developing with Network',
  GREENLIT: 'Greenlit',
}

export default function ActiveDevelopment({ projects }: { projects: ActiveProject[] }) {
  return (
    <section id="active-development" aria-labelledby="active-development-heading" className="min-w-0 scroll-mt-4 border-t-2 border-[#b59558] pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="active-development-heading">Active Development <span className="ml-2 text-sm font-normal text-slate-500">{projects.length} project{projects.length === 1 ? '' : 's'}</span></h2>
          <p className="mt-1 text-sm text-slate-500">Every project on the Slate, with its attached writers, underlying IP and next steps.</p>
        </div>
        <Link href="/whiteboard" className="shrink-0 text-sm font-medium text-blue-700 hover:underline">Open Slate →</Link>
      </div>

      {projects.length === 0 ? (
        <p className="mt-5 rounded-lg bg-white/60 p-5 text-sm text-slate-500">No active development projects on the Slate yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#dedfd9] border-y border-[#dedfd9]">
          {projects.map((project) => (
            <li key={project.id} className="grid min-w-0 gap-4 py-5 xl:grid-cols-12 xl:gap-5">
              <h3 className="min-w-0 text-base font-semibold [overflow-wrap:anywhere] xl:col-span-3">
                <Link href={`/projects/${encodeURIComponent(project.id)}`} className="text-[#203346] hover:underline">{project.title}</Link>
              </h3>
              <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:col-span-9 xl:grid-cols-9 xl:gap-5">
                <div className="min-w-0 xl:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Writers</dt>
                  <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                    {project.contacts.length > 0 ? (
                      <ul className="space-y-1">
                        {project.contacts.map(({ contact }) => <li key={contact.id}><Link href={`/contacts/${encodeURIComponent(contact.id)}`} className="text-blue-700 hover:underline">{contact.name}</Link></li>)}
                      </ul>
                    ) : <span className="text-slate-500">Not recorded</span>}
                  </dd>
                </div>
                <div className="min-w-0 xl:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Underlying IP</dt>
                  <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                    {project.ipProperties.length > 0 ? (
                      <ul className="space-y-1">
                        {project.ipProperties.map((ip) => <li key={ip.id}><Link href={`/ip/${encodeURIComponent(ip.id)}`} className="text-blue-700 hover:underline">{ip.title}</Link></li>)}
                      </ul>
                    ) : <span className="text-slate-500">Not recorded</span>}
                  </dd>
                </div>
                <div className="min-w-0 xl:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Status</dt>
                  <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                    <span className="inline-block max-w-full rounded-md bg-[#e9ede9] px-2 py-1 text-xs font-medium text-[#203346]">{statusLabels[project.status] || project.status.replaceAll('_', ' ')}</span>
                    {project.currentStage?.trim() && <p className="mt-2 whitespace-pre-wrap text-slate-600">{project.currentStage}</p>}
                  </dd>
                </div>
                <div className="min-w-0 xl:col-span-3">
                  <dt className="text-xs font-medium text-slate-500">Next steps</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">{project.nextAction?.trim() ? project.nextAction : <span className="text-slate-500">Not recorded</span>}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
