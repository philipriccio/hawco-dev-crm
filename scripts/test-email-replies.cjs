const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { NextResponse } = require('next/server')
function load(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('require', 'exports', 'module', output)(id => mocks[id] || require(id), module.exports, module)
  return module.exports
}
const helpers = load('src/lib/email-replies.ts')
const { emailReplyInput, emailReplyUpdate, gmailThreadHref } = helpers
const raw = { mailbox: 'PHILIP@HAWCOPRODUCTIONS.COM', threadId: 'abc123', latestMessageId: 'def123', sender: 'Synthetic Sender', subject: 'Meeting request', context: 'Confirm the meeting time.', receivedAt: '2026-10-17T12:00:00Z' }
const input = emailReplyInput(raw)
assert.equal(input.mailbox, 'philip@hawcoproductions.com')
for (const patch of [{mailbox:'other@example.test'}, {threadId:'javascript:x'}, {receivedAt:'tomorrow'}, {subject:''}, {context:'x'.repeat(2001)}]) assert.throws(() => emailReplyInput({...raw,...patch}))
const existing = {...input,status:'DISMISSED'}
assert.equal(emailReplyUpdate(existing,input).status, undefined)
assert.equal(emailReplyUpdate(existing,{...input,latestMessageId:'def124'}).status,'OPEN')
assert.deepEqual(Object.keys(emailReplyUpdate(existing,{...input,latestMessageId:'def124',receivedAt:new Date('2026-10-16')})),['lastCheckedAt'])
assert.match(gmailThreadHref(input.mailbox,input.threadId),/^https:\/\/mail.google.com\/mail\/u\/\?authuser=philip%40hawcoproductions.com#all\/abc123$/)
const ranked = emailReplyInput({...raw,isNetwork:true,priorityRank:50,priorityReason:'Network awaiting answer'})
assert.equal(ranked.isNetwork,true)
assert.equal(emailReplyUpdate(existing,ranked).status,undefined)
assert.equal(emailReplyUpdate(existing,ranked).priorityRank,50)
assert.equal(emailReplyUpdate(existing,input).priorityRank,undefined,'legacy update preserves stored priority')
for(const patch of [{isNetwork:true},{isNetwork:'true',priorityRank:1,priorityReason:'x'},{isNetwork:false,priorityRank:0,priorityReason:'x'},{isNetwork:false,priorityRank:1.5,priorityReason:'x'},{isNetwork:false,priorityRank:1,priorityReason:''}]) assert.throws(()=>emailReplyInput({...raw,...patch}))
const rows=[{id:'urgent',isNetwork:false,priorityRank:1,receivedAt:'2026-10-01T00:00:00Z'},{id:'network',isNetwork:true,priorityRank:9999,receivedAt:'2026-10-28T00:00:00Z'},{id:'older',isNetwork:false,priorityRank:2,receivedAt:'2026-10-01T00:00:00Z'},{id:'newer',isNetwork:false,priorityRank:2,receivedAt:'2026-10-28T00:00:00Z'}]
assert.deepEqual(rows.sort(helpers.compareEmailReplies).map(x=>x.id),['network','urgent','older','newer'])
const slate = load('src/lib/development-slate.ts')
assert.deepEqual(slate.DEVELOPMENT_SLATE_STATUSES,['EARLY_DEVELOPMENT','DEVELOPING','PACKAGING','PITCHED','DEVELOPING_WITH_NETWORK','GREENLIT'])
assert.equal(slate.DEVELOPMENT_SLATE_STATUSES.includes('SUBMITTED'),false)
assert.equal(slate.DEVELOPMENT_SLATE_STATUSES.includes('PASSED'),false)
let authorized = false, reads = 0, writes = 0, fail = false, matches = 1
const db = { emailReply: {
 findMany: async () => {reads++; if(fail) throw Error('private DB detail'); return []},
 findUnique: async () => existing,
 upsert: async options => {writes++;return options.update},
 updateMany: async options => {writes++;assert.equal(options.where.latestMessageId,'def123');return {count:matches}},
}, $transaction: async fn => fn(db) }
const route = load('src/app/api/email-replies/route.ts', {'@/lib/db':{prisma:db}, '@/lib/api-auth':{requireApiAuth:async()=>authorized?{}:NextResponse.json({error:'Unauthorized'},{status:401}),isAuthResponse:v=>v instanceof NextResponse},'@/lib/email-replies':helpers})
const request = body => ({json:async()=>body})
;(async()=>{
 for (const fn of ['GET','POST','PATCH']) assert.equal((await route[fn](request({}))).status,401)
 assert.equal(reads+writes,0)
 authorized=true
 assert.equal((await route.POST(request({items:[raw,raw]}))).status,400)
 assert.equal(writes,0)
 const saved=await route.POST(request({items:[raw]}));assert.equal(saved.status,200);assert.equal((await saved.json())[0].status,undefined)
 assert.equal((await route.PATCH(request({id:'x',latestMessageId:'def123',status:'DELETE'}))).status,400)
 matches=0;assert.equal((await route.PATCH(request({id:'x',latestMessageId:'def123',status:'RESOLVED'}))).status,409)
 matches=1;assert.equal((await route.PATCH(request({id:'x',latestMessageId:'def123',status:'RESOLVED'}))).status,200)
 fail=true;const error=await route.GET();assert.equal(error.status,500);assert.equal(JSON.stringify(await error.json()).includes('private DB detail'),false)
 console.log('Email reply validation, stale scans, dismissal persistence, dedupe, auth, conflicts and error redaction passed; exact slate membership passed')
})().catch(error=>{console.error(error);process.exitCode=1})
