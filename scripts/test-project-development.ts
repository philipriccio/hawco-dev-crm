import assert from 'node:assert/strict'
import { ProjectStatus } from '@prisma/client'
import { READING_DECISION_STATUSES } from '../src/lib/project-field-statuses'
import { prisma } from '../src/lib/db'
import { developmentSelect, developmentVersion, parseDevelopmentEdit, saveProjectDevelopment, DevelopmentEditError } from '../src/lib/project-development'

const prefix = 'development-editor-test-'
async function main() {
  const url = new URL(process.env.DATABASE_URL!)
  assert.equal(url.hostname, 'localhost')
  assert.equal(url.pathname, '/hawco_dashboard_order_dev_20261112')
  for (const input of [null, {}, { version: 'a'.repeat(64), status: 'DEVELOPING', currentStage: '', nextAction: '', writerIds: ['x', 'x'], ipIds: [] }]) assert.throws(() => parseDevelopmentEdit(input))
  const user = await prisma.user.create({ data: { id: prefix+'user', email: prefix+'@example.invalid', name: 'Test editor', password: 'unused' } })
  const a = await prisma.project.create({ data: { id: prefix+'a', title: prefix+'A', status: 'DEVELOPING', logline: 'Keep logline', nextAction: 'Old next step', classification: 'REFERENCE' } })
  const b = await prisma.project.create({ data: { id: prefix+'b', title: prefix+'B', status: 'DEVELOPING', classification: 'REFERENCE' } })
  const writer = await prisma.contact.create({ data: { id: prefix+'writer', name: 'Editor writer', type: 'WRITER' } })
  const considered = await prisma.contact.create({ data: { id: prefix+'considered', name: 'Considered writer', type: 'WRITER' } })
  await prisma.projectContact.create({ data: { projectId: a.id, contactId: considered.id, role: 'CONSIDERED_WRITER' } })
  const free = await prisma.ipProperty.create({ data: { id: prefix+'free', title: 'Free IP', type: 'BOOK' } })
  const other = await prisma.ipProperty.create({ data: { id: prefix+'other', title: 'Other IP', type: 'BOOK', projectId: b.id } })
  const snapshot = async () => prisma.project.findUniqueOrThrow({ where: { id: a.id }, select: developmentSelect })
  const body = async () => ({ version: developmentVersion(await snapshot()), status: 'PACKAGING', currentStage: 'Pitch deck polish', nextAction: 'Meet buyer', writerIds: [writer.id], ipIds: [free.id] })
  const first = await body()
  await saveProjectDevelopment(a.id, first, user.id)
  let current = await snapshot()
  assert.equal(current.status, 'PACKAGING'); assert.equal(current.currentStage, 'Pitch deck polish'); assert.equal(current.nextAction, 'Meet buyer')
  assert.deepEqual(current.contacts.map(c => c.contactId), [writer.id]); assert.deepEqual(current.ipProperties.map(p => p.id), [free.id])
  assert(await prisma.projectContact.findFirst({ where: { projectId: a.id, contactId: considered.id, role: 'CONSIDERED_WRITER' } }))
  assert.equal((await prisma.project.findUniqueOrThrow({ where: { id: a.id } })).logline, 'Keep logline')
  const linkedBefore = await prisma.ipProperty.findUniqueOrThrow({ where: { id: free.id } })
  await saveProjectDevelopment(a.id, { ...await body(), currentStage: 'Only stage changes' }, user.id)
  assert.deepEqual(await prisma.ipProperty.findUniqueOrThrow({ where: { id: free.id } }), linkedBefore, 'unchanged IP must not be touched')
  await assert.rejects(saveProjectDevelopment(a.id, first, user.id), (e: unknown) => e instanceof DevelopmentEditError && e.status === 409)
  const beforeRejected = await snapshot()
  await assert.rejects(saveProjectDevelopment(a.id, { ...await body(), ipIds: [other.id] }, user.id), (e: unknown) => e instanceof DevelopmentEditError && e.status === 409)
  assert.deepEqual(await snapshot(), beforeRejected)
  assert.deepEqual(await prisma.ipProperty.findUniqueOrThrow({ where: { id: other.id } }), other)
  // All ordinary statuses remain editable, including every non-slate lifecycle stage.
  const orderBefore = await prisma.dashboardDevelopmentOrder.findMany()
  const readingBefore = await prisma.project.findUniqueOrThrow({ where: { id: a.id }, select: { classification: true, readState: true, firstReadAt: true, verdict: true } })
  for (const status of Object.values(ProjectStatus).filter(s => !READING_DECISION_STATUSES.includes(s))) {
    await saveProjectDevelopment(a.id, { ...await body(), status, nextAction: `Next step for ${status}` }, user.id)
    assert.equal((await snapshot()).status, status)
    assert.equal((await snapshot()).nextAction, `Next step for ${status}`)
  }
  for (const status of READING_DECISION_STATUSES) {
    const unchanged = await snapshot()
    await assert.rejects(saveProjectDevelopment(a.id, { ...await body(), status }, user.id), (e: unknown) => e instanceof DevelopmentEditError && e.status === 400)
    assert.deepEqual(await snapshot(), unchanged, 'protected entry must not partially save')
    // Synthetic fixture represents a decision made through the dedicated reading workflow.
    await prisma.project.update({ where: { id: a.id }, data: { status } })
    await saveProjectDevelopment(a.id, { ...await body(), status, currentStage: `Stage for ${status}`, nextAction: 'Keep in touch' }, user.id)
    assert.equal((await snapshot()).status, status)
    assert.equal((await snapshot()).currentStage, `Stage for ${status}`)
    const beforeExit = await snapshot()
    await assert.rejects(saveProjectDevelopment(a.id, { ...await body(), status: 'DEVELOPING' }, user.id), (e: unknown) => e instanceof DevelopmentEditError && e.status === 400)
    assert.deepEqual(await snapshot(), beforeExit, 'protected exit must not partially save')
    await prisma.project.update({ where: { id: a.id }, data: { status: 'ON_HOLD' } })
  }
  await assert.rejects(saveProjectDevelopment(a.id, { ...await body(), status: 'BOGUS_STATUS' }, user.id), (e: unknown) => e instanceof DevelopmentEditError && e.status === 400)
  assert.deepEqual(await prisma.project.findUniqueOrThrow({ where: { id: a.id }, select: { classification: true, readState: true, firstReadAt: true, verdict: true } }), readingBefore, 'metadata editor must not fabricate reading decisions')
  assert.deepEqual(await prisma.dashboardDevelopmentOrder.findMany(), orderBefore, 'project edits must not change shared priorities')
  await assert.rejects(saveProjectDevelopment(a.id, { ...await body(), writerIds: ['missing'] }, user.id), (e: unknown) => e instanceof DevelopmentEditError && e.status === 400)
  const concurrent = await body()
  const results = await Promise.allSettled([saveProjectDevelopment(a.id, concurrent, user.id), saveProjectDevelopment(a.id, { ...concurrent, nextAction: 'Concurrent' }, user.id)])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal(results.filter(r => r.status === 'rejected').length, 1)
  await saveProjectDevelopment(a.id, { ...await body(), writerIds: [], ipIds: [] }, user.id)
  current = await snapshot(); assert.equal(current.contacts.length, 0); assert.equal(current.ipProperties.length, 0)
  assert(await prisma.contact.findUnique({ where: { id: writer.id } })); assert(await prisma.ipProperty.findUnique({ where: { id: free.id } }))
  assert(await prisma.projectContact.findFirst({ where: { projectId: a.id, contactId: considered.id, role: 'CONSIDERED_WRITER' } }))
  console.log('PASS project development: atomic persistence, optimistic/concurrent conflict, malformed input, unknown contact, all ordinary statuses, protected-status metadata edits and transition guards, invalid-status rejection, reading-history and dashboard-order preservation, other-project IP protection, untouched linked-IP fields, non-WRITER preservation, unlink without record deletion')
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => {
  if (new URL(process.env.DATABASE_URL!).hostname === 'localhost' && new URL(process.env.DATABASE_URL!).pathname === '/hawco_dashboard_order_dev_20261112') {
    await prisma.activityLog.deleteMany({ where: { userId: prefix+'user' } })
    await prisma.ipProperty.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.project.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.contact.deleteMany({ where: { id: { startsWith: prefix } } })
    await prisma.user.deleteMany({ where: { id: prefix+'user' } })
  }
  await prisma.$disconnect()
})
