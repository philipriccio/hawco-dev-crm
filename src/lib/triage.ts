import {isDeepStrictEqual} from 'node:util'
import {createHash} from 'node:crypto'
import {Prisma, PrismaClient, ProjectStatus} from '@prisma/client'

export class TriageError extends Error { constructor(message:string,public status=400){super(message)} }
export const classifications=['SUBMISSION','WRITER_SAMPLE','REFERENCE','OWN_DRAFT','NEEDS_REVIEW'] as const
export const readableTypes=['PILOT_SCRIPT','FEATURE_SCRIPT','PITCH_DECK','ONE_PAGER','TREATMENT','SERIES_BIBLE']
const decisions:Record<string,ProjectStatus>={PURSUE:'EARLY_DEVELOPMENT',CONSIDERING:'CONSIDERING',PASS:'PASSED',PASS_KEEP_WRITER:'PASS_KEEP_WRITER',SHELVED:'SHELVED'}
const projectFields=['status','verdict','classification','readState','readDatePrecision','readDateLabel','firstReadAt','considerRelationship','updatedAt']
const materialFields=['classification','readState','readDatePrecision','readDateLabel','readAt','updatedAt']
const json=(x:unknown)=>JSON.parse(JSON.stringify(x))
const pick=(x:Record<string,unknown>,keys:string[])=>Object.fromEntries(['id',...keys].map(k=>[k,x[k]]))
type Snapshot={project:Record<string,unknown>|null,materials:Record<string,unknown>[],writers:Record<string,unknown>[],notes:Record<string,unknown>[]}
export type TriageActor={id:string,name:string,source?:string}

export function validateTriage(body:Record<string,unknown>){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new TriageError('Invalid request')
 if(typeof body.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.requestId))throw new TriageError('A stable request ID is required')
 if(!['read','not_reading','classify','decision','note','undo'].includes(String(body.action)))throw new TriageError('Invalid action')
 for(const key of ['projectId','materialId','undoId'])if(body[key]!==undefined&&(typeof body[key]!=='string'||!(body[key] as string).length||(body[key] as string).length>120))throw new TriageError('Invalid target')
 if(body.action==='undo'){if(!body.undoId)throw new TriageError('Undo ID is required')}
 else if(!body.projectId&&!body.materialId)throw new TriageError('Project or material is required')
 if(body.decision!==undefined&&!['read','decision'].includes(String(body.action)))throw new TriageError('A decision must be a reading decision action')
 if(body.classification!==undefined&&body.action!=='classify')throw new TriageError('Use the classification action')
 if(body.decision!==undefined&&!decisions[String(body.decision)])throw new TriageError('Invalid decision')
 if(body.action==='decision'&&!body.decision)throw new TriageError('Decision is required')
 if(body.classification!==undefined&&!classifications.includes(body.classification as typeof classifications[number]))throw new TriageError('Invalid classification')
 if(body.action==='classify'&&!body.classification)throw new TriageError('Classification is required')
 if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>1000))throw new TriageError('Use a note of 1,000 characters or fewer')
 if(body.action==='note'&&!String(body.note||'').trim())throw new TriageError('Note is required')
 const precision=String(body.datePrecision||'EXACT')
 if(!['EXACT','APPROXIMATE','BEFORE_CRM','UNKNOWN'].includes(precision))throw new TriageError('Invalid date precision')
 if(precision==='APPROXIMATE'&&(typeof body.approximateDate!=='string'||!body.approximateDate.trim()||body.approximateDate.length>100))throw new TriageError('Describe the approximate read date')
 if(body.readDate!==undefined&&(typeof body.readDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.readDate)||isNaN(Date.parse(body.readDate))||new Date(body.readDate).toISOString().slice(0,10)!==body.readDate||Date.parse(body.readDate)>Date.now()))throw new TriageError('Use a valid past or current read date')
 return {...body,requestId:body.requestId as string,precision}
}

