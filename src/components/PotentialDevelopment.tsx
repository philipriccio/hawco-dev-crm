import Link from 'next/link'
import type { getPotentialDevelopment } from '@/lib/potential-development'

type PotentialProject = Awaited<ReturnType<typeof getPotentialDevelopment>>[number]

export default function PotentialDevelopment({ projects }: { projects: PotentialProject[] }) {
  return <section id="potential-development" aria-labelledby="potential-development-heading" className="min-w-0 scroll-mt-4 border-t-2 border-amber-200 pt-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="potential-development-heading">Potential Development Projects <span className="ml-2 text-sm font-normal text-slate-500">{projects.length} project{projects.length === 1 ? '' : 's'}</span></h2>
        <p className="mt-1 text-sm text-slate-500">Projects being explored, separate from the confirmed development slate.</p>
      </div>
      <Link href="/projects?status=potential_development" className="text-sm font-medium text-blue-700 hover:underline">View projects →</Link>
    </div>
    {projects.length === 0 ? <p className="mt-5 rounded-lg bg-white/60 p-5 text-sm text-slate-500">No potential development projects yet.</p> :
      <ul className="mt-5 divide-y divide-amber-200 border-y border-amber-200">
        {projects.map(project => <li key={project.id} data-potential-project={project.id} className="grid min-w-0 gap-4 bg-amber-50/50 px-3 py-5 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-3">
            <h3 className="text-base font-semibold [overflow-wrap:anywhere]"><Link href={`/projects/${encodeURIComponent(project.id)}`} className="text-[#203346] underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600">{project.title}</Link></h3>
            <p className="mt-2 text-xs font-medium text-amber-800">Potential Development</p>
          </div>
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:col-span-9 xl:grid-cols-3">
            <div className="min-w-0"><dt className="text-xs font-medium text-slate-600">Writers</dt><dd className="mt-1 text-sm [overflow-wrap:anywhere]">{project.contacts.length ? <ul>{project.contacts.map(({ contact }) => <li key={contact.id}><Link href={`/contacts/${encodeURIComponent(contact.id)}`} className="text-blue-700 hover:underline">{contact.name}</Link></li>)}</ul> : 'Not recorded'}</dd></div>
            <div className="min-w-0"><dt className="text-xs font-medium text-slate-600">Summary</dt><dd className="mt-1 whitespace-pre-line text-sm [overflow-wrap:anywhere]">{project.logline || 'Not recorded'}</dd>{project.currentStage ? <><dt className="mt-3 text-xs font-medium text-slate-600">Stage notes</dt><dd className="mt-1 whitespace-pre-line text-sm [overflow-wrap:anywhere]">{project.currentStage}</dd></> : null}</div>
            <div className="min-w-0"><dt className="text-xs font-medium text-slate-600">Next steps</dt><dd className="mt-1 whitespace-pre-line text-sm [overflow-wrap:anywhere]">{project.nextAction || 'Not recorded'}</dd></div>
          </dl>
        </li>)}
      </ul>}
  </section>
}
