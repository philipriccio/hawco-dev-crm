'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { kinds, rightsStatuses, bases, decisions, factualEvents } from '@/lib/sourcing/domain'
import { inputClass, buttonClass, panelClass, label } from './styles'
type Options = {contacts:{id:string;name:string}[];projects:{id:string;title:string}[];ips:{id:string;title:string}[]}
type Lead = {id:string;version:number;decision:string;decisionReason:string;title:string;creator:string;kind:string;sourceChannel:string;sourceUrl:string;sourceDate:string;basis:string;fit:string;gap:string;nextStep:string;rightsStatus:string;rightsEvidence:string;rightsCheckedOn:string;contactId:string|null;projectId:string|null;ipId:string|null}
export default function LeadForm({lead,options}:{lead?:Lead;options:Options}) {
 const router = useRouter(), [busy,setBusy] = useState(false), [error,setError] = useState(''), [saved,setSaved] = useState('')
 const fields = ['title','creator','kind','sourceChannel','sourceUrl','sourceDate','basis','fit','gap','nextStep','rightsStatus','rightsEvidence','rightsCheckedOn','contactId','projectId','ipId'] as const
 async function submit(e:FormEvent<HTMLFormElement>,action:string) {
  e.preventDefault(); if(busy) return
  const form = new FormData(e.currentTarget), value:Record<string,string> = {}
  for(const [key,v] of form) value[key] = String(v)
  setBusy(true);setError('');setSaved('')
  try {
   const res = await fetch(lead ? `/api/sourcing/leads/${lead.id}` : '/api/sourcing/leads',{method:lead?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lead ? {version:lead.version,action,value} : value)})
   const data = await res.json(); if(!res.ok) throw Error(data.error || 'Save failed')
   if(!lead) router.push(`/sourcing/${data.id}`)
   else {setSaved('Saved.');router.refresh()}
  } catch(e) {setError(e instanceof Error ? e.message : 'Could not confirm save. Reload before retrying.')} finally {setBusy(false)}
 }
 const select = (name:string,values:readonly string[],current:string) => <select className={inputClass} name={name} defaultValue={current}>{values.map(v=><option key={v} value={v}>{label(v)}</option>)}</select>
 return <div className="space-y-6">
  {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-900">{error} <button className="underline" onClick={()=>window.location.reload()}>Reload latest record</button> (discards unsaved edits)</div>}
  {saved && <p role="status">{saved}</p>}
  <form onSubmit={e=>submit(e,'edit')} className={panelClass}>
   <h2 className="text-xl font-semibold">{lead ? 'Research & links' : 'Add a research lead'}</h2>
   <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
    {fields.map(key=>{
     const current = lead?.[key] ?? (key==='kind'?'BOOK':key==='rightsStatus'?'UNKNOWN':key==='basis'?'DESCRIPTION_ONLY':'')
     const long = ['fit','gap','nextStep','rightsEvidence'].includes(key)
     return <label key={key} className={`block min-w-0 space-y-1 text-sm ${long?'sm:col-span-2':''}`}><span>{({sourceDate:'Source checked on',basis:'Assessment based on',gap:'Slate gap / explicit project need',rightsEvidence:'Rights evidence (source, scope and limitations)',rightsCheckedOn:'Rights evidence checked on',projectId:'Existing project (link only)',contactId:'Existing contact (link only)',ipId:'Existing IP (link only)'} as Record<string,string>)[key] || key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}</span>
      {key==='kind'?select(key,kinds,current):key==='rightsStatus'?select(key,rightsStatuses,current):key==='basis'?select(key,bases,current):['contactId','projectId','ipId'].includes(key)?<select name={key} className={inputClass} defaultValue={current}><option value="">No link recorded</option>{(key==='contactId'?options.contacts.map(x=>({id:x.id,title:x.name})):key==='projectId'?options.projects:options.ips).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>:long?<textarea name={key} defaultValue={current} rows={3} maxLength={8000} className={inputClass}/>:<input name={key} defaultValue={current} className={inputClass} type={key==='sourceUrl'?'url':key.endsWith('Date')||key==='rightsCheckedOn'?'date':'text'} required={['title','sourceChannel','sourceUrl','sourceDate'].includes(key)} maxLength={key==='sourceUrl'?2000:key==='sourceChannel'?200:300}/>}
     </label>
    })}
   </fieldset>
   <p className="text-sm text-slate-600">Unknown rights stay unknown. Representation is not availability. Links do not create projects, confirm rights or change anyone’s reading history.</p>
   <button disabled={busy} className={buttonClass}>{busy?'Saving…':lead?'Save research':'Create lead'}</button>
  </form>
  {lead && <>
   <form onSubmit={e=>submit(e,'decision')} className={panelClass}><h2 className="text-xl font-semibold">Your decision</h2><p className="text-sm">Separate from contact events. Passing or “not now” requires a reason.</p><fieldset disabled={busy} className="space-y-3"><label className="block">Decision{select('decision',decisions,lead.decision)}</label><label className="block">Reason<textarea name="reason" defaultValue={lead.decisionReason} className={inputClass} maxLength={8000}/></label></fieldset><button disabled={busy} className={buttonClass}>Record decision</button></form>
   <form onSubmit={e=>submit(e,'event')} className={panelClass}><h2 className="text-xl font-semibold">Record a factual event</h2><p className="text-sm">Records what already happened; does not send anything or change your decision.</p><fieldset disabled={busy} className="space-y-3"><label className="block">Event{select('kind',factualEvents,'INQUIRY_SENT')}</label><label className="block">Occurred on<input name="occurredOn" type="date" required className={inputClass}/></label><label className="block">Evidence / email thread URL<input name="sourceUrl" type="url" maxLength={2000} className={inputClass}/></label><label className="block">What happened<textarea name="note" required maxLength={8000} className={inputClass}/></label></fieldset><button disabled={busy} className={buttonClass}>Record event</button></form>
  </>}
 </div>
}
