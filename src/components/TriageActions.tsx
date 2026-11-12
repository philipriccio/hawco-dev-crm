'use client'
import { useRef, useState, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'

type Receipt = {mutationId:string;undoUntil:string}
const decisions = [['PURSUE','Pursue'],['CONSIDERING','Considering'],['PASS','Pass'],['PASS_KEEP_WRITER','Pass and keep the writer'],['SHELVED','Shelved']]
export default function TriageActions({projectId,materialId,readState='UNREAD',onDone,hasProject=true,refreshOnSave=false}:{projectId?:string;materialId?:string;readState?:string;onDone?:()=>void;hasProject?:boolean;refreshOnSave?:boolean}) {
 const router=useRouter(), id=useId(), lock=useRef(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[stage,setStage]=useState(''),[note,setNote]=useState(''),[precision,setPrecision]=useState('EXACT'),[date,setDate]=useState(''),[approximate,setApproximate]=useState(''),[receipts,setReceipts]=useState<Receipt[]>([]),[now,setNow]=useState(0)
 const pending=useRef<{body:string;requestId:string}|null>(null)
 useEffect(()=>{if(!receipts.length)return; const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[receipts.length])
 function finish(){setStage('');onDone?.();router.refresh()}
 async function save(action:string,extra:Record<string,string>={}) {
  if(lock.current)return
  if(action==='read'&&precision==='APPROXIMATE'&&!approximate.trim()){setError('Enter an approximate read date.');return}
  lock.current=true;setBusy(true);setError('')
  const body=JSON.stringify({projectId,materialId,action,...(action==='read'?{datePrecision:precision,...(date&&precision==='EXACT'?{readDate:date}:{}),...(precision==='APPROXIMATE'?{approximateDate:approximate.trim()}:{} )}:{}),...extra})
  if(pending.current?.body!==body)pending.current={body,requestId:crypto.randomUUID()}
  try {const response=await fetch('/api/triage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...JSON.parse(body),requestId:pending.current.requestId})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save. Please retry.');pending.current=null
   if(action==='undo'){setReceipts([]);setStage('');setNote('');}
   else {if(data.mutationId)setReceipts([{mutationId:data.mutationId,undoUntil:data.undoUntil}]);setNow(Date.now());if(action==='read'||action==='not_reading')setStage(action);else if(action==='note'){setNote('');setStage('saved')}else {if(action==='decision')setNote('');setStage('saved')}}
   if(refreshOnSave)router.refresh()
  }catch(e){setError(e instanceof Error?e.message:'Could not save. Please retry.')}finally{lock.current=false;setBusy(false)}
 }
 const receipt=receipts.at(-1),canUndo=receipt&&new Date(receipt.undoUntil).getTime()>now
 return <div data-triage={projectId||materialId} className="relative z-10 mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2 text-sm" onClick={e=>e.stopPropagation()}>
  <div className="flex flex-wrap items-center gap-2">
   <button type="button" disabled={busy} onClick={()=>save('read')} className="rounded bg-green-50 px-3 py-2 font-medium text-green-800 disabled:opacity-50">{readState==='READ'?'Record read':'Read'}</button>
   <button type="button" disabled={busy} onClick={()=>save('not_reading')} className="rounded bg-slate-100 px-3 py-2">Not reading</button>
   <details className="max-w-full"><summary className="cursor-pointer px-2 py-2">Options</summary><div className="space-y-2 p-2">
    <label htmlFor={id+'date'} className="block">Read date</label><select id={id+'date'} value={precision} onChange={e=>setPrecision(e.target.value)} className="w-full rounded border p-2"><option value="EXACT">Today / exact date</option><option value="APPROXIMATE">Approximate date</option><option value="BEFORE_CRM">Before the CRM</option><option value="UNKNOWN">Date unknown</option></select>
    {precision==='EXACT'&&<input aria-label="Exact read date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="max-w-full rounded border p-2"/>}
    {precision==='APPROXIMATE'&&<input aria-label="Approximate read date" placeholder="e.g. Summer 2025" maxLength={200} value={approximate} onChange={e=>setApproximate(e.target.value)} className="w-full rounded border p-2"/>}
    <label className="block">Not a submission<select aria-label="Material classification" value="" disabled={busy} onChange={e=>{if(e.target.value)void save('classify',{classification:e.target.value})}} className="mt-1 w-full rounded border p-2"><option value="">Choose…</option><option value="NEEDS_REVIEW">Needs classification</option><option value="WRITER_SAMPLE">Writer sample</option><option value="REFERENCE">Reference only</option><option value="OWN_DRAFT">Hawco’s own draft</option><option value="SUBMISSION">True submission</option></select></label>
    {hasProject&&<button type="button" disabled={busy} onClick={()=>setStage('edit')} className="text-blue-700">Add / change decision or note</button>}
   </div></details>
  </div>
  {precision!=='EXACT'&&<p className="text-xs text-slate-500">Read date: {precision==='BEFORE_CRM'?'Before the CRM':precision==='UNKNOWN'?'Unknown':approximate||'Approximate — enter date above'}</p>}
  {stage&&<div className="mt-2 space-y-2 border-t pt-2">
   <p role="status">{stage==='read'?'Marked read. Your call (optional):':stage==='not_reading'?'Closed without a read—not a pass on the work.':stage==='edit'?'Your decision or note (optional):':'Saved.'}</p>
   {hasProject&&(stage==='read'||stage==='edit')&&<div className="flex flex-wrap gap-2">{decisions.map(([value,label])=><button key={value} type="button" disabled={busy} onClick={()=>save('decision',{decision:value,...(note.trim()?{note:note.trim()}:{})})} className="rounded border px-2 py-2">{label}</button>)}</div>}
   {hasProject&&<><label htmlFor={id+'note'} className="block text-xs">Your note (optional)</label><input id={id+'note'} value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} placeholder="Add a short note…" className="w-full rounded border p-2"/>
   </>}
   <div className="flex flex-wrap gap-3">{hasProject&&<button type="button" disabled={busy||!note.trim()} onClick={()=>save('note',{note:note.trim()})} className="text-blue-700 disabled:opacity-40">Save note</button>}<button type="button" disabled={busy} onClick={finish}>Skip / done</button></div>
  </div>}
  {canUndo&&<button type="button" disabled={busy} onClick={()=>save('undo',{undoId:receipt.mutationId})} className="mt-2 text-blue-700 underline">Undo last change</button>}
  {busy&&<p role="status">Saving…</p>}{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}
 </div>
}
