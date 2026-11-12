import assert from 'node:assert/strict'
import { prisma } from '../src/lib/db'
import { getDashboardDevelopment, saveDashboardOrder, parseOrder, orderedIds, retainInactive, OrderError } from '../src/lib/dashboard-development-order'

async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, 'localhost')
  assert(new URL(process.env.DATABASE_URL!).pathname.endsWith('/hawco_dashboard_order_dev_20261112'))
  for (const value of [null, {}, {revision:-1,projectIds:[]}, {revision:0,projectIds:['a','a']}, {revision:0,projectIds:[1]}]) assert.throws(() => parseOrder(value))
  assert.deepEqual(orderedIds(['b','inactive'],['a','b','c']),['b','a','c'])
  assert.deepEqual(retainInactive(['a','off','b'],['b','a','new'],['a','off','b','new']),['b','off','a','new'])
  await prisma.project.deleteMany()
  await prisma.$executeRaw`UPDATE "DashboardDevelopmentOrder" SET "revision"=0, "projectIds"='[]'::jsonb`
  await prisma.user.upsert({ where:{id:'dashboard-order-owner'}, create:{id:'dashboard-order-owner',name:'Synthetic Owner',email:'dashboard-order@example.invalid',password:'not-a-login-password',role:'ADMIN'},update:{} })
  for(let i=0;i<6;i++) await prisma.project.create({data:{id:`order-project-${i}`,title:`Order project ${i+1}`,status: i===5?'ON_HOLD':'DEVELOPING',classification:'REFERENCE',nextAction:'Synthetic next action'}})
  const before=await prisma.project.findMany({orderBy:{id:'asc'}})
  let state=await getDashboardDevelopment();const ids=state.projects.map(p=>p.id)
  assert.equal(ids.length,5)
  await saveDashboardOrder({revision:state.revision,projectIds:[...ids].reverse()})
  assert.deepEqual((await getDashboardDevelopment()).projects.map(p=>p.id),[...ids].reverse())
  await assert.rejects(saveDashboardOrder({revision:0,projectIds:ids}), (e:unknown)=>e instanceof OrderError && e.status===409)
  state=await getDashboardDevelopment()
  const results=await Promise.allSettled([saveDashboardOrder({revision:state.revision,projectIds:ids}),saveDashboardOrder({revision:state.revision,projectIds:[...ids].reverse()})])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(results.filter(r=>r.status==='rejected').length,1)
  state=await getDashboardDevelopment()
  await assert.rejects(saveDashboardOrder({revision:state.revision,projectIds:['unknown',...ids.slice(1)]}),(e:unknown)=>e instanceof OrderError && e.status===400)
  await assert.rejects(saveDashboardOrder({revision:state.revision,projectIds:ids.slice(1)}),(e:unknown)=>e instanceof OrderError && e.status===409)
  assert.deepEqual(await prisma.project.findMany({orderBy:{id:'asc'}}),before,'reorders must not change any Project fields')
  await prisma.project.update({where:{id:'order-project-5'},data:{status:'PACKAGING'}})
  await assert.rejects(saveDashboardOrder({revision:state.revision,projectIds:ids}),(e:unknown)=>e instanceof OrderError && e.status===409)
  state=await getDashboardDevelopment();assert.equal(state.projects.at(-1)!.id,'order-project-5')
  const newIds=state.projects.map(p=>p.id);await saveDashboardOrder({revision:state.revision,projectIds:newIds})
  await prisma.project.update({where:{id:newIds[1]},data:{status:'ON_HOLD'}})
  state=await getDashboardDevelopment();await saveDashboardOrder({revision:state.revision,projectIds:state.projects.map(p=>p.id).reverse()})
  await prisma.project.update({where:{id:newIds[1]},data:{status:'DEVELOPING'}})
  state=await getDashboardDevelopment();assert.equal(state.projects[1].id,newIds[1],'inactive rank retained')
  console.log('PASS: validation, deterministic append, inactive retention, persistence, concurrent write conflict, stale revision/membership, unknown IDs, untouched project fields')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect())
