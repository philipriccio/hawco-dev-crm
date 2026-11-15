import { Prisma } from '@prisma/client'
import { prisma } from './db'
import { assertHawcoSource, contactMatch, datedMeetingNotes, fingerprint, quietState } from './networking-domain'
import { HAWCO_MAILBOX } from './email-replies'
type Actor = {id:string;name:string}
export async function importPreview(actor: Actor, kind: 'calendar'|'notes', db: Prisma.TransactionClient = prisma) {
  const contacts = await db.contact.findMany({select:{id:true,name:true,email:true,notes:true}})
  if (kind === 'notes') return contacts.flatMap(c => datedMeetingNotes(c.notes).map(n => ({
    sourceKey:`contact-note:${c.id}:${fingerprint(n.original)}`, sourceFingerprint:fingerprint(n.original),
    title:`${c.name} — ${n.title}`, date:n.date, datePrecision:n.datePrecision, occurrence:n.occurrence,
    location:null as string|null, contactIds:[c.id], provenance:{kind:'CONTACT_NOTE',contactId:c.id,original:n.original,line:n.index+1},
  }))).filter((row,index,rows)=>rows.findIndex(x=>x.sourceKey===row.sourceKey)===index)
  const connection = await db.googleCalendarConnection.findUnique({where:{userId:actor.id}})
  if (!connection) throw new Error('Connect and confirm the Hawco calendar first.')
  assertHawcoSource(actor.id,connection.calendarId)
  const events = await db.googleCalendarEvent.findMany({where:{connectionId:connection.id},orderBy:{startAt:'asc'}})
  // Old cache rows without exact provenance cannot be promoted to business records.
  return events.filter(e=>e.sourceCalendarId===connection.calendarId).map(e=>({
    sourceKey:`calendar:${connection.calendarId}:${e.googleEventId}`,
    sourceFingerprint:fingerprint({id:e.googleEventId,title:e.title,start:e.startAt,status:e.status,attendees:e.attendeesJson,location:e.location,raw:e.rawJson}),
    title:e.title,date:e.startAt,datePrecision: (e.rawJson as {start?:{date?:string}})?.start?.date ? 'DAY':'TIME',
    occurrence:e.status==='cancelled'?'CANCELLED':'PLANNED',location:e.location,
    contactIds:[...new Set((Array.isArray(e.attendeesJson)?e.attendeesJson:[]).filter((v):v is string=>typeof v==='string').flatMap(v=>contactMatch(v,contacts) || []))],
    provenance:{kind:'HAWCO_CALENDAR',calendarId:connection.calendarId,eventId:e.googleEventId,sourceUrl:e.htmlLink},
  }))
}
export async function applyImport(actor:Actor,kind:'calendar'|'notes', expected:string) {
  const rows = await importPreview(actor,kind)
  if (fingerprint(rows)!==expected) throw new Error('Sources changed. Preview again before importing.')
  return prisma.$transaction(async tx=>{
    // Serialize importers, including simultaneous retries, without deleting existing records or links.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(74115901)`
    // Freeze source rows for the review/apply check; concurrent edits must wait.
    await tx.$queryRaw`SELECT id FROM "Contact" FOR SHARE`
    if(kind==='calendar') {await tx.$queryRaw`SELECT id FROM "GoogleCalendarEvent" FOR SHARE`;await tx.$queryRaw`SELECT id FROM "GoogleCalendarConnection" WHERE "userId"=${actor.id} FOR SHARE`}
    if (fingerprint(await importPreview(actor,kind,tx)) !== expected) throw new Error('Sources changed. Preview again.')
    const fresh = kind==='notes' ? await tx.contact.findMany({select:{id:true,notes:true}}) : null
    let changed=0
    for (const row of rows) {
      if(fresh && !fresh.find(c=>c.id===row.contactIds[0])?.notes?.split(/\r?\n/).includes((row.provenance as {original:string}).original)) throw new Error('Source notes changed. Preview again.')
      const old = await tx.meeting.findUnique({where:{sourceKey:row.sourceKey}})
      if(old?.sourceFingerprint===row.sourceFingerprint) continue
      if(!old && row.contactIds.length) {
        const day=new Date(row.date);day.setUTCHours(0,0,0,0)
        const next=new Date(day.getTime()+86400000)
        const overlap=await tx.meeting.findFirst({where:{date:{gte:day,lt:next},attendees:{some:{contactId:{in:row.contactIds}}}}})
        if(overlap)throw new Error(`Possible existing meeting: ${overlap.title}. Review this same-day contact overlap before importing; no records were changed.`)
      }
      const {contactIds,...fields}=row
      const data={...fields,provenance:{...fields.provenance,importedContactIds:contactIds}}
      const meeting = old ? await tx.meeting.update({where:{id:old.id},data:{...data, occurrence:old.occurrence==='OCCURRED' && row.occurrence!=='CANCELLED' ? 'OCCURRED':row.occurrence}}) : await tx.meeting.create({data:{...data,createdById:actor.id}})
      const priorIds=(old?.provenance as {importedContactIds?:string[]}|null)?.importedContactIds??[]
      await tx.meetingAttendee.deleteMany({where:{meetingId:meeting.id,contactId:{in:priorIds.filter(id=>!contactIds.includes(id))}}})
      for(const contactId of contactIds) await tx.meetingAttendee.upsert({where:{meetingId_contactId:{meetingId:meeting.id,contactId}},create:{meetingId:meeting.id,contactId},update:{}})
      await tx.activityLog.create({data:{userId:actor.id,action:old?'updated':'created',entityType:'meeting',entityId:meeting.id,entityName:meeting.title,changes:{sourceKey:row.sourceKey,before:old as unknown as Prisma.InputJsonValue,after:data as unknown as Prisma.InputJsonValue}}})
      changed++
    }
    return {changed,total:rows.length}
  },{timeout:30000})
}
export async function networkingOverview(actor:Actor) {
  const [meetings,contacts,replies,preferences,emails]=await Promise.all([
    prisma.meeting.findMany({include:{attendees:{include:{contact:{select:{id:true,name:true}}}},projects:{include:{project:{select:{id:true,title:true}}}},meetingNotes:true},orderBy:{date:'desc'},take:500}),
    prisma.contact.findMany({where:{OR:[{type:'NETWORK_EXEC'},{company:{isBuyer:true}},{writerTier:'WANT_TO_WORK_WITH'}]},include:{company:true,meetingAttendees:{include:{meeting:true}}}}),
    prisma.emailReply.findMany({where:{mailbox:HAWCO_MAILBOX},orderBy:{receivedAt:'desc'}}),
    prisma.networkingPreferences.findUnique({where:{userId:actor.id}}),
    prisma.networkingEmail.findMany({where:{mailbox:HAWCO_MAILBOX}}),
  ])
  const [allContacts,availableProjects]=await Promise.all([prisma.contact.findMany({select:{id:true,email:true}}),prisma.project.findMany({select:{id:true,title:true},orderBy:{title:'asc'}})])
  const buyerDays=preferences?.buyerDays??56, priorityDays=preferences?.priorityDays??90
  const relationships=contacts.map(c=>{
    const incoming=replies.filter(r=>contactMatch(r.sender,allContacts)===c.id)
    const occurred=c.meetingAttendees.filter(m=>m.meeting.occurrence==='OCCURRED' && m.meeting.date<=new Date()).map(m=>m.meeting.date)
    const emailFacts=emails.filter(e=>e.contactId===c.id)
    const dates=[...occurred,...incoming.map(r=>r.receivedAt),...emailFacts.map(e=>e.occurredAt)].filter(d=>d<=new Date()).sort((a,b)=>b.getTime()-a.getTime())
    const last=dates[0]??null, buyer=c.type==='NETWORK_EXEC'||!!c.company?.isBuyer
    return {id:c.id,name:c.name,companyId:c.companyId,company:c.company?.name??null,buyer,last, incomingAt:[...incoming.map(r=>r.receivedAt),...emailFacts.filter(e=>e.direction==='INCOMING').map(e=>e.occurredAt)].sort((a,b)=>b.getTime()-a.getTime())[0]??null,outgoingAt:emailFacts.filter(e=>e.direction==='OUTGOING').map(e=>e.occurredAt).sort((a,b)=>b.getTime()-a.getTime())[0]??null,occurredAt:occurred.sort((a,b)=>b.getTime()-a.getTime())[0]??null,...quietState(last,buyer?buyerDays:priorityDays)}
  }).sort((a,b)=>Number(b.buyer)-Number(a.buyer)||(b.days??-1)-(a.days??-1))
  const companies=[...new Set(relationships.filter(c=>c.buyer&&c.companyId).map(c=>c.companyId!))].map(id=>{
    const members=relationships.filter(c=>c.companyId===id)
    const last=members.flatMap(c=>c.last?[c.last]:[]).sort((a,b)=>b.getTime()-a.getTime())[0]??null
    return {id,name:members[0].company,last,...quietState(last,buyerDays)}
  })
  return {meetings,availableProjects,relationships,companies,replies:replies.filter(r=>r.status==='OPEN').slice(0,5).map(r=>({id:r.id,sender:r.sender,subject:r.subject,receivedAt:r.receivedAt})),preferences:{buyerDays,priorityDays,version:preferences?.version??0},alertsEnabled:false,weekly:relationships.filter(c=>c.quiet).slice(0,5),sourceCaveat:'Confirmed meetings, incoming Hawco reply threads and explicitly sourced email records. Email history may be incomplete; missing history is not proof of no contact.'}
}
export async function addMeetingNote(actor:Actor,body:Record<string,unknown>) {
  const meetingId=String(body.meetingId||''), sourceRef=String(body.sourceRef||'').trim(), content=String(body.body||'').trim(), key=body.kind==='DEBRIEF' ? `debrief:${actor.id}:${meetingId}:${fingerprint(content)}` : String(body.sourceKey||'').trim()
  if(body.classification!=='BUSINESS' || !['DEBRIEF','NOTES','TRANSCRIPT'].includes(String(body.kind)) || !sourceRef || !key || !content || content.length>50000 || key.length>300 || sourceRef.length>1000) throw new Error('Supply a business-only note, exact meeting, source reference and stable source identifier. Legal notes must stay in Legal.')
  return prisma.$transaction(async tx=>{
    const meeting=await tx.meeting.findUniqueOrThrow({where:{id:meetingId}})
    if(meeting.occurrence==='CANCELLED') throw new Error('Cancelled meetings cannot receive an attendance debrief.')
    if(body.confirmOccurred===true) {if(meeting.date>new Date())throw new Error('A future meeting cannot be marked as occurred.');await tx.meeting.update({where:{id:meetingId},data:{occurrence:'OCCURRED'}})}
    const old=await tx.meetingNote.findUnique({where:{sourceKey:key}})
    if(old) {if(old.meetingId!==meetingId||old.body!==content||old.sourceRef!==sourceRef||old.kind!==body.kind) throw new Error('Source identifier already used for different content. Preserve the original and use a new revision.');return old}
    const note=await tx.meetingNote.create({data:{meetingId,sourceKey:key,sourceRef,body:content,kind:String(body.kind),actorId:actor.id}})

    return note
  })
}

