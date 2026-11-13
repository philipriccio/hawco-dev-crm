import { classificationSelect } from '../classification/domain'
import { canApproveSourcingBrief } from './approval'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { DEVELOPMENT_SLATE_STATUSES } from '../development-slate'
import { choice, decisions, factualEvents, leadInput, object, SourcingError, text, url, date, version } from './domain'
type Actor = { id: string; name: string }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
export async function createLead(actor: Actor, input: unknown) {
 const data = leadInput(input)
 return prisma.$transaction(async tx => {
  const lead = await tx.sourcingLead.create({data})
  await tx.sourcingEvent.create({data: {leadId: lead.id, kind:'CREATED', actorId:actor.id, actorName:actor.name, note:'Research lead created; no project or reading entry created.', after:json(lead)}})
  return lead
 }, {isolationLevel:'Serializable'})
}
export async function changeLead(actor: Actor, id: string, input: unknown) {
 const b = object(input), expected = version(b.version)
 if (Object.keys(b).some(k => !['version','action','value'].includes(k))) throw new SourcingError('Unsupported action field')
 const action = choice(b.action,['edit','decision','event'],'action')
 return prisma.$transaction(async tx => {
  const before = await tx.sourcingLead.findUnique({where:{id}})
  if (!before) throw new SourcingError('Lead not found',404)
  if (before.version !== expected) throw new SourcingError('This lead changed. Reload and reconcile before saving.',409)
  let update: Prisma.SourcingLeadUncheckedUpdateManyInput = {}, note = '', sourceUrl = '', occurredOn = '', kind = ''
  if (action === 'edit') { update = leadInput(b.value); kind = 'EDITED'; note = 'Research fields updated' }
  if (action === 'decision') {
   const v = object(b.value)
   if (Object.keys(v).some(k => !['decision','reason'].includes(k))) throw new SourcingError('Unsupported decision field')
   const decision = choice(v.decision,decisions,'decision'), reason = text(v.reason ?? '','decision reason')
   if (['PASSED','NOT_NOW'].includes(decision) && !reason) throw new SourcingError('Please record why this is passed or not now')
   update = {decision,decisionReason:reason}; kind = 'DECISION'; note = reason || `Decision recorded: ${decision}`
  }
  if (action === 'event') {
   const v = object(b.value)
   if (Object.keys(v).some(k => !['kind','note','sourceUrl','occurredOn'].includes(k))) throw new SourcingError('Unsupported event field')
   kind = choice(v.kind,factualEvents,'event type'); note = text(v.note,'event note',8000,true)
   sourceUrl = url(v.sourceUrl,kind !== 'NOTE'); occurredOn = date(v.occurredOn,'event date',true)
  }
  const result = await tx.sourcingLead.updateMany({where:{id,version:expected},data:{...update,version:{increment:1}}})
  if (result.count !== 1) throw new SourcingError('Concurrent change. Reload and reconcile.',409)
  const after = await tx.sourcingLead.findUniqueOrThrow({where:{id}})
  await tx.sourcingEvent.create({data:{leadId:id,kind,actorId:actor.id,actorName:actor.name,note,sourceUrl,occurredOn,before:json(before),after:json(after)}})
  return after
 }, {isolationLevel:'Serializable'})
}
export async function saveBrief(actor: Actor, input: unknown) {
 const b = object(input), expected = version(b.version)
 if (Object.keys(b).some(k => !['version','body','action'].includes(k))) throw new SourcingError('Unsupported brief field')
 const body = text(b.body,'brief',30000,true), action = choice(b.action,['draft','approve'],'brief action')
 if (action === 'approve' && !canApproveSourcingBrief(actor)) throw new SourcingError('Only Philip can approve the sourcing brief',403)
 return prisma.$transaction(async tx => {
  const latest = await tx.sourcingBrief.findFirst({orderBy:{version:'desc'}})
  if ((latest?.version ?? 0) !== expected) throw new SourcingError('Brief changed. Reload and reconcile before saving.',409)
  // Approval is an explicit authenticated UI action of the exact saved draft, never inferred.
  if (action === 'approve' && (!latest || latest.status !== 'DRAFT' || latest.body !== body)) throw new SourcingError('Save and review this exact draft before approving')
  return tx.sourcingBrief.create({data:{version:expected+1,body,status:action === 'approve' ? 'APPROVED' : 'DRAFT',actorId:actor.id,actorName:actor.name}})
 },{isolationLevel:'Serializable'})
}
export async function getSlate() {
 return prisma.project.findMany({where:{status:{in:DEVELOPMENT_SLATE_STATUSES}},orderBy:{title:'asc'},select:{...classificationSelect,pipelineStage:true,id:true,title:true,genre:true,format:true,status:true,currentStage:true,origin:true,packagingNeeds:true,nextAction:true,targetNetwork:true,ipProperties:{select:{id:true,title:true}},buyers:{select:{contact:{select:{id:true,name:true}}}},contacts:{where:{role:'WRITER'},select:{contact:{select:{id:true,name:true}}}}}})
}
