/** Behavioral tests with an isolated in-memory transaction adapter; never connects to a DB. */
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { createMaterialIntake, validateIntake } from '../src/lib/material-intake'
import { explicitReadAt } from '../src/lib/material-reading'
import { materialSourceLabel } from '../src/lib/material-source'

type Row = Record<string, any>
class MemoryDB {
  state: Record<string, Row[]> = { project: [], contact: [], material: [], projectContact: [] }
  failAt = ''
  sequence = 0
  get material() { return this.adapter(this.state).material }
  adapter(state: Record<string, Row[]>) {
    return Object.fromEntries(Object.keys(state).map(table => [table, {
      findUnique: async ({ where }: any) => state[table].find(row => Object.entries(where).every(([key,value]) => row[key] === value)) ?? null,
      create: async ({ data }: any) => {
        if (this.failAt === table) throw new Error(`Injected ${table} failure`)
        const row = { id: `${table}-${++this.sequence}`, firstReadAt: null, ...data }
        state[table].push(row)
        return row
      },
      updateMany: async ({ where, data }: any) => {
        if (this.failAt === `${table}.update`) throw new Error('Injected update failure')
        state[table].filter(row => Object.entries(where).every(([key,value]) => row[key] === value)).forEach(row => Object.assign(row,data))
      },
      upsert: async ({ create }: any) => {
        if (this.failAt === table) throw new Error('Injected linkage failure')
        const old = state[table].find(row => row.projectId === create.projectId && row.contactId === create.contactId && row.role === create.role)
        if (!old) state[table].push(create)
      },
    }])) as any
  }
  async $transaction(fn: any) {
    const draft = structuredClone(this.state)
    const result = await fn(this.adapter(draft))
    this.state = draft
    return result
  }
}
const request = { type: 'PILOT_SCRIPT', title: 'Intake test', fileUrl: 'https://mail.google.com/mail/u/0/#all/example', createProject: true,
  newWriter: { name: 'Test writer' }, markAsRead: true, intakeKey: 'unit-test-intake-key-01' }
async function run() {
  for (const failAt of ['project', 'contact', 'material', 'projectContact', 'project.update']) {
    const db = new MemoryDB(); db.failAt = failAt
    await assert.rejects(createMaterialIntake(db as unknown as PrismaClient, request), /Injected/)
    assert.deepEqual(Object.values(db.state).map(rows => rows.length), [0,0,0,0], `rollback at ${failAt}`)
    db.failAt = ''
    const first = await createMaterialIntake(db as unknown as PrismaClient, request)
    const second = await createMaterialIntake(db as unknown as PrismaClient, request)
    assert.equal(second.material.id, first.material.id)
    assert.equal(second.replayed,true)
    assert.deepEqual(Object.values(db.state).map(rows => rows.length), [1,1,1,1])
    assert.ok(first.material.readAt)
    assert.equal(db.state.project[0].status,'SUBMITTED')
    await assert.rejects(createMaterialIntake(db as unknown as PrismaClient, {...request,title:'Changed'}), /different details/)
  }
  for (const markAsRead of [true,false]) {
    const db = new MemoryDB()
    db.state.project.push({id:'existing',status:'EARLY_DEVELOPMENT',firstReadAt:null})
    const result = await createMaterialIntake(db as unknown as PrismaClient, {...request,createProject:false,projectId:'existing',markAsRead})
    assert.equal(Boolean(result.material.readAt),markAsRead)
    assert.equal(db.state.project[0].status,'EARLY_DEVELOPMENT')
  }
  assert.throws(() => validateIntake({...request,fileUrl:'javascript:alert(1)'}), /HTTPS/)
  assert.equal(validateIntake({...request,fileUrl:'/api/files/materials/test-file.txt'}).fileUrl,'/api/files/materials/test-file.txt')
  assert.throws(() => validateIntake({...request,fileUrl:'/api/files/../secret'}), /HTTPS/)
  assert.throws(() => validateIntake({...request,type:'NOPE'}), /type/)
  assert.throws(() => validateIntake({...request,fileSize:-1}), /size/)
  const readDate = new Date('2026-01-01T00:00:00Z')
  assert.equal(explicitReadAt(undefined,null),undefined)
  assert.equal(explicitReadAt('PASSED',null),undefined)
  assert.equal(explicitReadAt(true,readDate),readDate)
  assert.equal(explicitReadAt(false,readDate),null)
  assert.equal(materialSourceLabel(request.fileUrl),'Open source email')
  assert.equal(materialSourceLabel('https://drive.google.com/file/d/x'),'Open Drive reference')
  console.log('PASS: intake rollback at five failure points, replay/conflict, existing/new project reading, validation, source labels (in-memory adapter)')
}
run().catch(error => { console.error(error); process.exitCode=1 })
