// Isolated synthetic local database only; auth remains ephemeral and never logged.
const assert = require('node:assert/strict')
const {spawn} = require('node:child_process')
const {randomBytes} = require('node:crypto')
const fs = require('node:fs'), path = require('node:path')
const jwt = require('jsonwebtoken')
const {PrismaClient} = require('@prisma/client')
const {chromium} = require('/opt/homebrew/lib/node_modules/agent-browser/node_modules/playwright-core')
const u = new URL(process.env.DATABASE_URL || 'postgresql://invalid/')
assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.pathname==='/hawco_sourcing_dev_20261112','Synthetic loopback DB only')
const db = new PrismaClient(), principal='sourcing-synthetic-owner', secret=randomBytes(48).toString('hex'), origin='http://127.0.0.1:3371'
const artifacts=path.resolve('../../audits/hawco-sourcing-20261112'), results=[]
let server,browser
const token=jwt.sign({userId:principal,email:'sourcing-owner@example.invalid'},secret,{expiresIn:'1h'})
async function call(route,{body,method,headers={},auth=true}={}) {
 const r=await fetch(origin+route,{redirect:'manual',method:method||(body?'POST':'GET'),headers:{...(auth?{cookie:'auth-token='+token}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{}),...headers},body:body?JSON.stringify(body):undefined})
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data}
}
const pass = s=>{results.push(s);console.log('PASS '+s)}
async function main(){
 assert.ok(await db.user.findUnique({where:{id:principal}}),'Seed DB test fixtures first')
 const log=fs.openSync(path.join(artifacts,'http-server.log'),'w')
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3371'],{env:{...process.env,JWT_SECRET:secret,SOURCING_PHILIP_USER_ID:principal},stdio:['ignore',log,log]})
 let ready=false;for(let n=0;n<80;n++){try{if((await fetch(origin+'/login')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}assert.ok(ready,'Local server ready')
 for(const route of ['/api/sourcing/leads','/api/sourcing/brief']) {assert.equal((await call(route,{auth:false})).status,401);assert.equal((await call(route,{headers:{Cookie:'auth-token=forged'}})).status,401)}
 const raw={title:'HTTP Synthetic '+Date.now(),creator:'Synthetic writer',kind:'PLAY',sourceChannel:'Synthetic theatre catalogue',sourceUrl:'https://example.invalid/play',sourceDate:'2026-11-12'}
 assert.equal((await call('/api/sourcing/leads',{body:raw,headers:{Origin:'https://attacker.invalid'}})).status,403)
 assert.equal((await call('/api/sourcing/leads',{body:raw,headers:{Origin:''}})).status,403)
 assert.equal((await call('/api/sourcing/leads',{body:raw,headers:{'sec-fetch-site':'cross-site'}})).status,403)
 assert.equal((await call('/api/sourcing/leads',{body:raw,headers:{'Content-Type':'text/plain'}})).status,415)
 assert.equal((await call('/api/sourcing/leads',{body:{...raw,decision:'PURSUING'}})).status,400)
 assert.equal((await call('/api/sourcing/leads',{body:{...raw,sourceUrl:'javascript:alert(1)'}})).status,400)
 pass('Unauthenticated/forged-session rejection; same-origin/content type and allowlisted input guards')
 const created=await call('/api/sourcing/leads',{body:raw});assert.equal(created.status,201);const id=created.data.id
 assert.equal((await call('/api/sourcing/leads',{body:raw})).status,409)
 assert.equal((await call('/api/sourcing/leads/'+id,{method:'PATCH',body:{version:1,action:'event',value:{kind:'INQUIRY_SENT',note:'Synthetic evidence only',sourceUrl:'https://example.invalid/mail',occurredOn:'2026-11-12'}}})).status,200)
 const detail=await call('/api/sourcing/leads/'+id);assert.equal(detail.data.decision,'NEW');assert.equal(detail.data.events.length,2)
 assert.equal((await call('/api/sourcing/leads/'+id,{method:'PATCH',body:{version:1,action:'decision',value:{decision:'INTERESTED',reason:''}}})).status,409)
 assert.equal((await call('/api/sourcing/leads?kind=PLAY&q='+encodeURIComponent(raw.title))).data.total,1)
 assert.equal((await call('/api/sourcing/leads?kind=INVALID')).status,400)
 pass('API persistence/dedup, evidence event versus decision, history, stale-save conflict, search and filters')
 const outsider = await db.user.upsert({where:{id:'sourcing-synthetic-other-admin'},create:{id:'sourcing-synthetic-other-admin',email:'other-admin@example.invalid',name:'Philip',role:'ADMIN',password:'NO_LOGIN'},update:{role:'ADMIN'}})
 const otherToken=jwt.sign({userId:outsider.id,email:outsider.email},secret,{expiresIn:'1h'})
 const latest=(await db.sourcingBrief.findFirstOrThrow({orderBy:{version:'desc'}}))
 const approval={version:latest.version,body:latest.body,action:'approve'}
 assert.equal((await call('/api/sourcing/brief',{auth:false,body:approval})).status,401)
 assert.equal((await call('/api/sourcing/brief',{headers:{Cookie:'auth-token='+otherToken},body:approval})).status,403)
 assert.equal(await db.sourcingBrief.count(),latest.version)
 const outsiderDraft=await call('/api/sourcing/brief',{headers:{Cookie:'auth-token='+otherToken},body:{...approval,action:'draft'}})
 assert.equal(outsiderDraft.status,201);assert.equal(outsiderDraft.data.actorId,outsider.id)
 pass('Approval rejects unauthenticated and non-Philip ADMIN; denial writes no version; non-owner draft editing remains available')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const otherContext=await browser.newContext();await otherContext.addCookies([{name:'auth-token',value:otherToken,url:origin}]);const otherPage=await otherContext.newPage()
 await otherPage.goto(origin+'/sourcing/wanted',{waitUntil:'networkidle'})
 assert.equal(await otherPage.getByRole('button',{name:'Approve saved brief',exact:true}).count(),0)
 assert.ok(await otherPage.getByRole('button',{name:'Save new draft',exact:true}).isVisible())
 await otherContext.close()
 pass('Non-owner UI offers draft editing but no approval control')
 const context=await browser.newContext();await context.addCookies([{name:'auth-token',value:token,url:origin}]);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(origin+'/sourcing/new',{waitUntil:'networkidle'})
 await page.getByLabel('Title',{exact:true}).fill('Browser synthetic lead '+Date.now())
 await page.getByLabel('Creator',{exact:true}).fill('Synthetic Creator')
 await page.getByLabel('Source Channel',{exact:true}).fill('Synthetic browser test')
 await page.getByLabel('Source Url',{exact:true}).fill('https://example.invalid/browser')
 await page.getByLabel('Source checked on',{exact:true}).fill('2026-11-12')
 await page.getByRole('button',{name:'Create lead',exact:true}).click()
 await page.waitForURL(/\/sourcing\/cm/);await page.getByRole('heading',{name:'Your decision'}).waitFor()
 const browserId=page.url().split('/').pop()
 await page.locator('select[name="decision"]').selectOption('PASSED')
 await page.getByRole('button',{name:'Record decision',exact:true}).click()
 await page.locator('main [role="alert"]').waitFor();assert.match(await page.locator('main [role="alert"]').innerText(),/record why/)
 await page.locator('textarea[name="reason"]').fill('Timing, not taste')
 await page.getByRole('button',{name:'Record decision',exact:true}).click()
 await page.waitForFunction(()=>document.body.innerText.includes('Revision 2'))
 assert.equal((await db.sourcingLead.findUniqueOrThrow({where:{id:browserId}})).decision,'PASSED')
 // Force a real optimistic conflict while the form has stale props.
 await call('/api/sourcing/leads/'+browserId,{method:'PATCH',body:{version:2,action:'decision',value:{decision:'NOT_NOW',reason:'Concurrent synthetic review'}}})
 await page.locator('textarea[name="nextStep"]').fill('This edit must conflict')
 await page.getByRole('button',{name:'Save research',exact:true}).click()
 await page.locator('main [role="alert"]').waitFor();assert.match(await page.locator('main [role="alert"]').innerText(),/changed|concurrent/i)
 await page.getByRole('button',{name:'Reload latest record',exact:true}).click();await page.waitForLoadState('networkidle')
 assert.equal(await page.locator('select[name="decision"]').inputValue(),'NOT_NOW')
 pass('Browser create, pass-reason validation, persisted decision, concurrent edit refusal and explicit reload')
 await page.goto(origin+'/sourcing/wanted',{waitUntil:'networkidle'})
 await page.getByLabel('Wanted list, evidence and priorities').fill('SYNTHETIC DRAFT — provisional priorities; no buyer mandates established.')
 await page.getByRole('button',{name:'Save new draft',exact:true}).click()
 await page.getByLabel('I reviewed this saved brief and approve its use.').waitFor()
 await page.getByLabel('I reviewed this saved brief and approve its use.').check()
 await page.getByRole('button',{name:'Approve saved brief',exact:true}).click()
 await page.waitForFunction(()=>document.body.innerText.includes('APPROVED. Editing'))
 assert.equal((await db.sourcingBrief.findFirstOrThrow({orderBy:{version:'desc'}})).status,'APPROVED')
 await page.getByLabel('Wanted list, evidence and priorities').fill('SYNTHETIC next draft, not approved')
 await page.getByRole('button',{name:'Save new draft',exact:true}).click()
 await page.getByLabel('I reviewed this saved brief and approve its use.').waitFor()
 assert.equal((await db.sourcingBrief.findFirstOrThrow({orderBy:{version:'desc'}})).status,'DRAFT')
 pass('Browser versioned brief: explicit exact-draft approval, later edits revert to draft, attribution visible')
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000})
  for(const [name,route] of [['list','/sourcing'],['detail','/sourcing/'+browserId],['wanted','/sourcing/wanted']]) {
   await page.goto(origin+route,{waitUntil:'networkidle'})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow '+name+' '+width)
   await page.screenshot({path:path.join(artifacts,name+'-'+width+'.png'),fullPage:true})
   if(name==='wanted') {await page.getByRole('heading',{name:'Sourcing brief',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,'wanted-editor-'+width+'.png')})}
   if(name==='detail') {await page.getByRole('heading',{name:'Your decision',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,'decision-'+width+'.png')})}
  }
 }
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog',{name:'Navigation',exact:true}).getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Sourcing',exact:true}).click();await page.waitForURL(origin+'/sourcing');assert.ok(await page.getByRole('heading',{name:'Sourcing',exact:true}).isVisible());
 assert.deepEqual(errors,[])
 pass('Desktop/390/320 layouts, working routes, no horizontal overflow or JavaScript errors')
 fs.writeFileSync(path.join(artifacts,'HTTP-BROWSER-RESULTS.json'),JSON.stringify({passed:results,browserLead:browserId},null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.kill('SIGTERM');await db.$disconnect()})
