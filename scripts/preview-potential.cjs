// Loopback-only synthetic fixtures and identity. Retained for parent QA.
const {spawn}=require('node:child_process');
const {randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const jwt=require('jsonwebtoken');
const {chromium}=require('/opt/homebrew/lib/node_modules/agent-browser/node_modules/playwright-core');
const database='postgresql://mildred@localhost:5432/hawco_dashboard_order_dev_20261112';
const db=new PrismaClient({datasources:{db:{url:database}}});
const root='/Users/mildred/.openclaw/workspace/audits/hawco-potential-development-20261120';
(async()=>{
  const secret=randomBytes(40).toString('hex');
  await db.user.upsert({where:{id:'potential-qa'},create:{id:'potential-qa',email:'potential-qa@example.invalid',name:'Synthetic QA',password:'unused',role:'ADMIN'},update:{}});
  await db.contact.upsert({where:{id:'potential-qa-writer'},create:{id:'potential-qa-writer',name:'Synthetic Writer',type:'WRITER'},update:{}});
  for(const [id,title] of [['potential-qa-1','Synthetic Potential Project'],['potential-qa-2','Untitled Project With A Long Working Title']]) {
    await db.project.upsert({where:{id},create:{id,title,status:'POTENTIAL_DEVELOPMENT',logline:'A potential project being explored. No rights, funding or production commitment implied.',nextAction:'Discuss the next draft with the writer.',contacts:{create:{contactId:'potential-qa-writer',role:'WRITER'}}},update:{status:'POTENTIAL_DEVELOPMENT'}});
  }
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3397'],{env:{...process.env,DATABASE_URL:database,JWT_SECRET:secret},stdio:'inherit'});
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3397/login')).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--remote-debugging-port=3398']});
  const context=await browser.newContext();
  await context.addCookies([{name:'auth-token',value:jwt.sign({userId:'potential-qa',email:'potential-qa@example.invalid'},secret),url:'http://127.0.0.1:3397',httpOnly:true}]);
  const page=await context.newPage();
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:3397/');
    assert.equal(await page.locator('[data-potential-project]').count(),2);
    assert.equal(await page.locator('#active-development [data-development-project="potential-qa-1"]').count(),0);
    assert(await page.locator('#potential-development').innerText().then(t=>t.includes('Synthetic Writer')&&t.includes('Discuss the next draft')));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
    await page.locator('#potential-development').scrollIntoViewIfNeeded();await page.screenshot({path:`${root}/dashboard-${width}.png`});
  }
  await page.goto('http://127.0.0.1:3397/projects?status=potential_development');
  assert(await page.getByText('Synthetic Potential Project',{exact:true}).count());
  await page.goto('http://127.0.0.1:3397/projects/potential-qa-1?tab=manage');
  await page.getByRole('button',{name:'Edit project details',exact:true}).click();
  await page.getByLabel('Project status',{exact:true}).selectOption('DEVELOPING');
  await page.getByRole('button',{name:'Save project details',exact:true}).click();
  await page.waitForTimeout(700);assert.equal((await db.project.findUnique({where:{id:'potential-qa-1'}})).status,'DEVELOPING');
  await page.goto('http://127.0.0.1:3397/');assert.equal(await page.locator('[data-potential-project="potential-qa-1"]').count(),0);assert.equal(await page.locator('[data-development-project="potential-qa-1"]').count(),1);
  await page.goto('http://127.0.0.1:3397/projects/potential-qa-1?tab=manage');await page.getByRole('button',{name:'Edit project details',exact:true}).click();await page.getByLabel('Project status',{exact:true}).selectOption('POTENTIAL_DEVELOPMENT');await page.getByRole('button',{name:'Save project details',exact:true}).click();await page.waitForTimeout(700);
  await page.goto('http://127.0.0.1:3397/');assert.equal(await page.locator('[data-potential-project="potential-qa-1"]').count(),1);
  await db.project.updateMany({where:{id:{in:['potential-qa-1','potential-qa-2']}},data:{status:'CONSIDERING'}});await page.reload();assert(await page.getByText('No potential development projects yet.',{exact:true}).count());
  await db.project.updateMany({where:{id:{in:['potential-qa-1','potential-qa-2']}},data:{status:'POTENTIAL_DEVELOPMENT'}});await page.reload();
  const anon=await browser.newContext();const anonPage=await anon.newPage();await anonPage.goto('http://127.0.0.1:3397/');assert(anonPage.url().endsWith('/login'));await anon.close();
  console.log('PASS responsive 1440/390/320, membership, links/filter, UI transitions both ways, fresh navigation, empty state, unauthenticated redirect. Preview app3397/CDP3398 retained.');
  async function stop(){await browser.close();server.kill('SIGTERM');await db.$disconnect();process.exit(0)}process.on('SIGTERM',stop);process.on('SIGINT',stop);
})().catch(e=>{console.error(e.message);process.exit(1)});
