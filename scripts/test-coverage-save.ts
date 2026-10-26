import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { coverageReadDate, resolveCoverageLinks, syncCoverageRead } from '../src/lib/coverage-save'

// Explicitly opt in to a disposable local database. Never run against application storage.
if (!process.env.DATABASE_URL?.includes('127.0.0.1:55476/hawco_coverage_20261026')) throw new Error('Disposable coverage QA database required')
const db = new PrismaClient()
async function main() {
  const date = new Date('2026-10-20T12:00:00Z')
  const prior = new Date('2026-10-01T12:00:00Z')
  await db.project.create({ data: { id: 'coverage-test', title: 'Covered project', status: 'PASSED', verdict: 'PASS', genre: 'Drama', logline: 'Existing human logline' } })
  await db.project.create({ data: { id: 'coverage-other', title: 'Other project' } })
  for (const [id, projectId, type, createdAt, readAt] of [
    ['script','coverage-test','PILOT_SCRIPT',prior,null], ['later','coverage-test','PILOT_SCRIPT',new Date('2026-10-25'),null],
    ['deck','coverage-test','PITCH_DECK',prior,null], ['other','coverage-other','PILOT_SCRIPT',prior,null],
  ] as const) await db.material.create({ data: { id, projectId, type, title:id, filename:id+'.pdf', fileUrl:'https://example.test/'+id, createdAt, readAt } })
  await assert.rejects(() => db.$transaction(tx => resolveCoverageLinks(tx, 'coverage-test', 'other', date)), /does not belong/)
  await assert.rejects(() => db.$transaction(tx => resolveCoverageLinks(tx, 'missing', null, date)), /no longer exists/)
  assert.throws(() => coverageReadDate('bad'), /valid date/)
  assert.throws(() => coverageReadDate('2099-01-01'), /future/)
  const save = async (fail = false) => db.$transaction(async tx => {
    const links = await resolveCoverageLinks(tx, 'coverage-test', null, date)
    assert.equal(links.scriptId, 'script')
    const saved = await tx.coverage.create({ data: { projectId: 'coverage-test', scriptId: links.scriptId, title:'Covered project', writer:'Writer', dateRead:date, genre:'Comedy', logline:'Must not overwrite', synopsis:'Brief sourced synopsis.', summary:'Actual evaluation', scoreConcept:8 } })
    await syncCoverageRead(tx, saved)
    if (fail) throw new Error('Injected rollback')
    return saved
  })
  await assert.rejects(() => save(true), /Injected rollback/)
  assert.equal(await db.coverage.count({where:{title:'Covered project'}}), 0)
  assert.equal((await db.project.findUniqueOrThrow({where:{id:'coverage-test'}})).firstReadAt,null)
  assert.equal((await db.material.findUniqueOrThrow({where:{id:'script'}})).readAt,null)
  const saved = await save()
  const project = await db.project.findUniqueOrThrow({where:{id:'coverage-test'}})
  assert.equal(project.firstReadAt?.toISOString(),date.toISOString())
  assert.equal(project.status,'PASSED');assert.equal(project.verdict,'PASS')
  assert.equal(project.logline,'Existing human logline');assert.equal(project.genre,'Drama')
  assert.equal(project.synopsis,'Brief sourced synopsis.')
  assert.equal(saved.genre,'Comedy');assert.equal(saved.summary,'Actual evaluation');assert.equal(saved.scoreConcept,8)
  for (const id of ['later','deck','other']) assert.equal((await db.material.findUniqueOrThrow({where:{id}})).readAt,null)
  await db.project.update({where:{id:'coverage-test'},data:{firstReadAt:prior}})
  await db.material.update({where:{id:'script'},data:{readAt:prior}})
  await save()
  assert.equal((await db.project.findUniqueOrThrow({where:{id:'coverage-test'}})).firstReadAt?.toISOString(),prior.toISOString())
  assert.equal((await db.material.findUniqueOrThrow({where:{id:'script'}})).readAt?.toISOString(),prior.toISOString())
  await assert.rejects(() => db.$transaction(tx => resolveCoverageLinks(tx,'coverage-test',null,new Date('2026-10-26'))),/multiple scripts/)
  await db.material.update({where:{id:'other'},data:{title:'Different show — writer sample'}})
  await db.material.create({data:{id:'own-deck',projectId:'coverage-other',type:'PITCH_DECK',title:'Own project deck',filename:'deck.pdf',fileUrl:'https://example.test/deck.pdf'}})
  await db.$transaction(async tx => {
    const links = await resolveCoverageLinks(tx, 'coverage-other', null, date)
    assert.equal(links.scriptId,null)
    const sampleProjectCoverage = await tx.coverage.create({data:{title:'Covered project',writer:'Writer',projectId:'coverage-other',scriptId:links.scriptId,dateRead:date}})
    await syncCoverageRead(tx,sampleProjectCoverage)
  })
  assert.equal((await db.material.findUniqueOrThrow({where:{id:'other'}})).readAt,null)
  assert.equal((await db.material.findUniqueOrThrow({where:{id:'own-deck'}})).readAt,null)
  console.log('PASS real database: date/link validation; automatic single-script resolution; multiple-script rejection; complete rollback; atomic read linkage; preserved earlier dates, newer/unrelated materials, project stage and evaluations; fill-only summary sync.')
}
main().finally(async () => { await db.project.deleteMany({where:{id:{in:['coverage-test','coverage-other']}}}); await db.material.deleteMany({where:{id:{in:['script','later','deck','other','own-deck']}}}); await db.coverage.deleteMany({where:{title:'Covered project'}}); await db.$disconnect() })
