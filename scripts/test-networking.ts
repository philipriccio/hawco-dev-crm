import assert from 'node:assert/strict'
import { assertHawcoSource,datedMeetingNotes,contactMatch,quietState,fingerprint } from '../src/lib/networking-domain'
assert.equal(datedMeetingNotes('2026-02-10 - Met online\n2026-02-31 - Met online\n2026-02 - Met online\n2026-02-10 - Meeting scheduled\n2026-02-10 - Did not meet').length,1)
assert.equal(datedMeetingNotes('2026-02-10 - Met online')[0].datePrecision,'DAY')
assert.equal(datedMeetingNotes('2099-02-10 - Met online\n2026-02-10 - Met online (cancelled)').length,0)
assert.equal(contactMatch('Name <a@example.invalid>',[{id:'a',email:'A@example.invalid'}]),'a')
assert.equal(contactMatch('a@example.invalid',[{id:'a',email:'a@example.invalid'},{id:'b',email:'a@example.invalid'}]),null)
assert.equal(contactMatch('unknown@example.invalid',[]),null)
assert.equal(quietState(null,56).quiet,false)
assert.equal(quietState(new Date('2026-01-01'),56,new Date('2026-03-01')).quiet,true)
assert.throws(()=>assertHawcoSource('owner','primary'))
process.env.HAWCO_CALENDAR_ID='hawco-calendar';process.env.HAWCO_CALENDAR_OWNER_ID='owner'
assert.doesNotThrow(()=>assertHawcoSource('owner','hawco-calendar'))
assert.throws(()=>assertHawcoSource('owner','company-calendar'))
assert.throws(()=>assertHawcoSource('other','hawco-calendar'))
assert.equal(fingerprint({a:1}),fingerprint({a:1}))
console.log('Networking domain: 13 assertions passed')