export async function recordEmail(actor:Actor, body:Record<string,unknown>) {
  if(body.mailbox!==HAWCO_MAILBOX || !['INCOMING','OUTGOING'].includes(String(body.direction)))throw new Error('Supply the Hawco mailbox and explicit email direction.')
  const date = new Date(String(body.occurredAt)), messageId=String(body.messageId||''),sourceRef=String(body.sourceRef||'').trim()
  if(!Number.isFinite(date.getTime()) || date>new Date() || !/^[a-f0-9]{1,64}$/i.test(messageId) || !sourceRef || sourceRef.length>1000)throw new Error('Supply a dated message identifier and evidence reference.')
  const contacts=await prisma.contact.findMany({select:{id:true,email:true}})
  const contactId=contactMatch(String(body.counterparty||''),contacts)
  if(!contactId)throw new Error('Email must match exactly one existing contact; ambiguous or unknown identities are not imported.')
  const sourceKey=`email:${HAWCO_MAILBOX}:${messageId}:${contactId}`
  const data={sourceKey,mailbox:HAWCO_MAILBOX,messageId,direction:String(body.direction),contactId,occurredAt:date,sourceRef,actorId:actor.id}
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(74115902)`
    const old=await tx.networkingEmail.findUnique({where:{sourceKey}})
    if(old){if(old.direction!==data.direction||old.occurredAt.getTime()!==date.getTime()||old.sourceRef!==sourceRef)throw new Error('Conflicting evidence for this message; original preserved.');return old}
    return tx.networkingEmail.create({data})
  })
}

export async function linkMeetingProject(actor:Actor, body:Record<string,unknown>) {
 const meetingId=String(body.meetingId||''),projectId=String(body.projectId||''),evidence=String(body.sourceRef||'').trim()
 if(!evidence || evidence.length>1000 || body.confirmed!==true)throw new Error('Confirm the project was involved and provide the source for this link.')
 return prisma.$transaction(async tx=>{
  const [meeting,project]=await Promise.all([tx.meeting.findUniqueOrThrow({where:{id:meetingId}}),tx.project.findUniqueOrThrow({where:{id:projectId}})])
  const link=await tx.meetingProject.upsert({where:{meetingId_projectId:{meetingId,projectId}},create:{meetingId,projectId},update:{}})
  await tx.activityLog.create({data:{userId:actor.id,action:'linked',entityType:'meeting',entityId:meetingId,entityName:meeting.title,changes:{projectId,projectTitle:project.title,sourceRef:evidence}}})
  return link
 })
}
