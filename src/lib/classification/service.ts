import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { classificationFields, classificationSelect, ClassificationError, enumValue, parseClassification, stages } from './domain'
export type ClassificationKind = 'project'|'lead'|'ip'
export async function saveClassification(kind:string,id:string,input:unknown,actor:{id:string;name:string}) {
 if(!['project','lead','ip'].includes(kind)) throw new ClassificationError('Unknown record type',404)
 if(!input||typeof input!=='object'||Array.isArray(input)) throw new ClassificationError('Invalid fields')
 const v=input as Record<string,unknown>
 const allowed:string[]=[...classificationFields,'version',...(kind==='project'?['pipelineStage','packagingNeeds','targetNetwork']:[])]
 if(Object.keys(v).some(k=>!allowed.includes(k))||typeof v.version!=='string'||!Number.isFinite(Date.parse(v.version))) throw new ClassificationError('Invalid fields or version')
 const data=parseClassification(v)
 const optionalText=(key:string)=>{const x=v[key];if(x!==null&&(typeof x!=='string'||x.length>20000))throw new ClassificationError(`Invalid ${key}`);return typeof x==='string'?x.trim()||null:null}
 const projectData=kind==='project'?{pipelineStage:enumValue(v.pipelineStage,stages,'pipeline stage'),packagingNeeds:optionalText('packagingNeeds'),targetNetwork:optionalText('targetNetwork')}:{}
 const where={id,updatedAt:new Date(v.version)}
 return prisma.$transaction(async tx=>{
  const select={id:true,title:true,updatedAt:true,...classificationSelect} as const
  const before=kind==='project'?await tx.project.findUnique({where:{id},select:{...select,pipelineStage:true,packagingNeeds:true,targetNetwork:true}}):kind==='lead'?await tx.sourcingLead.findUnique({where:{id},select}):await tx.ipProperty.findUnique({where:{id},select})
  if(!before)throw new ClassificationError('Record not found',404)
  if(before.updatedAt.toISOString()!==v.version)throw new ClassificationError('Record changed. Reload before saving.',409)
  const result=kind==='project'?await tx.project.updateMany({where,data:{...data,...projectData}}):kind==='lead'?await tx.sourcingLead.updateMany({where,data:{...data,version:{increment:1}}}):await tx.ipProperty.updateMany({where,data})
  if(result.count!==1)throw new ClassificationError('Concurrent change. Reload before saving.',409)
  const after={...data,...projectData}
  const json=(x:unknown)=>JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue
  if(kind==='lead')await tx.sourcingEvent.create({data:{leadId:id,kind:'CLASSIFICATION',actorId:actor.id,actorName:actor.name,note:'Classification updated; decision and reading history unchanged.',before:json(before),after:json(after)}})
  else await tx.activityLog.create({data:{userId:actor.id,action:'updated',entityType:kind==='ip'?'ipProperty':'project',entityId:id,entityName:before.title,changes:{classification:{from:json(before),to:json(after)}}}})
  return {saved:true}
 },{isolationLevel:'Serializable'})
}
