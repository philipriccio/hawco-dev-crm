import assert from 'node:assert/strict'
import { prisma } from '../src/lib/db'
import { getPotentialDevelopment } from '../src/lib/potential-development'
import { getDashboardDevelopment, saveDashboardOrder, OrderError } from '../src/lib/dashboard-development-order'
import { DEVELOPMENT_SLATE_STATUSES, DEVELOPMENT_NEXT_STEPS_WHERE } from '../src/lib/development-slate'
import { EDITABLE_PROJECT_STATUSES } from '../src/lib/project-field-statuses'
import { developmentSelect, developmentVersion, saveProjectDevelopment, parseDevelopmentEdit } from '../src/lib/project-development'

const prefix = 'potential-test-'
async function main() {
  const url = new URL(process.env.DATABASE_URL!)
  assert.equal(url.hostname, 'localhost'); assert.equal(url.pathname, '/hawco_dashboard_order_dev_20261112')
  assert(!DEVELOPMENT_SLATE_STATUSES.includes('POTENTIAL_DEVELOPMENT'))
  assert(!DEVELOPMENT_NEXT_STEPS_WHERE.status.in.includes('POTENTIAL_DEVELOPMENT'))
  assert(EDITABLE_PROJECT_STATUSES.includes('POTENTIAL_DEVELOPMENT'))
  assert.throws(() => parseDevelopmentEdit({version:'a'.repeat(64),status:'POTENTIAL',currentStage:'',nextAction:'',writerIds:[],ipIds:[]}))
  const user = await prisma.user.create({ data: { id: prefix+'user', email: prefix+'@example.invalid', name:'Synthetic editor', password:'unused' } })
  for (const [id,status] of [['active','DEVELOPING'],['potential','POTENTIAL_DEVELOPMENT'],['considering','CONSIDERING']] as const) await prisma.project.create({data:{id:prefix+id,title:prefix+id,status,logline:'Preserve summary',nextAction:'Preserve next action'}})
  let active = await getDashboardDevelopment()
  const originalOrder = active.projects.map(p=>p.id)
  assert(originalOrder.includes(prefix+'active')); assert(!originalOrder.includes(prefix+'potential'))
  assert((await getPotentialDevelopment()).some(p=>p.id===prefix+'potential'))
  assert(!(await getPotentialDevelopment()).some(p=>p.id===prefix+'considering'))
  await assert.rejects(saveDashboardOrder({revision:active.revision,projectIds:[...originalOrder,prefix+'potential']}), (e:unknown)=>e instanceof OrderError && e.status===409)
  const transition = async (status:'POTENTIAL_DEVELOPMENT'|'DEVELOPING') => {
    const p = await prisma.project.findUniqueOrThrow({where:{id:prefix+'active'},select:developmentSelect})
    await saveProjectDevelopment(p.id,{version:developmentVersion(p),status,currentStage:p.currentStage||'',nextAction:p.nextAction||'',writerIds:[],ipIds:[]},user.id)
  }
  await saveDashboardOrder({revision:active.revision,projectIds:originalOrder})
  await transition('POTENTIAL_DEVELOPMENT')
  active = await getDashboardDevelopment()
  assert.deepEqual(active.projects.map(p=>p.id), originalOrder.filter(id=>id!==prefix+'active'))
  assert((await getPotentialDevelopment()).some(p=>p.id===prefix+'active'))
  await saveDashboardOrder({revision:active.revision,projectIds:active.projects.map(p=>p.id)})
  await transition('DEVELOPING')
  assert.deepEqual((await getDashboardDevelopment()).projects.map(p=>p.id),originalOrder, 'promoting back restores the retained active slot')
  assert(!(await getPotentialDevelopment()).some(p=>p.id===prefix+'active'))
  assert.equal((await prisma.project.findUniqueOrThrow({where:{id:prefix+'active'}})).logline,'Preserve summary')
  console.log('PASS: opt-in membership, no CONSIDERING promotion, potential excluded from slate/next steps/order, audited versioned transitions both ways, retained active order and summary')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  await prisma.activityLog.deleteMany({where:{userId:prefix+'user'}})
  await prisma.project.deleteMany({where:{id:{startsWith:prefix}}})
  await prisma.user.deleteMany({where:{id:prefix+'user'}})
  await prisma.$disconnect()
})
