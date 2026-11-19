import assert from 'node:assert/strict'
import { getAgreement, UNION_IDS, validDocument, searchPages } from '../src/lib/wgc-library'
import { searchUnion, comparisonQuestions } from '../src/lib/union-library'
async function main() {
 const docs=await Promise.all(UNION_IDS.map(getAgreement))
 for(const d of docs){assert.equal(d.pages.length,d.pageCount);assert.ok(d.sha256.length===64);assert.ok(validDocument(d.id))}
 assert.equal(searchPages(docs.filter(d=>d.id==='ipa'),'B2').results[0].page,68)
 for(const q of ['WGA minimum','WGA pilot fees','WGA credits','WGA residuals']){const r=searchUnion(docs,q);assert.ok(r.total,q);assert.ok(r.results.every(x=>x.id.startsWith('wga-')),q);assert.equal(r.guide,null)}
 for(const q of comparisonQuestions){const r=searchUnion(docs,q);assert.ok(r.guide,q);assert.ok(r.results.some(x=>x.id.startsWith('wga-')),q);assert.ok(r.results.some(x=>x.id==='ipa'),q);for(const s of r.guide!.sources)assert.ok(docs.find(d=>d.id===s.id)?.pages[s.page-1])}
 for(const only of ['wga','wgc']){const r=searchUnion(docs.filter(d=>(d.id.startsWith('wga-')?'wga':'wgc')===only),'minimum fee');assert.ok(r.results.length);assert.ok(r.results.every(d=>(d.id.startsWith('wga-')?'wga':'wgc')===only))}
 assert.equal(searchUnion(docs,'WGA minimum fee banana spaceship').total,0)
 assert.ok(searchUnion(docs,'WGA minimum').results.slice(0,5).some(r=>r.id==='wga-moa'||r.id==='wga-rates'))
 console.log('PASS union sources, guild isolation, comparison citations, current amendments, no-match and B2')
}
main().catch(e=>{console.error(e);process.exit(1)})
