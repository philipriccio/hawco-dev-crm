/** Explicit owner-approved November 11 triage only. Default dry-run; local JSON manifest required. */
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {Prisma,PrismaClient} from '@prisma/client'
import {isDeepStrictEqual} from 'node:util'
const db=new PrismaClient()
const path=process.argv[2],actorId=process.argv[3],apply=process.argv.includes('--apply')
const json=(x:unknown)=>JSON.parse(JSON.stringify(x))
async function main(){
 if(!path||!actorId)throw new Error('Usage: backfill-triage.ts manifest.json existing-human-user-id [--apply]')
 const manifest=JSON.parse(readFileSync(path,'utf8')) as {source:string,items:Array<{id:string,title:string,call:string,expectedUpdatedAt:string}>}
 if(manifest.items.some(x=>x.id==='the-vig'))throw new Error('The Vig remains explicitly excluded')
 const actor=await db.user.findUniqueOrThrow({where:{id:actorId}})
 const result=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(73981112)`
  const receipts=[]
  for(const item of manifest.items){
   const id='triage-backfill-20261111-'+item.id,fingerprint=createHash('sha256').update(JSON.stringify(item)).digest('hex')
   const replay=await tx.triageMutation.findUnique({where:{id}})
   if(replay){if(replay.fingerprint!==fingerprint)throw new Error('Backfill manifest conflicts with previous application: '+item.title);receipts.push({id:item.id,result:'already applied'});continue}
   await tx.$queryRaw`SELECT id FROM "Project" WHERE id=${item.id} FOR UPDATE`
   const p=await tx.project.findUniqueOrThrow({where:{id:item.id},include:{materials:true,contacts:{where:{role:'WRITER'},include:{contact:true}},triageNotes:true}})
   if(p.title!==item.title||p.updatedAt.toISOString()!==item.expectedUpdatedAt)throw new Error('Project changed since reviewed snapshot: '+item.title)
   const writerIds=[...new Set([...p.contacts.map(c=>c.contactId),...p.materials.map(m=>m.writerId).filter((x):x is string=>!!x)])]
   const writers=await tx.contact.findMany({where:{id:{in:writerIds}},orderBy:{id:'asc'}})
   const before=json({project:p,writers})
   const data:Prisma.ProjectUpdateInput={}
   const hasRead=['PASS','PASS_KEEP_WRITER'].includes(item.call)
   if(hasRead){data.readState='READ';data.readDatePrecision=p.firstReadAt?'EXACT':'UNKNOWN';data.status=item.call==='PASS'?'PASSED':'PASS_KEEP_WRITER';data.verdict='PASS'}
   if(item.call==='CONSIDERING')data.status='CONSIDERING'
   if(item.call==='PASS_KEEP_WRITER')data.considerRelationship=true
   if(item.call==='NOT_READING'){
    if(p.firstReadAt||p.readState==='READ'||p.materials.some(m=>m.readAt||m.readState==='READ'))throw new Error('Not-reading conflicts with actual read evidence: '+item.title)
    data.status='NOT_READING';data.readState='NOT_READING';data.verdict=null
   }
   if(item.call==='REFERENCE'){data.status='REFERENCE_ONLY';data.classification='REFERENCE'}
   if(item.call==='HIGH_PRIORITY')data.readPriority=10
   if(item.call==='REWRITE'){data.status='REWRITE_IN_PROGRESS';data.rewriteStatus='Full rewrite agreed; awaiting Gabe and TW response';data.nextAction='Await Gabe and TW’s response on the agreed full rewrite. Meeting was months ago; date and deadline not specified.'}
   if(!Object.keys(data).length)throw new Error('Unknown call: '+item.call)
   if(!apply){receipts.push({id:item.id,title:p.title,call:item.call,changes:json(data),materialReadDatesPreserved:true});continue}
   await tx.project.update({where:{id:item.id},data})
   if(item.call==='NOT_READING')await tx.material.updateMany({where:{projectId:item.id,readAt:null},data:{readState:'NOT_READING'}})
   if(item.call==='REFERENCE')await tx.material.updateMany({where:{projectId:item.id},data:{classification:'REFERENCE'}})
   if(item.call==='PASS_KEEP_WRITER')await tx.contact.updateMany({where:{id:{in:writerIds},OR:[{writerTier:null},{writerTier:'NEED_TO_CHANGE_MY_MIND'},{writerTier:'CONSIDER_WORKING_WITH'}]},data:{writerTier:'WANT_TO_WORK_WITH'}})
   const body=item.call==='REWRITE'?'Chutes needs a full rewrite. I met with Gabe and TW months ago and they agreed to do it, just waiting to hear back from them.':`November 11 triage: ${item.call.replaceAll('_',' ')}.${hasRead?' Previously read; no new read date or coverage asserted.':''}`
   await tx.triageNote.create({data:{projectId:item.id,body,authorName:actor.name,actorId:actor.id,source:manifest.source}})
   const after=json({project:await tx.project.findUniqueOrThrow({where:{id:item.id},include:{materials:true,contacts:{where:{role:'WRITER'},include:{contact:true}},triageNotes:true}}),writers:await tx.contact.findMany({where:{id:{in:writerIds}},orderBy:{id:'asc'}})})
   if(isDeepStrictEqual(before,after))throw new Error('No changes saved')
   await tx.triageMutation.create({data:{id,actorId:actor.id,fingerprint,projectId:item.id,before,after,undoUntil:new Date(0)}})
   await tx.activityLog.create({data:{userId:actor.id,action:'updated',entityType:'project',entityId:item.id,entityName:p.title,changes:json({source:manifest.source,before,after})}})
   receipts.push({id:item.id,result:'applied',call:item.call})
  }
  return receipts
 },{timeout:60000})
 console.log(JSON.stringify({applied:apply,receipts:result},null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
