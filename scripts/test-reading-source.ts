import assert from 'node:assert/strict'
import { isWebsiteUnsolicited, readingSourceWhere } from '../src/lib/reading-source'
import { validateIntake } from '../src/lib/material-intake'

const fixtures = [
  { project: { websiteUnsolicited: true, notes: 'Requested later', origin: 'INTERNAL' } },
  { project: { websiteUnsolicited: false, notes: 'Website, not unsolicited', origin: 'EXTERNAL' } },
  { project: { websiteUnsolicited: false, notes: 'unsolicited website intake' } },
  { project: null }, {},
]
assert.deepEqual(fixtures.filter(isWebsiteUnsolicited), [fixtures[0]])
assert.equal(fixtures.filter(m => !isWebsiteUnsolicited(m)).length, 4)
assert.deepEqual(readingSourceWhere(''), {})
assert.deepEqual(readingSourceWhere('website-unsolicited'), { project: { is: { websiteUnsolicited: true } } })
assert.deepEqual(readingSourceWhere('main'), { OR: [{ project: { is: null } }, { project: { is: { websiteUnsolicited: false } } }] })
const intake = {title:'Test',type:'PILOT_SCRIPT',fileUrl:'https://example.test/script.pdf',createProject:true}
assert.equal(validateIntake({...intake,websiteUnsolicited:true}).websiteUnsolicited,true)
assert.equal(validateIntake({...intake,websiteUnsolicited:false}).websiteUnsolicited,false)
assert.equal('websiteUnsolicited' in validateIntake(intake),false, 'Existing intake fingerprint remains unchanged when flag omitted')
for (const value of ['true',null,1,{}]) assert.throws(()=>validateIntake({...intake,websiteUnsolicited:value}),/Invalid website/)
assert.throws(()=>validateIntake({...intake,createProject:false,projectId:'existing',websiteUnsolicited:true}),/existing project/)
console.log('PASS reading-source explicit classification, null/orphan partition, where predicates, validation and legacy fingerprint compatibility')
