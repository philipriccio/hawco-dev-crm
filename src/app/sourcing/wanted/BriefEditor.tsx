'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonClass, inputClass, panelClass } from '../styles'
export default function BriefEditor({body,version,status,canApprove}:{body:string;version:number;status:string;canApprove:boolean}) {
 const router = useRouter(),[value,setValue] = useState(body),[busy,setBusy] = useState(false),[error,setError] = useState(''),[ack,setAck] = useState(false)
 async function save(action:string) {
  if(busy) return; setBusy(true);setError('')
  try {const r = await fetch('/api/sourcing/brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,body:value,action})});const data = await r.json();if(!r.ok) throw Error(data.error||'Save failed');router.refresh()} catch(e) {setError(e instanceof Error?e.message:'Save not confirmed')} finally {setBusy(false)}
 }
 return <section className={panelClass}><h2 className="text-xl font-semibold">Sourcing brief</h2><p>Revision {version || 'not saved'} · {status}. Editing an approved version creates a new draft. Only Philip can approve the saved brief; approval is attributed to his signed-in account.</p>{error&&<p role="alert" className="text-red-800">{error} <button className="underline" onClick={()=>window.location.reload()}>Reload latest brief</button> (discards edits)</p>}<label className="block">Wanted list, evidence and priorities<textarea rows={18} maxLength={30000} className={`${inputClass} mt-2`} value={value} onChange={e=>{setValue(e.target.value);setAck(false)}} disabled={busy}/></label><div className="flex flex-wrap items-center gap-3"><button className={buttonClass} disabled={busy||!value.trim()} onClick={()=>save('draft')}>Save new draft</button>{canApprove&&version>0&&status==='DRAFT'&&<><label className="text-sm"><input type="checkbox" checked={ack} disabled={busy||value!==body} onChange={e=>setAck(e.target.checked)}/> I reviewed this saved brief and approve its use.</label><button className={buttonClass} disabled={busy||!ack||value!==body} onClick={()=>save('approve')}>Approve saved brief</button></>}</div>{!canApprove&&<p className="text-sm">You can save drafts. Approval requires Philip’s designated account.</p>}</section>
}
