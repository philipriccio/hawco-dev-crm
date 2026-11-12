import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {PrismaClient} from '@prisma/client'
import {applyTriage} from '../src/lib/triage'
import {unreadQueueWhere} from '../src/lib/reading-source'
const db=new PrismaClient({datasources:{db:{url:'postgresql://hawco_triage_qa@localhost:5432/hawco_triage_20261111'}}})
let checks=0
const ok=(x:unknown)=>{assert.ok(x);checks++}
async function main(){
 const user=await db.user.upsert({where:{id:'triage-philip'},create:{id:'triage-philip',name:'Philip QA',email:'triage@example.invalid',password:'not-a-password',role:'ADMIN'},update:{}})
 const actor={id:user.id,name:user.name}
 await db.triageMutation.deleteMany();await db.triageNote.deleteMany();await db.material.deleteMany();await db.projectContact.deleteMany();await db.project.deleteMany();await db.contact.deleteMany()
 const writer=await db.contact.create({data:{name:'Writer Strong',type:'WRITER',writerTier:'WANT_TO_WORK_WITH'}})
 const weak=await db.contact.create({data:{name:'Writer Prospect',type:'WRITER',writerTier:'NEED_TO_CHANGE_MY_MIND'}})
 const project=await db.project.create({data:{title:'Triage project',classification:'SUBMISSION',contacts:{create:[{contactId:writer.id,role:'WRITER'},{contactId:weak.id,role:'WRITER'}]}}})
 const material=await db.material.create({data:{title:'Pilot',type:'PILOT_SCRIPT',filename:'pilot.pdf',fileUrl:'https://example.invalid/pilot.pdf',classification:'SUBMISSION',projectId:project.id}})
 const run=(b:Record<string,unknown>)=>applyTriage(db,{requestId:randomUUID(),projectId:project.id,...b},actor)
 ok(await db.material.count({where:unreadQueueWhere()})===1)
 const id=randomUUID(),read=await run({requestId:id,action:'read',datePrecision:'BEFORE_CRM',note:'Read before we had the CRM.'})
 ok((await db.project.findUniqueOrThrow({where:{id:project.id}})).firstReadAt===null)
 ok((await db.material.findUniqueOrThrow({where:{id:material.id}})).readState==='READ')
 ok(await db.material.count({where:unreadQueueWhere()})===0)
 ok((await run({requestId:id,action:'read',datePrecision:'BEFORE_CRM',note:'Read before we had the CRM.'})).mutationId===id)
 await assert.rejects(run({requestId:id,action:'not_reading'}),/already used/);checks++
 await run({action:'undo',undoId:read.mutationId});ok(await db.material.count({where:unreadQueueWhere()})===1)
 ok(await db.triageNote.count()===0)
 const closed=await run({action:'not_reading'});let p=await db.project.findUniqueOrThrow({where:{id:project.id}})
 ok(p.status==='NOT_READING'&&p.verdict===null&&p.firstReadAt===null)
 await run({action:'undo',undoId:closed.mutationId})
 await run({action:'read',datePrecision:'APPROXIMATE',approximateDate:'Summer 2025'})
 p=await db.project.findUniqueOrThrow({where:{id:project.id}});ok(p.firstReadAt===null&&p.readDateLabel==='Summer 2025')
 await assert.rejects(run({action:'not_reading'}),/Already recorded/);checks++
 const keep=await run({action:'decision',decision:'PASS_KEEP_WRITER',note:'Good voice; wrong project for us.'})
 ok((await db.contact.findUniqueOrThrow({where:{id:writer.id}})).writerTier==='WANT_TO_WORK_WITH')
 ok((await db.contact.findUniqueOrThrow({where:{id:weak.id}})).writerTier==='WANT_TO_WORK_WITH')
 ok((await db.project.findUniqueOrThrow({where:{id:project.id}})).status==='PASS_KEEP_WRITER')
 await db.project.update({where:{id:project.id},data:{nextAction:'Another editor saved this'}})
 await assert.rejects(run({action:'undo',undoId:keep.mutationId}),/newer work/);checks++
 const ref=await run({action:'classify',classification:'REFERENCE'});ok(await db.material.count({where:unreadQueueWhere()})===0)
 await run({action:'undo',undoId:ref.mutationId})
 const concurrentId=randomUUID();const concurrent=await Promise.all([run({requestId:concurrentId,action:'note',note:'Once only'}),run({requestId:concurrentId,action:'note',note:'Once only'})]);ok(concurrent[0].mutationId===concurrent[1].mutationId);ok(await db.triageNote.count({where:{body:'Once only'}})===1)
 const before=await db.project.findUniqueOrThrow({where:{id:project.id}})
 await assert.rejects(applyTriage(db,{requestId:randomUUID(),projectId:project.id,action:'decision',decision:'PURSUE'},{id:'nonexistent',name:'Nobody'}));checks++
 ok((await db.project.findUniqueOrThrow({where:{id:project.id}})).status===before.status)
 const stableDate=new Date('2024-02-04T00:00:00Z');await db.project.update({where:{id:project.id},data:{firstReadAt:stableDate}})
 await run({action:'read',datePrecision:'UNKNOWN'});ok((await db.project.findUniqueOrThrow({where:{id:project.id}})).firstReadAt?.toISOString()===stableDate.toISOString())
 const old=await run({action:'note',note:'Expire undo'});await db.triageMutation.update({where:{id:old.mutationId},data:{undoUntil:new Date(0)}});await assert.rejects(run({action:'undo',undoId:old.mutationId}),/no longer/);checks++
 await assert.rejects(run({action:'read',readDate:'2025-02-31'}),/valid past/);checks++
 await assert.rejects(applyTriage(db,{requestId:randomUUID(),projectId:project.id,action:'undo',undoId:concurrentId},{id:'other',name:'Other'}),/no longer/);checks++
 // Clean synthetic UI set: all six queues and three writer history outcomes.
 for(const type of ['PILOT_SCRIPT','FEATURE_SCRIPT','PITCH_DECK'] as const)for(const unsolicited of [false,true]){
  const p=await db.project.create({data:{title:`${unsolicited?'Website':'Main'} ${type}`,classification:'SUBMISSION',websiteUnsolicited:unsolicited,contacts:{create:{contactId:writer.id,role:'WRITER'}}}})
  await db.material.create({data:{projectId:p.id,title:p.title,type,filename:'fixture.pdf',fileUrl:'https://example.invalid/fixture.pdf',classification:'SUBMISSION'}})
 }
 ok(await db.material.count({where:unreadQueueWhere()})===6)
 const held=await db.material.create({data:{title:'Unclassified intake',type:'PILOT_SCRIPT',filename:'fixture.pdf',fileUrl:'https://example.invalid/file.pdf'}});ok(held.classification==='NEEDS_REVIEW');ok(await db.material.count({where:unreadQueueWhere()})===6)
 console.log(`PASS ${checks} restricted-role triage assertions`)
 console.log(JSON.stringify({userId:user.id,projectId:project.id,writerId:writer.id}))
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect())
