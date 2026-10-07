const assert = require('node:assert/strict')
const { PrismaClient } = require('@prisma/client')
const url = process.env.DATABASE_URL || ''
if (!url.startsWith('postgresql://mildred@127.0.0.1:55439/hawco_qa')) throw new Error('Only the isolated Hawco QA database is allowed')
const db = new PrismaClient()
async function main() {
 const project = await db.project.create({ data: { title: 'Accountability constraint QA' } })
 try {
  const [a,b] = await Promise.all(['A','B'].map(title => db.material.create({ data: { projectId: project.id, title, type: 'PILOT_SCRIPT', filename: title, fileUrl: 'https://example.invalid/qa', familyId: 'Pilot' } })))
  const results = await Promise.allSettled([a,b].map(v => db.material.update({ where: { id: v.id }, data: { approvedAt: new Date() } })))
  assert.equal(results.filter(r=>r.status==='fulfilled').length, 1)
  assert.equal(await db.material.count({ where: { projectId: project.id, approvedAt: { not: null } } }), 1)
  await assert.rejects(db.followUp.create({ data: { note: 'No context' } }))
  const followup = await db.followUp.create({ data: { note: 'Read pilot', projectId: project.id, ownerName: 'QA Reader' } })
  assert.equal(followup.contactId, null)
  await db.followUp.update({ where: { id: followup.id }, data: { completed: true, completedAt: new Date() } })
  const undone = await db.followUp.update({ where: { id: followup.id }, data: { completed: false, completedAt: null } })
  assert.equal(undone.completedAt, null)
  console.log('✓ Isolated DB: concurrent approved-version uniqueness, follow-up context constraint, project-only task, completion/undo')
 } finally { await db.material.deleteMany({ where: { projectId: project.id } }); await db.project.delete({ where: { id: project.id } }) }
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
