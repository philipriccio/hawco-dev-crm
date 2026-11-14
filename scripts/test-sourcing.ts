import assert from 'node:assert/strict'
import { leadInput, identity, date, url, version } from '../src/lib/sourcing/domain'
const valid = {title:'A New Story', creator:'An Author',kind:'BOOK',sourceChannel:'Publisher catalogue',sourceUrl:'https://example.invalid/books/story',sourceDate:'2026-11-12'}
assert.equal(leadInput(valid).rightsStatus,'UNKNOWN')
assert.equal(leadInput(valid).basis,'DESCRIPTION_ONLY')
for(const bad of [{...valid,decision:'PURSUING'},{...valid,readState:'READ'},{...valid,rightsStatus:'CONFIRMED_AVAILABLE'},{...valid,rightsStatus:'REPRESENTED',rightsEvidence:'Agent page'},{...valid,kind:'NOVEL'},{...valid,title:''}]) assert.throws(()=>leadInput(bad))
assert.equal(leadInput({...valid,rightsStatus:'REPRESENTED',rightsEvidence:'Agency roster, screen rights not established',rightsCheckedOn:'2026-11-12'}).rightsStatus,'REPRESENTED')
for(const s of ['2026-02-30','2026-13-01','2026-00-01','yesterday']) assert.throws(()=>date(s,'date'))
for(const s of ['javascript:alert(1)','data:text/html,x','https://user:password@example.invalid']) assert.throws(()=>url(s))
assert.equal(identity('BOOK','Été: story!','A. Writer'),identity('BOOK','ete story','A Writer'))
assert.notEqual(identity('BOOK','Story','Writer A'),identity('BOOK','Story','Writer B'))
for(const x of [-1,0.5,'1',null]) assert.throws(()=>version(x))
console.log('PASS input limits, allowlists, safe URLs, calendar dates, conservative identity, unknown rights defaults, prohibited decision/read writes')

import { visibilityFilter } from '../src/lib/sourcing/domain'
assert.deepEqual(visibilityFilter(), {dismissedAt:null})
assert.deepEqual(visibilityFilter('all'), {})
assert.deepEqual(visibilityFilter('cleared'), {dismissedAt:{not:null}})
assert.throws(()=>visibilityFilter('deleted'))
