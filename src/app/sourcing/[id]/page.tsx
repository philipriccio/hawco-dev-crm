import ClassificationEditor from '@/components/ClassificationEditor'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LeadForm from '../LeadForm'
import ClearSuggestion from '../ClearSuggestion'
import { options } from '../options'
import { panelClass, label } from '../styles'
export const dynamic = 'force-dynamic'
export default async function Page({params}:{params:Promise<{id:string}>}) {
 await requireAuth(); const {id} = await params
 const [lead,opts] = await Promise.all([id==='new'?Promise.resolve(null):prisma.sourcingLead.findUnique({where:{id},include:{events:{orderBy:[{createdAt:'desc'},{id:'asc'}],take:100},contact:{select:{name:true}},project:{select:{title:true}},ip:{select:{title:true}}}}),options()])
 if(id!=='new'&&!lead) notFound()
 return <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8"><Link href="/sourcing" className="underline">← Sourcing</Link><h1 className="break-words text-3xl font-semibold">{lead?.title||'New lead'}</h1>{lead&&<div className={`${panelClass} flex flex-wrap gap-4 text-sm`}><span>{label(lead.decision)} · Revision {lead.version}</span><a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Open source</a>{lead.contactId&&<Link href={`/contacts/${lead.contactId}`} className="underline">Contact: {lead.contact?.name}</Link>}{lead.projectId&&<Link href={`/projects/${lead.projectId}`} className="underline">Project: {lead.project?.title}</Link>}{lead.ipId&&<Link href="/ip" className="underline">IP: {lead.ip?.title}</Link>}</div>}
 {lead&&<div className={panelClass}><p>{lead.dismissedAt?'Cleared from suggestions. Research and feedback are retained.':'Visible in suggestions.'}</p><ClearSuggestion key={`${lead.id}:${lead.version}`} id={lead.id} version={lead.version} title={lead.title} cleared={Boolean(lead.dismissedAt)}/></div>}
 {lead&&<ClassificationEditor key={lead.updatedAt.toISOString()} kind="lead" id={id} version={lead.updatedAt.toISOString()} value={lead}/>}
 <LeadForm key={lead?`${lead.id}:${lead.version}`:'new'} lead={lead?{id:lead.id,version:lead.version,decision:lead.decision,decisionReason:lead.decisionReason,title:lead.title,creator:lead.creator,kind:lead.kind,sourceChannel:lead.sourceChannel,sourceUrl:lead.sourceUrl,sourceDate:lead.sourceDate,basis:lead.basis,fit:lead.fit,gap:lead.gap,nextStep:lead.nextStep,rightsStatus:lead.rightsStatus,rightsEvidence:lead.rightsEvidence,rightsCheckedOn:lead.rightsCheckedOn,contactId:lead.contactId,projectId:lead.projectId,ipId:lead.ipId}:undefined} options={opts}/>
 {lead&&<section className={panelClass}><h2 className="text-xl font-semibold">History</h2><p className="text-sm text-slate-600">Latest 100 events shown; earlier records remain retained. Contact events do not change the decision.</p><ol className="space-y-4">{lead.events.map(event=><li key={event.id} className="break-words border-t pt-3"><p><strong>{label(event.kind)}</strong> · {event.actorName} · {event.createdAt.toISOString().slice(0,16).replace('T',' ')} UTC</p>{event.occurredOn&&<p>Occurred {event.occurredOn}</p>}<p className="whitespace-pre-wrap">{event.note}</p>{event.sourceUrl&&<a className="underline" href={event.sourceUrl} target="_blank" rel="noopener noreferrer">Evidence</a>}<details className="mt-2"><summary className="cursor-pointer">Recorded changes</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({before:event.before,after:event.after},null,2)}</pre></details></li>)}</ol></section>}</main>
}
