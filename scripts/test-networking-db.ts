import assert from 'node:assert/strict'
import { prisma } from '../src/lib/db'
import { importPreview,applyImport,addMeetingNote,networkingOverview,recordEmail,linkMeetingProject } from '../src/lib/networking'
import { fingerprint } from '../src/lib/networking-domain'
async function main(){
 if(!process.env.DATABASE_URL?.includes('localhost/hawco_networking_20261115'))throw Error('Synthetic database only')
 await prisma.meetingNote.deleteMany();await prisma.meetingAttendee.deleteMany();await prisma.meetingProject.deleteMany();await prisma.meeting.deleteMany();await prisma.activityLog.deleteMany();await prisma.googleCalendarEvent.deleteMany();await prisma.googleCalendarConnection.deleteMany();await prisma.networkingEmail.deleteMany();await prisma.networkingPreferences.deleteMany();await prisma.emailReply.deleteMany();await prisma.contact.deleteMany();await prisma.company.deleteMany();await prisma.project.deleteMany();await prisma.user.deleteMany()
 const actor=await prisma.user.create({data:{id:'network-owner',email:'owner@example.invalid',name:'Synthetic Philip',password:'not-a-login-password',role:'ADMIN'}})
 await prisma.user.create({data:{id:'network-member',email:'member@example.invalid',name:'Synthetic colleague',password:'not-a-login-password',role:'MEMBER'}})
 const company=await prisma.company.create({data:{name:'Synthetic broadcaster',type:'NETWORK',isBuyer:true}})
 const note='Original text\n2026-02-10 - Met online\n2026-02 - Met online\n2026-03-01 - Scheduled meeting'
 const contact=await prisma.contact.create({data:{name:'Synthetic buyer',email:'buyer@example.invalid',type:'NETWORK_EXEC',companyId:company.id,notes:note}})
 await prisma.contact.create({data:{name:'Buyer with unknown history',type:'NETWORK_EXEC',companyId:company.id}})
 let rows=await importPreview(actor,'notes');assert.equal(rows.length,1)
 const simultaneous=await Promise.all([1,2].map(()=>applyImport(actor,'notes',fingerprint(rows))));assert.equal(simultaneous.reduce((n,x)=>n+x.changed,0),1)
 assert.equal(await prisma.meeting.count(),1);assert.equal((await prisma.contact.findUniqueOrThrow({where:{id:contact.id}})).notes,note)
 assert.equal((await prisma.meeting.findFirstOrThrow()).datePrecision,'DAY')
 await prisma.contact.update({where:{id:contact.id},data:{notes:note+'\n2026-02-10 - Met a second time'}})
 const overlap=await importPreview(actor,'notes');await assert.rejects(applyImport(actor,'notes',fingerprint(overlap)),/Possible existing meeting/);assert.equal(await prisma.meeting.count(),1)
 await prisma.contact.update({where:{id:contact.id},data:{notes:note}})
 const conn=await prisma.googleCalendarConnection.create({data:{userId:actor.id,calendarId:'hawco-test-calendar',refreshToken:'synthetic-unused'}})
 await assert.rejects(importPreview(actor,'calendar'))
 process.env.HAWCO_CALENDAR_ID=conn.calendarId;process.env.HAWCO_CALENDAR_OWNER_ID=actor.id
 const event=await prisma.googleCalendarEvent.create({data:{connectionId:conn.id,googleEventId:'event-one',title:'Buyer conversation',startAt:new Date('2026-11-14T14:00:00Z'),endAt:new Date('2026-11-14T15:00:00Z'),attendeesJson:['buyer@example.invalid'],status:'confirmed'}})
 assert.equal((await importPreview(actor,'calendar')).length,0,'legacy unknown provenance rejected')
 await prisma.googleCalendarEvent.update({where:{id:event.id},data:{sourceCalendarId:conn.calendarId}})
 rows=await importPreview(actor,'calendar');await applyImport(actor,'calendar',fingerprint(rows));assert.equal(await prisma.meeting.count(),2)
 let meeting=await prisma.meeting.findFirstOrThrow({where:{sourceKey:{startsWith:'calendar:'}}});assert.equal(meeting.occurrence,'PLANNED','past calendar event is not attendance')
 await prisma.googleCalendarEvent.update({where:{id:event.id},data:{title:'Changed title'}});await assert.rejects(applyImport(actor,'calendar',fingerprint(rows)))
 rows=await importPreview(actor,'calendar');await applyImport(actor,'calendar',fingerprint(rows));assert.equal(await prisma.meeting.count(),2)
 await prisma.googleCalendarEvent.update({where:{id:event.id},data:{attendeesJson:[]}});rows=await importPreview(actor,'calendar');await applyImport(actor,'calendar',fingerprint(rows));assert.equal(await prisma.meetingAttendee.count({where:{meetingId:meeting.id}}),0,'removed calendar participants are not retained as attendance')
 await prisma.googleCalendarEvent.update({where:{id:event.id},data:{status:'cancelled'}});rows=await importPreview(actor,'calendar');await applyImport(actor,'calendar',fingerprint(rows));meeting=await prisma.meeting.findUniqueOrThrow({where:{id:meeting.id}});assert.equal(meeting.occurrence,'CANCELLED')
 await assert.rejects(addMeetingNote(actor,{meetingId:meeting.id,sourceKey:'x',kind:'DEBRIEF',classification:'BUSINESS',sourceRef:'test',body:'Cancelled'}))
 const historical=await prisma.meeting.findFirstOrThrow({where:{occurrence:'OCCURRED'}})
 const project=await prisma.project.create({data:{title:'Synthetic discussed project'}})
 await assert.rejects(linkMeetingProject(actor,{meetingId:historical.id,projectId:project.id,sourceRef:'Unconfirmed'}))
 await linkMeetingProject(actor,{meetingId:historical.id,projectId:project.id,sourceRef:'Synthetic meeting source confirms this project',confirmed:true})
 assert.equal(await prisma.meetingProject.count(),1)
 const input={meetingId:historical.id,sourceKey:'transcript-one',kind:'TRANSCRIPT',classification:'BUSINESS',sourceRef:'Explicit synthetic transcript reviewed by owner',body:'Business discussion'}
 await addMeetingNote(actor,input);await addMeetingNote(actor,input);assert.equal(await prisma.meetingNote.count(),1)
 await assert.rejects(addMeetingNote(actor,{...input,body:'changed source'}));await assert.rejects(addMeetingNote(actor,{...input,sourceKey:'legal',classification:'LEGAL'}))
 await prisma.emailReply.create({data:{mailbox:'philip@hawcoproductions.com',threadId:'aa',latestMessageId:'bb',sender:'buyer@example.invalid',subject:'Synthetic reply',context:'Synthetic',receivedAt:new Date('2026-11-10')}})
 const email={mailbox:'philip@hawcoproductions.com',messageId:'abcdef',direction:'OUTGOING',counterparty:'buyer@example.invalid',occurredAt:'2026-11-12T12:00:00Z',sourceRef:'Synthetic sent-message evidence'}
 await Promise.all([1,2].map(()=>recordEmail(actor,email)));assert.equal(await prisma.networkingEmail.count(),1)
 await assert.rejects(recordEmail(actor,{...email,mailbox:'company@example.invalid'}));await assert.rejects(recordEmail(actor,{...email,direction:'INCOMING'}))
 const overview=await networkingOverview(actor);assert.equal(overview.alertsEnabled,false);assert.equal(overview.relationships.find(c=>c.id===contact.id)?.outgoingAt?.toISOString(),'2026-11-12T12:00:00.000Z');assert.equal(overview.relationships.find(c=>c.name==='Buyer with unknown history')?.label,'No contact date recorded')
 assert.equal(overview.companies[0].last?.toISOString(),'2026-11-12T12:00:00.000Z')
 await prisma.meeting.create({data:{title:'Upcoming buyer meeting',date:new Date(Date.now()+86400000),occurrence:'PLANNED',createdById:actor.id,attendees:{create:{contactId:contact.id}}}})
 const quiet=await prisma.contact.create({data:{name:'Synthetic quiet buyer',type:'NETWORK_EXEC',companyId:company.id}});await prisma.meeting.create({data:{title:'Earlier buyer conversation',date:new Date('2026-05-01T12:00:00Z'),occurrence:'OCCURRED',datePrecision:'DAY',createdById:actor.id,attendees:{create:{contactId:quiet.id}}}})
 console.log('Networking synthetic DB: imports, concurrency, cancellation, identity, note preservation, provenance, direction, unknown history passed')
}
main().finally(()=>prisma.$disconnect())
