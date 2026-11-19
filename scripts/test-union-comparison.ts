import assert from 'node:assert/strict'
import { getAgreement } from '../src/lib/wgc-library'
import { comparisonRows, comparisonLength, tvRates, otherComparisonRows } from '../src/lib/union-comparison'
async function main(){
 assert.equal(comparisonLength('garbage'),60)
 for(const length of [30,60] as const){
  const r=tvRates[length]
  assert.equal(r.script*1.5,length===30?15819:31632)
  assert.equal(r.wgaScript*1.5,length===30?48405:71190)
  assert.equal(r.supplied*1.5,length===30?13176:26359.5)
  const ipa82=(await getAgreement('ipa')).pages[81].text
  const ipa83=(await getAgreement('ipa')).pages[82].text
  const wga13=(await getAgreement('wga-rates')).pages[12].text
  const wga22=(await getAgreement('wga-rates')).pages[21].text
  for(const amount of [r.script,r.supplied,r.story])assert.ok(ipa82.includes(amount.toLocaleString('en-CA')))
  for(const amount of [r.rewrite,r.polish])assert.ok(ipa83.includes(amount.toLocaleString('en-CA')))
  for(const amount of [r.wgaScript,r.wgaTeleplay,r.wgaStory])assert.ok(wga13.includes(amount.toLocaleString('en-CA')))
  for(const amount of [r.wgaRewrite,r.wgaPolish])assert.ok(wga22.includes(amount.toLocaleString('en-CA')))
  for(const row of [...comparisonRows(length),...otherComparisonRows])for(const s of row.sources)assert.ok((await getAgreement(s.id)).pages[s.page-1].text.length>0)
 }
 const options=otherComparisonRows.find(r=>r.title==='TV material option')!
 assert.equal(options.wgc.status,'Conditional');assert.ok(options.wga.detail.includes('180'))
 assert.ok(otherComparisonRows.find(r=>r.title==='Concept / series bible')!.wgc.status==='Negotiated')
 console.log('PASS numeric minimums, pilot calculations, source references, length validation and applicability distinctions')
}
main().catch(e=>{console.error(e);process.exit(1)})
