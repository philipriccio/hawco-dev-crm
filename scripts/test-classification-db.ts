import assert from 'node:assert/strict'
import {prisma} from '../src/lib/db'
import {saveClassification} from '../src/lib/classification/service'
import {emptyClassification} from '../src/lib/classification/domain'
const u=new URL(process.env.DATABASE_URL||'postgresql://invalid/')
assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname==='/hawco_sourcing_dev_20261112','Synthetic DB only')
const actor={id:'sourcing-synthetic-owner',name:'Synthetic Owner'}
async function main(){
 const project=await prisma.project.findUniqueOrThrow({where:{id:'sourcing-synthetic-project'}})
 const ip=await prisma.ipProperty.findUniqueOrThrow({where:{id:'sourcing-synthetic-ip'}})
 const lead=await prisma.sourcingLead.findFirstOrThrow()
 const records=[['project',project],['ip',ip],['lead',lead]] as const
 for(const [kind,before] of records){
  const input={...emptyClassification,standardizedFormat:'ONE_HOUR_DRAMA',primaryGenre:'THRILLER',narrativeEngine:'SERIALIZED',descriptorTags:['soapy','sexy'],version:before.updatedAt.toISOString(),...(kind==='project'?{pipelineStage:'NEGOTIATION',packagingNeeds:'Synthetic writer need',targetNetwork:'Synthetic buyer'}:{})}
  await assert.rejects(saveClassification(kind,before.id,{...input,primaryGenre:'INVALID'},actor))
  await assert.rejects(saveClassification(kind,before.id,{...input,readState:'READ'},actor))
  await saveClassification(kind,before.id,input,actor)
  await assert.rejects(saveClassification(kind,before.id,input,actor),{status:409})
  const after=kind==='project'?await prisma.project.findUniqueOrThrow({where:{id:before.id}}):kind==='ip'?await prisma.ipProperty.findUniqueOrThrow({where:{id:before.id}}):await prisma.sourcingLead.findUniqueOrThrow({where:{id:before.id}})
  assert.equal(after.primaryGenre,'THRILLER')
  const omit=(x:object)=>Object.fromEntries(Object.entries(x).filter(([k])=>!['standardizedFormat','narrativeEngine','primaryGenre','secondaryGenre','descriptorTags','pipelineStage','packagingNeeds','targetNetwork','updatedAt','version'].includes(k)))
  assert.deepEqual(omit(after),omit(before),'Unrelated fields unchanged')
  const attempts=await Promise.allSettled([1,2].map(()=>saveClassification(kind,before.id,{...input,version:after.updatedAt.toISOString(),primaryGenre:'COMEDY'},actor)))
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1)
 }
 assert.ok(await prisma.sourcingEvent.count({where:{leadId:lead.id,kind:'CLASSIFICATION',actorId:actor.id}})>=2)
 assert.ok(await prisma.activityLog.count({where:{entityId:project.id,userId:actor.id}})>=2)
 assert.equal(await prisma.material.count(),0);assert.equal(await prisma.coverage.count(),0)
 console.log('Classification DB: 3 entities, real persistence, invalid fields, stale/concurrent writes, audits, unrelated state preservation passed')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect())