export async function applyTriage(db:PrismaClient,body:Record<string,unknown>,actor:TriageActor){
 const input=validateTriage(body),fingerprint=createHash('sha256').update(JSON.stringify(json(input))).digest('hex')
 return db.$transaction(async tx=>{
  // Serialize all small triage mutations: avoids overlapping project/material/writer undo races.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(73981112)`
  const replay=await tx.triageMutation.findUnique({where:{id:input.requestId}})
  if(replay){if(replay.actorId!==actor.id||replay.fingerprint!==fingerprint)throw new TriageError('Request ID already used',409);return {mutationId:replay.id,undoUntil:replay.undoUntil,projectId:replay.projectId,materialId:replay.materialId}}
  const target=body.action==='undo'?await tx.triageMutation.findUnique({where:{id:String(body.undoId)}}):null
  if(body.action==='undo'&&(!target||target.actorId!==actor.id||target.undoneAt||target.undoUntil<new Date()))throw new TriageError('Undo is no longer available',409)
  const materialId=target?.materialId||String(body.materialId||'')||null
  const targetMaterial=materialId?await tx.material.findUnique({where:{id:materialId}}):null
  if(materialId&&!targetMaterial)throw new TriageError('Material not found',404)
  const projectId=target?.projectId||String(body.projectId||'')||targetMaterial?.projectId||null
  if(body.projectId&&targetMaterial&&targetMaterial.projectId!==body.projectId)throw new TriageError('Material does not belong to this project',409)
  const project=projectId?await tx.project.findUnique({where:{id:projectId},include:{contacts:{where:{role:'WRITER'}}}}):null
  if(projectId&&!project)throw new TriageError('Project not found',404)
  if(!project&&['decision','note'].includes(String(body.action)))throw new TriageError('Link this material to a project before adding a decision or project note')
  const materialIds=target?((target.after as unknown as Snapshot).materials.map(m=>String(m.id))):materialId?[materialId]:(await tx.material.findMany({where:{projectId:projectId!,type:{in:readableTypes as never[]}},select:{id:true}})).map(m=>m.id)
  const writerIds=target?((target.after as unknown as Snapshot).writers.map(w=>String(w.id))):[...new Set([...(project?.contacts.map(c=>c.contactId)||[]),...(await tx.material.findMany({where:{id:{in:materialIds}},select:{writerId:true}})).map(m=>m.writerId).filter((x):x is string=>!!x)])]
  // Lock the actual business rows too: older edit endpoints do not take the triage advisory lock.
  if(projectId)await tx.$queryRaw`SELECT id FROM "Project" WHERE id=${projectId} FOR UPDATE`
  if(materialIds.length)await tx.$queryRaw(Prisma.sql`SELECT id FROM "Material" WHERE id IN (${Prisma.join(materialIds)}) ORDER BY id FOR UPDATE`)
  if(writerIds.length)await tx.$queryRaw(Prisma.sql`SELECT id FROM "Contact" WHERE id IN (${Prisma.join(writerIds)}) ORDER BY id FOR UPDATE`)
  const snapshot=async():Promise<Snapshot>=>json({project:projectId?pick((await tx.project.findUniqueOrThrow({where:{id:projectId}})) as unknown as Record<string,unknown>,projectFields):null,materials:(await tx.material.findMany({where:{id:{in:materialIds}},orderBy:{id:'asc'}})).map(m=>pick(m as unknown as Record<string,unknown>,materialFields)),writers:(await tx.contact.findMany({where:{id:{in:writerIds}},orderBy:{id:'asc'}})).map(w=>pick(w as unknown as Record<string,unknown>,['writerTier','updatedAt'])),notes:projectId?await tx.triageNote.findMany({where:{projectId},orderBy:{id:'asc'}}):[]})
  const before=await snapshot()
  if(target){
   if(!isDeepStrictEqual(before,target.after))throw new TriageError('This record changed after your action. Undo would overwrite newer work.',409)
   const prior=target.before as unknown as Snapshot
   const restore=(x:Record<string,unknown>)=>{const data={...x};delete data.id;delete data.updatedAt;for(const key of ['firstReadAt','readAt'])if(typeof data[key]==='string')data[key]=new Date(data[key] as string);return data}
   if(prior.project)await tx.project.update({where:{id:projectId!},data:restore(prior.project)})
   for(const m of prior.materials)await tx.material.update({where:{id:String(m.id)},data:restore(m)})
   for(const w of prior.writers)await tx.contact.update({where:{id:String(w.id)},data:restore(w)})
   await tx.triageNote.deleteMany({where:{id:{in:before.notes.filter(n=>!prior.notes.some(p=>p.id===n.id)).map(n=>String(n.id))}}})
   await tx.triageMutation.update({where:{id:target.id},data:{undoneAt:new Date()}})
  }else{
   const pd:Prisma.ProjectUpdateInput={},md:Prisma.MaterialUpdateManyMutationInput={}
   if(body.action==='read'){
    const at=input.precision==='EXACT'?(body.readDate?new Date(String(body.readDate)):new Date()):null
    const label=input.precision==='APPROXIMATE'?String(body.approximateDate).trim():null
    Object.assign(md,{readState:'READ',readDatePrecision:input.precision,readDateLabel:label,readAt:at})
    // Preserve an already-known first read; current material reads remain independent.
    Object.assign(pd,{readState:'READ',...(!project?.firstReadAt?{firstReadAt:at,readDatePrecision:input.precision,readDateLabel:label}:{})})
    if(project&&['SUBMITTED','READING','NOT_READING'].includes(project.status))pd.status='READ'
   }
   if(body.action==='not_reading'){
    if((targetMaterial?.readAt||targetMaterial?.readState==='READ')||(!materialId&&(project?.firstReadAt||project?.readState==='READ'||before.materials.some(m=>m.readAt||m.readState==='READ'))))throw new TriageError('Already recorded as read; use Undo for a mistaken recent read, not Not reading',409)
    Object.assign(md,{readState:'NOT_READING'});
    // Project-level close is only asserted for project actions, not one unread draft.
    if(!body.materialId)Object.assign(pd,{readState:'NOT_READING',status:'NOT_READING',verdict:null})
   }
   if(body.action==='classify'){
    md.classification=String(body.classification)
    if(!body.materialId){pd.classification=String(body.classification);if(body.classification!=='SUBMISSION')pd.status='REFERENCE_ONLY';else if(project?.status==='REFERENCE_ONLY')pd.status='SUBMITTED'}
   }
   if(body.decision){
    pd.status=decisions[String(body.decision)];pd.verdict=body.decision==='PASS'||body.decision==='PASS_KEEP_WRITER'?'PASS':body.decision==='CONSIDERING'?'CONSIDER':body.decision==='PURSUE'?'DEVELOP':null
    if(body.decision==='PASS_KEEP_WRITER'){
     pd.considerRelationship=true
     await tx.contact.updateMany({where:{id:{in:writerIds},OR:[{writerTier:null},{writerTier:'NEED_TO_CHANGE_MY_MIND'},{writerTier:'CONSIDER_WORKING_WITH'}]},data:{writerTier:'WANT_TO_WORK_WITH'}})
    }
   }
   if(projectId&&Object.keys(pd).length)await tx.project.update({where:{id:projectId},data:pd})
   if(Object.keys(md).length){
    if(body.action==='read'&&(input.precision!=='EXACT'||!body.materialId)){
     await tx.material.updateMany({where:{id:{in:materialIds},readAt:null},data:md})
     await tx.material.updateMany({where:{id:{in:materialIds},readAt:{not:null}},data:{readState:'READ',readDatePrecision:'EXACT',readDateLabel:null}})
    }else await tx.material.updateMany({where:{id:{in:materialIds}},data:md})
   }
   if(typeof body.note==='string'&&body.note.trim()&&projectId)await tx.triageNote.create({data:{projectId,body:body.note.trim(),authorName:actor.name,actorId:actor.id,source:actor.source||'User entry'}})
  }
  const after=await snapshot(),undoUntil=new Date(Date.now()+(target?0:30000))
  await tx.triageMutation.create({data:{id:input.requestId,actorId:actor.id,fingerprint,projectId,materialId,before:json(before),after:json(after),undoUntil}})
  await tx.activityLog.create({data:{userId:actor.id,action:'updated',entityType:projectId?'project':'material',entityId:projectId||materialId!,entityName:project?.title||targetMaterial?.title||'Triage',changes:json({triage:body.action,source:actor.source||'User entry',before,after})}})
  return {mutationId:input.requestId,undoUntil,projectId,materialId}
 },{timeout:15000})
}
