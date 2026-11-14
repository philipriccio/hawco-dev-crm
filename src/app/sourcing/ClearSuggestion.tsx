'use client'
import { useRef, useState, useTransition, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { buttonClass, inputClass } from './styles'

export default function ClearSuggestion({id, version, title, cleared}: {id:string;version:number;title:string;cleared:boolean}) {
 const router = useRouter(), trigger = useRef<HTMLButtonElement>(null)
 const [open,setOpen] = useState(false), [note,setNote] = useState(''), [busy,setBusy] = useState(false), [pending,startTransition] = useTransition(), [error,setError] = useState('')
 const disabled = busy || pending
 const restoreFocus = useRef(false)
 useEffect(()=>{if(!open&&restoreFocus.current){trigger.current?.focus();restoreFocus.current=false}},[open])
 function cancel() {restoreFocus.current=true;setOpen(false);setError('')}
 async function save(e?:FormEvent<HTMLFormElement>) {
  e?.preventDefault(); if(disabled) return
  setBusy(true);setError('')
  try {
   const res = await fetch(`/api/sourcing/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,action:cleared?'restore':'dismiss',value:cleared?{}:{note}})})
   const data = await res.json()
   if(!res.ok) throw Error(data.error || 'Could not confirm this change. Reload before retrying.')
   startTransition(()=>router.refresh())
  } catch(e) {setError(e instanceof Error ? e.message : 'Could not confirm this change. Reload before retrying.')} finally {setBusy(false)}
 }
 return <div className="mt-4 space-y-3">
  {error&&<div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">{error} <button type="button" className="underline" onClick={()=>window.location.reload()}>Reload suggestions</button> (discards unsaved notes)</div>}
  {!open?<button ref={trigger} type="button" className={buttonClass} disabled={disabled} aria-label={`${cleared?'Restore':'Clear'} suggestion: ${title}`} onClick={()=>cleared?void save():setOpen(true)}>{disabled?'Saving…':cleared?'Restore suggestion':'Clear suggestion'}</button>:<form onSubmit={save} onKeyDown={e=>{if(e.key==='Escape'&&!disabled){e.preventDefault();cancel()}}} className="space-y-3 rounded border border-slate-300 bg-slate-50 p-3">
   <label className="block text-sm">Why isn’t this a fit? (optional)<textarea autoFocus value={note} onChange={e=>setNote(e.target.value)} disabled={disabled} maxLength={8000} rows={3} className={inputClass} placeholder="For example: too bleak; looking for warmer, character-led stories."/></label>
   <p className="text-sm text-slate-600">Your note is saved with this suggestion, not applied as a blanket rule. You can restore it from Cleared suggestions.</p>
   <div className="flex flex-wrap gap-2"><button disabled={disabled} className={buttonClass}>{disabled?'Saving…':'Confirm clear'}</button><button disabled={disabled} type="button" className={buttonClass} onClick={cancel}>Cancel</button></div>
  </form>}
 </div>
}
