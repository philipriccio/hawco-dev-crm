import assert from 'node:assert/strict'
import { getAgreement, searchPages, validPage, validDocument } from '../src/lib/wgc-library'
async function main() {
 const docs=await Promise.all([getAgreement('ipa'),getAgreement('rates')])
 assert.deepEqual(docs.map(d=>d.pages.length),[258,8])
 assert.equal(searchPages(docs,'C101').results[0].page,71)
 assert.equal(searchPages(docs,'B113').results[0].page,62)
 assert.deepEqual(searchPages(docs,'ARTIFICIAL INTELLIGENCE'),searchPages(docs,'artificial-intelligence'))
 assert.ok(searchPages(docs,'pilot script').total>0)
 assert.equal(searchPages(docs,'asdfnonexistent').total,0)
 assert.equal(searchPages(docs,'').total,0)
 assert.equal(searchPages(docs,'x'.repeat(161)).total,0)
 assert.equal(validDocument('../ipa'),false)
 assert.equal(validDocument('constructor'),false)
 for(const p of ['0','-1','259','1.5','../1','01'])assert.equal(validPage(p,258),false)
 assert.equal(validPage('258',258),true)
 assert.equal(validPage('8',8),true)
 assert.equal(validPage('9',8),false)
 assert.ok(searchPages(docs,'writer').results.length<=20)
 // Behavioral relevance checks use independently inspected operative PDF pages.
 const top=(query:string)=>searchPages(docs,query).results.slice(0,5).map(r=>`${r.id}:${r.page}`)
 for(const query of ['minimum fee one hour pilot','What is the lowest pay for a 60 minute pilot?','What should I pay for a one-hour first episode?','minimun fee piolt']) {
  assert.deepEqual(top(query).slice(0,3),['ipa:81','ipa:82','rates:2'],query)
  const guide=searchPages(docs,query).guide!
  assert.match(guide.text,/150%/);assert.match(guide.text,/C402 and C403/);assert.match(guide.text,/82,000/)
  assert.doesNotMatch(guide.text,/21,088|31,632/,'no unqualified computed rate')
 }
 for(const [query,expected] of [
  ['payment schedule and late payment','ipa:50'],['when do I get paid','ipa:49'],
  ['production fee vs distribution royalties','ipa:105'],['shared writing credits','ipa:39'],
  ['written by vs teleplay by','ipa:37'],['story by credit','ipa:38'],['created by credit','ipa:62'],
  ['credit arbitration','ipa:42'],['credit position and size','ipa:39'],['TV script fees','ipa:82'],
  ['what do creators get for later episodes','ipa:62'],['how much for a rewrite','ipa:82'],
  ['renew an option','ipa:69'],['writer pension and insurance','ipa:58'],
  ['feature film minimum','ipa:71'],['animated script fees','ipa:135'],['who gets credit','ipa:36'],
  ['rewrite a half hour episode','ipa:83'],['insurence contributions','ipa:58'],
 ])assert.ok(top(query).includes(expected),query+' should find '+expected)
 for(const query of ['minimum fee banana spaceship','weather tomorrow','the and how','zzzxxyy','constructor'])assert.equal(searchPages(docs,query).total,0,query)
 for(const id of ['ipa','rates']) {
  const filtered=searchPages(docs.filter(d=>d.id===id),'minimum fee one hour pilot')
  assert.ok(filtered.results.length>0)
  assert.ok(filtered.results.every(r=>r.id===id))
  assert.ok(!filtered.guide || filtered.guide.sources.every(s=>s.id===id))
 }
 assert.equal(searchPages(docs,'animated pilot fees').guide,null,'never apply live-action pilot guide to animation')
 assert.equal(searchPages(docs,'feature pilot fees').guide,null,'ambiguous production type is not resolved silently')
 assert.match(searchPages(docs,'created by credit').guide!.text,/does not establish an automatic entitlement/)
 assert.equal(searchPages(docs,'Article B113').results[0].page,62)
 assert.equal(searchPages(docs,'C9999').total,0,'unknown article is not fuzzy matched')
 assert.deepEqual(searchPages(docs,'writer',20).results,searchPages(docs,'writer',20).results)
 assert.notDeepEqual(searchPages(docs,'writer',0).results,searchPages(docs,'writer',20).results)
 console.log('PASS WGC source search, operative clause ranking, normalization, boundaries and allowlist')
}
main().catch(e=>{console.error(e);process.exit(1)})
