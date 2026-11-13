const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{randomBytes}=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),jwt=require('jsonwebtoken'),{PrismaClient}=require('@prisma/client')
const {chromium}=require('/opt/homebrew/lib/node_modules/agent-browser/node_modules/playwright-core')
const u=new URL(process.env.DATABASE_URL||'postgresql://invalid/');assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.pathname==='/hawco_sourcing_dev_20261112','Synthetic loopback only')
const db=new PrismaClient(),principal='sourcing-synthetic-owner',secret=randomBytes(48).toString('hex'),origin='http://127.0.0.1:3375',artifacts=path.resolve('../../audits/hawco-classification-20261113'),results=[]
const token=jwt.sign({userId:principal,email:'sourcing-owner@example.invalid'},secret,{expiresIn:'1h'})
let server,browser
async function call(route,body,headers={}){return fetch(origin+route,{redirect:'manual',method:'PATCH',headers:{cookie:'auth-token='+token,Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})}
async function main(){
 await db.$executeRawUnsafe("INSERT INTO \"DashboardDevelopmentOrder\" (id,revision,\"projectIds\") VALUES ('active-development',0,'[]'::jsonb) ON CONFLICT (id) DO NOTHING")
 const log=fs.openSync(path.join(artifacts,'http-server.log'),'w');server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3375'],{env:{...process.env,JWT_SECRET:secret,SOURCING_PHILIP_USER_ID:principal},stdio:['ignore',log,log]})
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin+'/login')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}assert.ok(ready)
 const project=await db.project.findUniqueOrThrow({where:{id:'sourcing-synthetic-project'}}),lead=await db.sourcingLead.findFirstOrThrow(),ip=await db.ipProperty.findUniqueOrThrow({where:{id:'sourcing-synthetic-ip'}})
 const base={standardizedFormat:'HALF_HOUR_COMEDY',narrativeEngine:'EPISODIC',primaryGenre:'COMEDY',secondaryGenre:'ROMANCE',descriptorTags:['music','ensemble'],version:project.updatedAt.toISOString(),pipelineStage:null,packagingNeeds:project.packagingNeeds,targetNetwork:project.targetNetwork}
 const endpoint='/api/classification/project/'+project.id
 for(const cookie of ['', 'auth-token=forged'])assert.equal((await call(endpoint,base,{cookie})).status,401)
 assert.equal((await call(endpoint,base,{Origin:'https://evil.invalid'})).status,403)
 assert.equal((await call(endpoint,base,{'sec-fetch-site':'cross-site'})).status,403)
 assert.equal((await call(endpoint,base,{'Content-Type':'text/plain'})).status,415)
 assert.equal((await call(endpoint,{...base,primaryGenre:'fantasy'})).status,400)
 assert.equal((await call(endpoint,{...base,notes:'overwrite'})).status,400)
 assert.equal((await call('/api/projects/'+project.id,{primaryGenre:'COMEDY'})).status,400)
 assert.equal((await call(endpoint,base)).status,200);assert.equal((await call(endpoint,base)).status,409)
 results.push('API unauthenticated/forged, origin, cross-site, type, taxonomy and unrelated-field protection; legacy explicit rejection; real persistence + stale 409')
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-dev-shm-usage']})
 const ctx=await browser.newContext();await ctx.addCookies([{name:'auth-token',value:token,url:origin,httpOnly:true}]);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 for(const [kind,record,url] of [['project',project,'/projects/'+project.id],['lead',lead,'/sourcing/'+lead.id],['ip',ip,'/ip/'+ip.id]]){
  console.log('Browser edit',kind);await page.goto(origin+url,{waitUntil:'networkidle'});const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Slate classification',exact:true})})
  await section.getByLabel('Primary genre',{exact:true}).selectOption('THRILLER');await section.getByLabel('Tags — one per line').fill('Synthetic tag\nsoapy');const save=page.waitForResponse(r=>r.url().includes('/api/classification/')&&r.request().method()==='PATCH');await section.getByRole('button',{name:'Save classification',exact:true}).click();assert.equal((await save).status(),200);await page.reload({waitUntil:'networkidle'})
  assert.equal(await section.getByLabel('Primary genre',{exact:true}).inputValue(),'THRILLER');assert.equal(await section.getByLabel('Tags — one per line').inputValue(),'Synthetic tag\nsoapy')
  const model=kind==='project'?db.project:kind==='lead'?db.sourcingLead:db.ipProperty
  const fresh=await model.findUniqueOrThrow({where:{id:record.id}});assert.equal(fresh.primaryGenre,'THRILLER')
  await model.update({where:{id:record.id},data:{updatedAt:new Date(Date.now()+1000)}})
  await section.getByRole('button',{name:'Save classification',exact:true}).click();await page.getByRole('alert').filter({hasText:'Record changed'}).waitFor();assert.equal((await model.findUniqueOrThrow({where:{id:record.id}})).primaryGenre,'THRILLER')
  await page.getByRole('button',{name:'Reload latest record',exact:true}).first().click();await page.waitForLoadState('networkidle')
 }
 results.push('Project, lead and IP browser save/reload persistence and stale conflict recovery')
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});for(const [name,url] of [['project','/projects/'+project.id],['lead','/sourcing/'+lead.id],['ip','/ip/'+ip.id],['wanted','/sourcing/wanted'],['dashboard','/']]){await page.goto(origin+url,{waitUntil:'networkidle'});assert.ok(!(await page.locator('body').innerText()).includes('Application error'),'server page error '+name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+name+' '+width);await page.screenshot({path:path.join(artifacts,name+'-'+width+'.png'),fullPage:true});if(['project','lead','ip'].includes(name)){await page.getByRole('heading',{name:'Slate classification',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,name+'-editor-'+width+'.png')})}}}
 await page.goto(origin+'/sourcing/wanted?primaryGenre=UNKNOWN',{waitUntil:'networkidle'});assert.match(await page.locator('main').last().innerText(),/Projects informing the brief \(0 of 1\)/)
 await page.goto(origin+'/sourcing/wanted?primaryGenre=THRILLER',{waitUntil:'networkidle'});assert.match(await page.locator('main').last().innerText(),/Projects informing the brief \(1 of 1\)/)
 assert.deepEqual(errors,[]);results.push('Desktop/mobile 1440/390/320 project/lead/IP/wanted/dashboard: no overflow or JS errors; unknown and genre filters')
 fs.writeFileSync(path.join(artifacts,'HTTP-BROWSER-RESULTS.json'),JSON.stringify({passed:results},null,2));console.log(results.join('\n'))
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();if(server)server.kill('SIGTERM');await db.$disconnect()})
