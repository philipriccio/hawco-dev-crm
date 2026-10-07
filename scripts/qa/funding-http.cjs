const assert = require('node:assert/strict')
const fs = require('node:fs')
const state = JSON.parse(fs.readFileSync('/tmp/hawco-improvements-qa/browser-state.json','utf8'))
const headers = { Cookie: state.cookies.map(c=>`${c.name}=${c.value}`).join('; '), 'Content-Type':'application/json' }
const origin = 'http://127.0.0.1:3109'
async function req(method, body, status=200) {
 const response = await fetch(origin+'/api/funding-deadlines',{method,headers,body:body?JSON.stringify(body):undefined})
 const data=await response.json(); assert.equal(response.status,status,JSON.stringify(data)); return data
}
async function main(){
 const runId = Date.now()
 await req('POST',{program:'Invalid calendar date',closingDate:'2026-02-30'},400)
 const tentative=await req('POST',{program:'QA Development Fund '+runId,funder:'Synthetic agency',round:'Winter round',closingDate:'2026-12-15',sourceUrl:'https://example.test/funding'},201)
 assert.equal(tentative.status,'TENTATIVE')
 const earlier=await req('POST',{program:'QA Production Fund '+runId,round:'Fall round',closingDate:'2026-10-20',status:'CONFIRMED'},201)
 let records=await req('GET'); assert(records.find(x=>x.id===earlier.id)); assert(records.findIndex(x=>x.id===earlier.id)<records.findIndex(x=>x.id===tentative.id))
 await req('PATCH',{id:earlier.id,closingDate:'2026-10-25'})
 let page=await (await fetch(origin,{headers})).text()
 assert(page.includes('Funding Deadlines') && page.includes('Rights Expiries'))
 assert(page.includes(earlier.program)); assert(page.includes('No rights expiry dates recorded'))
 await req('PATCH',{id:earlier.id,archived:true})
 page=await (await fetch(origin,{headers})).text(); assert(!page.includes(earlier.program))
 await req('PATCH',{id:earlier.id,archived:false})
 const { projectId } = JSON.parse(fs.readFileSync('/tmp/hawco-improvements-qa/fixtures.json','utf8'))
 const setExpiry = async value => { const response = await fetch(origin+'/api/projects/'+projectId,{method:'PATCH',headers,body:JSON.stringify({optionExpiryDate:value})}); assert.equal(response.status,200) }
 try {
   await setExpiry('2026-12-01')
   const withExpiry=await (await fetch(origin,{headers})).text()
   assert(withExpiry.includes('Project option') && withExpiry.includes('days remaining'))
 } finally { await setExpiry(null) }
 const badAuth=await fetch(origin+'/api/funding-deadlines',{headers:{Cookie:'auth-token=invalid'},redirect:'manual'});assert.equal(badAuth.status,401)
 await req('PATCH',{id:earlier.id,archived:true}); await req('PATCH',{id:tentative.id,archived:true})
 console.log('PASS: real funding HTTP/DB create, tentative default, calendar validation, ordering, update, archive/restore, separate Today cards, empty rights/no invented clock, unauthorized rejection. Synthetic programs only.')
 fs.writeFileSync('/tmp/hawco-improvements-qa/funding-fixtures.json',JSON.stringify({tentative:tentative.id,earlier:earlier.id}))
}
main().catch(e=>{console.error(e.message);process.exit(1)})
