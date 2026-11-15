import { NextRequest,NextResponse } from 'next/server'
import { requireApiAuth,isAuthResponse } from '@/lib/api-auth'
import { importPreview,applyImport,networkingOverview,addMeetingNote,recordEmail,linkMeetingProject } from '@/lib/networking'
import { fingerprint } from '@/lib/networking-domain'
import { prisma } from '@/lib/db'
export async function GET() {
 const actor=await requireApiAuth();if(isAuthResponse(actor))return actor
 try{return NextResponse.json(await networkingOverview(actor))}catch{return NextResponse.json({error:'Unable to load relationship preparation.'},{status:500})}
}
export async function POST(request:NextRequest) {
 const actor=await requireApiAuth();if(isAuthResponse(actor))return actor
 try{
  const body=await request.json()
  if(body.action==='link-project')return NextResponse.json(await linkMeetingProject(actor,body))
  if(body.action==='email')return NextResponse.json(await recordEmail(actor,body))
  if(body.action==='note')return NextResponse.json(await addMeetingNote(actor,body))
  if(body.action==='preferences') {
   if(!Number.isInteger(body.buyerDays)||body.buyerDays<14||body.buyerDays>365||!Number.isInteger(body.priorityDays)||body.priorityDays<14||body.priorityDays>365||body.alertsEnabled===true)throw new Error('Choose 14–365 days. Notifications are not enabled in this review.')
   const result=await prisma.$transaction(async tx=>{
    const old=await tx.networkingPreferences.findUnique({where:{userId:actor.id}})
    if((old?.version??0)!==body.version)throw new Error('Preferences changed. Reload first.')
    const data={buyerDays:body.buyerDays,priorityDays:body.priorityDays,version:(old?.version??0)+1}
    return old ? tx.networkingPreferences.update({where:{userId:actor.id,version:old.version},data}) : tx.networkingPreferences.create({data:{userId:actor.id,...data}})
   });return NextResponse.json(result)
  }
  if(!['calendar','notes'].includes(body.kind))throw new Error('Choose calendar or contact notes.')
  if(body.action==='preview'){const rows=await importPreview(actor,body.kind);return NextResponse.json({rows,fingerprint:fingerprint(rows)})}
  if(body.action==='apply')return NextResponse.json(await applyImport(actor,body.kind,String(body.fingerprint)))
  throw new Error('Unknown action')
 }catch(error){return NextResponse.json({error:error instanceof Error && !error.name.startsWith('Prisma')?error.message:'Unable to save; reload and retry.'},{status:409})}
}
