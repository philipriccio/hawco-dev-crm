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
 console.log('PASS WGC source search, operative clause ranking, normalization, boundaries and allowlist')
}
main().catch(e=>{console.error(e);process.exit(1)})
