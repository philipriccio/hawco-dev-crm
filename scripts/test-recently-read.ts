import assert from 'node:assert/strict'
import { PrismaClient, MaterialType } from '@prisma/client'
import { RECENTLY_READ_QUERY } from '../src/lib/recently-read'

// Integration-only: refuse anything except the dedicated loopback synthetic database.
const url = new URL(process.env.DATABASE_URL || 'http://invalid')
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.pathname, '/hawco_recently_read_20261027')
const db = new PrismaClient()
async function main() {
  await db.material.deleteMany()
  assert.deepEqual(await db.material.findMany(RECENTLY_READ_QUERY), [], 'Empty history')
  const project = await db.project.upsert({ where: { id: 'recent-project' }, update: {}, create: { id: 'recent-project', title: 'Synthetic recent project', websiteUnsolicited: true } })
  const types: MaterialType[] = ['PILOT_SCRIPT','FEATURE_SCRIPT','PITCH_DECK','ONE_PAGER','SERIES_BIBLE','TREATMENT']
  for (let i = 0; i < 12; i++) await db.material.create({ data: {
    id: `recent-${String(i).padStart(2, '0')}`, title: `Read item ${i} — a synthetic script or deck`, type: types[i % types.length],
    filename: 'synthetic.pdf', fileUrl: 'javascript:invalid', projectId: i === 0 ? null : project.id,
    readAt: new Date(i < 2 ? '2026-10-27T00:00:00Z' : `2026-10-${String(26-i).padStart(2,'0')}T10:00:00Z`),
    createdAt: new Date('2026-10-01T00:00:00Z'),
  } })
  for (const [id,type,readAt] of [['unread','PILOT_SCRIPT',null],['agreement','AGREEMENT',new Date('2026-10-28')],['other','OTHER',new Date('2026-10-28')]] as const) await db.material.create({ data: { id, type, title: id, filename: 'fake.pdf', fileUrl: 'https://example.test/fake.pdf', readAt } })
  let rows = await db.material.findMany(RECENTLY_READ_QUERY)
  assert.equal(rows.length, 10, 'Database cap')
  assert.deepEqual(rows.map(m=>m.id), Array.from({length:10},(_,i)=>`recent-${String(i).padStart(2,'0')}`), 'Newest first; ties stable; not creation/update time')
  assert.equal(rows[0].project,null,'Orphan preserved')
  assert.equal(rows[1].project?.id,project.id,'Website reading included')
  assert.deepEqual(new Set(rows.map(m=>m.type)),new Set(types),'All six readable types included')
  await db.material.update({where:{id:'unread'},data:{readAt:new Date('2026-10-29')}})
  rows=await db.material.findMany(RECENTLY_READ_QUERY)
  assert.equal(rows[0].id,'unread','New read appears first')
  await db.material.update({where:{id:'unread'},data:{readAt:null}})
  assert.equal((await db.material.findMany(RECENTLY_READ_QUERY))[0].id,'recent-00','Unread disappears')
  console.log('PASS real-DB recently read: empty, type filtering, unread exclusion, recorded-date order, ties, limit10, website/orphan inclusion, read transitions')
}
main().finally(()=>db.$disconnect()).catch(e=>{console.error(e);process.exitCode=1})
