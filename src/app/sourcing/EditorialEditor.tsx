'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { editorialFields, editorialSources, evidenceFields, type Editorial, type EditorialSource } from '@/lib/sourcing/editorial'
import { buttonClass, inputClass, panelClass } from './styles'
const names:Record<typeof editorialFields[number],string>={editorialSynopsis:'Short synopsis',editorialGenre:'Source-described genre',editorialAccolades:'Awards & accolades',editorialSales:'Impressive sales or reach',editorialWhy:'Why it’s interesting',editorialCaveat:'Worth knowing'}
export default function EditorialEditor({id,version,lead}:{id:string;version:number;lead:Editorial}) {
 const router=useRouter(), [sources,setSources]=useState<EditorialSource[]>(()=>editorialSources(lead.editorialSources)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('')
 function changeSource(index:number,key:keyof EditorialSource,value:string) {setSources(all=>all.map((s,i)=>i===index?{...s,[key]:value}:s))}
 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(busy)return
  const form=new FormData(e.currentTarget),value={...Object.fromEntries(editorialFields.map(k=>[k,String(form.get(k)||'')])),editorialSources:sources}
  setBusy(true);setError('');setSaved('')
  try {
   const res=await fetch(`/api/sourcing/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,action:'editorial',value})}),data=await res.json()
   if(!res.ok)throw Error(data.error||'Could not confirm save. Reload before retrying.')
   setSaved('Overview saved.');router.refresh()
  } catch(e) {setError(e instanceof Error?e.message:'Could not confirm save. Reload before retrying.')} finally {setBusy(false)}
 }
 return <form onSubmit={submit} className={panelClass}><h2 className="text-xl font-semibold">Edit editorial overview</h2><p className="text-sm text-slate-600">Write concise, useful copy. Leave unverified awards and sales blank. Add a dated source for each populated section; keep assessment distinct from fact.</p>
 {error&&<div role="alert" className="text-red-800">{error} <button type="button" className="underline" onClick={()=>window.location.reload()}>Reload latest overview</button> (discards unsaved edits)</div>}{saved&&<p role="status">{saved}</p>}
 <fieldset disabled={busy} className="min-w-0 space-y-4">{editorialFields.map(k=><div key={k} className="text-sm"><label htmlFor={`editorial-${id}-${k}`} className="block">{names[k]}</label><textarea id={`editorial-${id}-${k}`} name={k} defaultValue={lead[k]} rows={k==='editorialSynopsis'?4:2} maxLength={k==='editorialGenre'?200:k==='editorialSynopsis'?1800:1200} className={inputClass}/></div>)}
 <h3 className="font-semibold">Sources for this overview</h3>{sources.map((s,i)=><div key={i} className="space-y-2 rounded border p-3"><label className="block text-sm">Section<select className={inputClass} value={s.field} onChange={e=>changeSource(i,'field',e.target.value)}>{evidenceFields.map(v=><option key={v}>{v}</option>)}</select></label><label className="block text-sm">Source label<input required maxLength={300} className={inputClass} value={s.label} onChange={e=>changeSource(i,'label',e.target.value)}/></label><label className="block text-sm">Source URL<input required type="url" maxLength={2000} className={inputClass} value={s.url} onChange={e=>changeSource(i,'url',e.target.value)}/></label><label className="block text-sm">Checked on<input required type="date" className={inputClass} value={s.checkedOn} onChange={e=>changeSource(i,'checkedOn',e.target.value)}/></label><button type="button" className="underline" onClick={()=>setSources(all=>all.filter((_,n)=>n!==i))}>Remove source {i+1}</button></div>)}
 <button type="button" disabled={sources.length>=40} className={buttonClass} onClick={()=>setSources(all=>[...all,{field:'synopsis',url:'',label:'',checkedOn:''}])}>Add source</button></fieldset><button disabled={busy} className={buttonClass}>{busy?'Saving…':'Save overview'}</button></form>
}
