import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ProjectWithRelations } from './ProjectDetailClient'
import { classificationLabel, classificationSummary, type Classification } from '@/lib/classification/domain'
import { isTargetBuyerRole, targetBuyerRoleLabel } from '@/lib/target-buyers'
import TriageNotes from '@/components/TriageNotes'

type OverviewProject = ProjectWithRelations & Classification & {
  pipelineStage: string | null
  ipProperties: { id: string; title: string }[]
  followUps: { id: string; note: string; completed: boolean; waitingOn: string | null; dueAt: Date | null; ownerName: string | null }[]
}
const date = (value: Date) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'UTC' })
const linkStyle = 'text-blue-700 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700'
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{children || <span className="text-slate-500">Not recorded</span>}</dd></div>
}
function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group border-t border-slate-200 py-5"><summary className="cursor-pointer text-base font-semibold text-slate-900 focus-visible:outline-blue-600">{title}</summary><div className="mt-5 space-y-4 text-sm leading-6">{children}</div></details>
}

/** Saved project facts only. Never derive an attachment, rights clearance or read date. */
export default function ProjectOverview({ project }: { project: OverviewProject }) {
  const writers = project.contacts.filter(item => item.role === 'WRITER')
  const attached = project.contacts.filter(item => item.role !== 'WRITER' && item.role !== 'CONSIDERED_WRITER')
  const considered = project.contacts.filter(item => item.role === 'CONSIDERED_WRITER')
  const targets = project.companies.filter(item => isTargetBuyerRole(item.role))
  const companies = project.companies.filter(item => !isTargetBuyerRole(item.role))
  const coverages = [...new Map([...project.coverages, ...project.materials.flatMap(item => item.coverages.map(coverage => ({ ...coverage, title: item.title })))].map(item => [item.id, item])).values()]
  const read = Boolean(project.firstReadAt || project.readState === 'READ')
  return <article className="bg-white px-5 py-7 text-slate-800 sm:px-10 sm:py-10 [overflow-wrap:anywhere]">
    <Link href="/projects" className={`text-sm ${linkStyle}`}>← Projects</Link>
    <header className="mt-7 max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{project.status === 'READING' ? 'To be read' : classificationLabel(project.status)}</span><span className="text-slate-500">{project.origin === 'HAWCO_ORIGINAL' ? 'Hawco original' : classificationLabel(project.origin)}</span><span className="text-slate-300" aria-hidden="true">·</span><span className={read ? 'text-emerald-700' : 'text-slate-500'}>{read ? 'Read' : classificationLabel(project.readState || 'UNREAD')}</span>{project.verdict && <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{classificationLabel(project.verdict)}</span>}</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{project.title}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">{classificationSummary(project)}</p>
      {project.descriptorTags.length > 0 && <p className="mt-1 text-sm leading-6 text-slate-500">{project.descriptorTags.join(' · ')}</p>}
      <p className="mt-7 whitespace-pre-wrap text-lg leading-8 text-slate-800 sm:text-xl">{project.logline || <span className="text-slate-400">No logline recorded.</span>}</p>
    </header>

    <div className="mt-9 grid min-w-0 gap-10 border-t border-slate-200 pt-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
      <div className="min-w-0 space-y-9">
        <section aria-labelledby="overview-story"><h2 id="overview-story" className="text-lg font-semibold text-slate-950">The story</h2>{project.synopsis && project.synopsis.length > 700 ? <details className="mt-3 text-sm leading-7 text-slate-600"><summary className="cursor-pointer text-blue-700">Read full synopsis</summary><p className="mt-3 whitespace-pre-wrap">{project.synopsis}</p></details> : <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{project.synopsis || 'No synopsis recorded.'}</p>}{project.comps && <p className="mt-4 text-sm leading-6"><span className="text-slate-500">Comparables · </span>{project.comps}</p>}</section>
        <section aria-labelledby="overview-creators"><h2 id="overview-creators" className="text-lg font-semibold text-slate-950">Writers & underlying IP</h2><dl className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="Attached writers">{writers.length ? writers.map(item => <Link key={item.id} href={`/contacts/${item.contact.id}`} className={`block ${linkStyle}`}>{item.contact.name}</Link>) : null}</Field><Field label="Linked IP">{project.ipProperties.length ? project.ipProperties.map(item => <Link key={item.id} href={`/ip/${item.id}`} className={`block ${linkStyle}`}>{item.title}</Link>) : 'No IP linked'}</Field></dl><p className="mt-3 text-xs leading-5 text-slate-500">An IP link records the underlying property, not ownership or cleared rights.</p></section>
        <section aria-labelledby="overview-package"><h2 id="overview-package" className="text-lg font-semibold text-slate-950">Package & buyers</h2><dl className="mt-4 grid gap-5 sm:grid-cols-2"><Field label="Packaging needs">{project.packagingNeeds}</Field><Field label="Target network">{project.targetNetwork}</Field><Field label="Attached contacts">{attached.length ? attached.map(item => <div key={item.id}><Link href={`/contacts/${item.contact.id}`} className={linkStyle}>{item.contact.name}</Link><span className="text-slate-500"> · {classificationLabel(item.role)}</span></div>) : null}</Field><Field label="Linked companies">{companies.length ? companies.map(item => <div key={item.id}><Link href={`/companies/${item.company.id}`} className={linkStyle}>{item.company.name}</Link><span className="text-slate-500"> · {item.role || 'Role not recorded'}</span></div>) : null}</Field></dl>
        {(targets.length > 0 || considered.length > 0) && <div className="mt-5 border-l-2 border-slate-200 pl-4"><p className="mb-3 text-xs text-slate-500">Targets and considerations — not confirmed attachments</p><dl className="space-y-4">{targets.length > 0 && <Field label="Buyer targets">{targets.map(item => <div key={item.id}><Link href={`/buyers/${item.company.id}`} className={linkStyle}>{item.company.name}</Link><span className="text-slate-500"> · {targetBuyerRoleLabel(item.role)}</span></div>)}</Field>}{considered.length > 0 && <Field label="Writers being considered">{considered.map(item => <Link key={item.id} href={`/contacts/${item.contact.id}`} className={`block ${linkStyle}`}>{item.contact.name}</Link>)}</Field>}</dl></div>}</section>
      </div>
      <aside className="min-w-0 self-start rounded-xl bg-slate-50 p-5 sm:p-6" aria-labelledby="overview-next"><h2 id="overview-next" className="text-lg font-semibold text-slate-950">Where it stands</h2><dl className="mt-5 space-y-5"><Field label="Pipeline stage">{classificationLabel(project.pipelineStage)}</Field><Field label="Current stage notes">{project.currentStage}</Field><Field label="Next steps">{project.nextAction}</Field></dl><p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Next steps are planning notes. Assigned tasks and dates are listed below.</p></aside>
    </div>

    <section aria-label="Project reference" className="mt-10">
      <Disclosure title={`Materials & coverage · ${project.materials.length} materials, ${coverages.length} reports`}><div className="grid gap-8 sm:grid-cols-2"><div><h3 className="mb-3 font-semibold">Materials</h3>{project.materials.length ? <ul className="space-y-4">{project.materials.map(item => <li key={item.id}><Link href={`/materials?materialId=${encodeURIComponent(item.id)}`} className={linkStyle}>{item.title}</Link><p className="text-xs text-slate-500">{classificationLabel(item.type)} · {item.readAt || item.readState === 'READ' ? 'Read' : classificationLabel(item.readState || 'UNREAD')}</p></li>)}</ul> : <p className="text-slate-500">No materials linked.</p>}</div><div><h3 className="mb-3 font-semibold">Coverage</h3>{coverages.length ? <ul className="space-y-4">{coverages.map(item => <li key={item.id}><Link href={`/coverage/${item.id}`} className={linkStyle}>{item.title || project.title}</Link><p className="text-xs text-slate-500">{item.reader} · {date(item.dateRead)}{item.scoreTotal != null ? ` · ${item.scoreTotal}/50` : ''}</p></li>)}</ul> : <p className="text-slate-500">No coverage recorded.</p>}</div></div></Disclosure>
      <Disclosure title={`Notes & follow-ups · ${(project.triageNotes || []).length} notes, ${project.followUps.length} tasks`}><TriageNotes notes={project.triageNotes || []} />{project.notes && <div><h3 className="font-semibold">Sourcing / legacy notes</h3><p className="mt-2 whitespace-pre-wrap text-slate-600">{project.notes}</p></div>}{project.followUps.map(item => <div key={item.id}><p>{item.note}</p><p className="text-xs text-slate-500">{item.completed ? 'Completed' : 'Open'} · {item.ownerName || 'Owner not recorded'}{item.waitingOn ? ` · Waiting on ${item.waitingOn}` : ''} · {item.dueAt ? date(item.dueAt) : 'No due date'}</p></div>)}{!project.notes && !project.triageNotes?.length && !project.followUps.length && <p className="text-slate-500">No notes or follow-ups recorded.</p>}</Disclosure>
      <Disclosure title="Project record"><dl className="grid gap-5 sm:grid-cols-3"><Field label="Received">{project.dateReceived ? date(project.dateReceived) : null}</Field><Field label="Read history">{project.readDateLabel || (project.firstReadAt ? date(project.firstReadAt) : read ? 'Read — date not recorded' : 'Not read')}</Field><Field label="Option expiry">{project.optionExpiryDate ? date(project.optionExpiryDate) : 'Not recorded — rights not confirmed'}</Field><Field label="Legacy format / genre">{[project.format, project.genre].filter(Boolean).join(' · ')}</Field><Field label="Legacy genre tags">{project.tags.map(item => item.tag.name).join(' · ')}</Field><Field label="Last updated">{date(project.updatedAt)}</Field></dl><p className="text-xs text-slate-500">Agreements, costs, rewrite tracking and workflow controls are in Manage.</p></Disclosure>
    </section>
  </article>
}
