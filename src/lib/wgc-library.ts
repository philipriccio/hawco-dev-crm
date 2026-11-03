import fs from 'node:fs/promises'
import path from 'node:path'
export type AgreementPage = { page: number; printedPage: string | null; text: string }
export type Agreement = { id: string; title: string; version: string; filename: string; sha256: string; pageCount: number; source: string; officialUrl: string; pages: AgreementPage[] }
export const WGC_IDS = ['ipa', 'rates'] as const
export function validDocument(id: string) { return WGC_IDS.some(value => value === id) }
export function validPage(value: string | null, count: number) { return value !== null && /^[1-9]\d{0,2}$/.test(value) && Number(value) <= count }
const loaded = new Map<string, Promise<Agreement>>()
export function getAgreement(id: string): Promise<Agreement> {
  if (!validDocument(id)) throw new Error('Unknown document')
  let doc = loaded.get(id)
  if (!doc) { doc = fs.readFile(path.join(process.cwd(), 'private/wgc', id, 'index.json'), 'utf8').then(text => JSON.parse(text)); loaded.set(id, doc!); doc!.catch(() => loaded.delete(id)) }
  return doc!
}
export function normalize(text: string) { return text.normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() }
// Domain-aware retrieval runs locally: no generated answers or external model calls.
const stopWords = new Set('a an and are as at be by can could do does for from how i if in is it me my of on or our please should that the their them there this to up us we what when where which who why will with would you your need know find tell get gets much have has about under than per not vs versus dont doesnt isnt arent wont cant without someone anyone'.split(' '))
const stem = (s: string) => s.length > 4 && s.endsWith('ies') ? s.slice(0,-3)+'y' : s.length > 3 && s.endsWith('s') && !s.endsWith('ss') ? s.slice(0,-1) : s
const concepts: Record<string,string[]> = {
 fee: ['fee','rate','pay','paid','payment','cost','price','compensation','money','remuneration','minimum','lowest','cheapest','earn','salary'],
 pilot: ['pilot','first episode','series premiere'],
 royalty: ['royalty','residual','creator','originating','created','create','invented','concept royalty'],
 option: ['option','optioning','renewal','renew','extend','extension','exclusive right'],
 rewrite: ['rewrite','rewriting','revision','revise','redraft'],
 polish: ['polish','polishing','touch up'],
 benefit: ['benefit','pension','retirement','insurance','health','contribution','deduction'],
 feature: ['feature','movie','film','theatrical'],
 animation: ['animation','animated','cartoon','cartoons'],
 development: ['development','develop','bible','pitch','proposal','concept'],
 credit: ['credit','credited','attribution','screen credit','written by','screenplay by','teleplay by'],
 storyCredit: ['story by','screen story','story credit'],
 sharedCredit: ['shared','shared writing credits','shared credit','share credit','sharing credit','split credit','joint credit','co writer','cowriter','co writers','team credit','ampersand'],
 creditDispute: ['arbitration','arbitrate','credit dispute','dispute credits','challenge credit','contest credit','object to credit','credit objection'],
 creditPlacement: ['credit position','credit size','billing','title card','lettering'],
 creatorCredit: ['created by','creator credit'],
 paymentTiming: ['payment timing','payment schedule','payment stages','instalment','installment','late payment','overdue','interest','when paid','when pay','payment due','due date','on delivery','on signing','defer'],
 productionFee: ['production fee','production payment','budget percentage','share of budget'],
 distribution: ['distribution royalty','distribution royalties','distribution revenue','backend','back end','profit share','profit participation','residual'],
 ai: ['ai','artificial intelligence','generative','chatgpt'],
 termination: ['termination','terminate','fired','cancel','cancellation'],
 television: ['television','tv','drama','episode','episodic','series'],
}
const corrections: Record<string,string> = { minimun:'minimum', minumum:'minimum', mininum:'minimum', piolet:'pilot', piolt:'pilot', royaltie:'royalty', roylaties:'royalty', rewite:'rewrite', rewrites:'rewrite', insurence:'insurance', animaton:'animation', retirment:'retirement' }
function oneEdit(a: string, b: string) {
 if(Math.abs(a.length-b.length)>1)return false
 if(a.length===b.length){const changed=[...a].map((c,i)=>c!==b[i]?i:-1).filter(i=>i>=0);return changed.length===1 || (changed.length===2 && changed[1]===changed[0]+1 && a[changed[0]]===b[changed[1]] && a[changed[1]]===b[changed[0]])}
 const [short,long]=a.length<b.length?[a,b]:[b,a]
 let i=0;while(i<short.length&&short[i]===long[i])i++
 return short.slice(i)===long.slice(i+1)
}
const vocabulary=[...new Set(Object.values(concepts).flat().filter(t=>!t.includes(' ') && t.length>=5))]
function correct(word: string) {
 if(Object.prototype.hasOwnProperty.call(corrections,word))return corrections[word]
 if(word.length<5 || vocabulary.includes(word) || vocabulary.some(v=>stem(v)===stem(word)))return word
 const matches=vocabulary.filter(v=>oneEdit(word,v))
 return matches.length===1?matches[0]:word
}
const routes: Record<string, Array<[string,number]>> = {
 pilot:[['ipa',81],['ipa',82],['rates',2]], royalty:[['ipa',62],['ipa',63]], option:[['ipa',69],['ipa',70]],
 benefit:[['ipa',58],['ipa',59]], feature:[['ipa',71],['ipa',72],['rates',1]],
 animation:[['ipa',123],['ipa',135],['ipa',136]], development:[['ipa',68]], credit:[['ipa',36],['ipa',37]],
 rewrite:[['ipa',82],['ipa',83]], polish:[['ipa',83]],
 television:[['ipa',81],['ipa',82],['rates',2]], creditPlacement:[['ipa',39],['ipa',40]],
 storyCredit:[['ipa',37],['ipa',38]], sharedCredit:[['ipa',38],['ipa',39],['ipa',46]], creditDispute:[['ipa',42],['ipa',43],['ipa',44]],
 creatorCredit:[['ipa',62],['ipa',63],['ipa',38]],
 paymentTiming:[['ipa',49],['ipa',50],['ipa',83],['ipa',84]], productionFee:[['ipa',101],['ipa',102],['ipa',104],['ipa',51]], distribution:[['ipa',105],['ipa',106],['ipa',52]],
}
export type SearchGuide = { title: string; text: string; sources: Array<{id:string;page:number;label:string}> }
function interpret(query: string) {
 const normalized = normalize(query).replace(/\b(one hour|1 hour|1hr|1 hr|1h|60min|sixty minutes|60 min|60 mins|60 minute|hour long)\b/g,'60 minutes').replace(/\b(half hour|half an hour|30min|30 min|30 mins|30 minute)\b/g,'30 minutes')
 const corrected = normalized.split(' ').map(correct)
 const phrase = ' '+corrected.join(' ')+' '
 const topics = Object.keys(concepts).filter(key => concepts[key].some(term => phrase.includes(' '+term+' ') || corrected.map(stem).includes(stem(term))))
 if(/\bwhen\b/.test(phrase) && /\b(pay|paid|payment)\b/.test(phrase) && !topics.includes('paymentTiming'))topics.push('paymentTiming')
 const terms = [...new Set(corrected.filter(w=>w && !stopWords.has(w)).map(stem))]
 return {terms, topics, corrections:corrected.filter((w,i)=>w!==normalized.split(' ')[i]), duration: phrase.includes(' 60 minutes ') ? '60 minutes / one hour' : phrase.includes(' 30 minutes ') ? '30 minutes / half hour' : null}
}
const indexes = new WeakMap<Agreement, Array<{words:Set<string>; normalized:string}>>()
function index(doc: Agreement) {
 let value=indexes.get(doc)
 if(!value){ value=doc.pages.map(p=>({words:new Set(normalize(p.text).split(' ').map(stem)),normalized:normalize(p.text)})); indexes.set(doc,value) }
 return value
}
export function searchPages(docs: Agreement[], query: string, offset = 0) {
 const intent=interpret(query)
 const empty={total:0,results:[] as Array<{id:string;title:string;page:number;printedPage:string|null;excerpt:string;reason:string}>, interpretation:[] as string[], corrections:intent.corrections, guide:null as SearchGuide|null}
 if(!intent.terms.length || query.length>160) return empty
 const clause=normalize(query).replace(/^(article|clause) /,'').replace(/ /g,'').match(/^[a-z]\d{1,4}$/)?.[0]
 const topicNames:Record<string,string>={fee:'fees & minimums',creditPlacement:'credit position & size',storyCredit:'story credit',sharedCredit:'shared writing credits',creditDispute:'credit arbitration',creatorCredit:'creator credit',paymentTiming:'payment timing & stages',productionFee:'production fee',distribution:'distribution royalties / backend'}
 const interpretation=[...intent.topics.map(t=>topicNames[t]||t),...(intent.duration?[intent.duration]:[])]
 const recognized = intent.terms.filter(t=>Object.values(concepts).some(v=>v.some(w=>w.split(' ').map(stem).includes(t))) || ['60','30','minute','hour','writing','write','writer','script'].includes(t))
 // Unknown substantive terms must be found somewhere; do not answer an unrelated
 // question merely because it includes "fee" or another common domain word.
 const unknown=intent.terms.filter(t=>!recognized.includes(t))
 const corpus=docs.flatMap(d=>index(d))
 if(!clause && unknown.some(t=>!corpus.some(p=>p.words.has(t)))) return {...empty,interpretation}
 const activeTopics=intent.topics.filter(t=>routes[t] && !(intent.topics.includes('animation') && ['pilot','rewrite','polish','benefit','feature'].includes(t)) && !(intent.topics.includes('feature') && ['rewrite','polish'].includes(t)) && !(t==='royalty' && intent.topics.includes('distribution')) && !(t==='television' && intent.topics.some(topic=>routes[topic] && topic!=='television')))
 const guide: SearchGuide|null = !clause && intent.topics.includes('pilot') && !intent.topics.includes('animation') && !intent.topics.includes('feature') && docs.some(d=>d.id==='ipa') ? {
  title:'Pilot fee: start with the pilot rule, then the applicable script fee',
  text:'For television covered by C4, C401 sets a pilot of up to 60 minutes at at least 150% of the applicable script fee—not the ordinary episode fee. C402 and C403 describe different writing engagements, so choose the applicable row and rate-date column before calculating. The C4 introduction makes fees negotiable for production budgets of $82,000 or less. C401 also has a separate production-fee provision for a sole credited writer. These are reading directions, not a determination of your contract.',
  sources:[{id:'ipa',page:81,label:'C401 · pilot rule & budget exception'},{id:'ipa',page:82,label:'C402–C403 · engagement types & dated rates'},...(docs.some(d=>d.id==='rates')?[{id:'rates',page:2,label:'Final rate sheet · television tables'}]:[])],
 } : intent.topics.some(t=>['credit','storyCredit','sharedCredit','creditDispute','creatorCredit'].includes(t)) && !intent.topics.includes('animation') && docs.some(d=>d.id==='ipa') ? {
  title:'Credits: check the form, contribution and agreement process',
  text:'Start with A9 for permitted writing and subsidiary credit forms, shared credits and the objection/arbitration process. For originating a series, also read B113: its payment and credit provisions are distinct from ordinary script credit. A label such as “created by” in your question does not establish an automatic entitlement to that exact wording.',
  sources:[{id:'ipa',page:36,label:'A901–A903 · writing credit framework'},{id:'ipa',page:37,label:'A904–A905 · television / subsidiary credits'},{id:'ipa',page:38,label:'A905–A912 · story credits & permitted forms'},{id:'ipa',page:42,label:'A925–A929 · objections & arbitration'},{id:'ipa',page:62,label:'B113 · originating a series'}],
 } : null
 const frequency=new Map(intent.terms.map(t=>[t,corpus.filter(p=>p.words.has(t)).length]))
 const scored=docs.flatMap(doc=>doc.pages.map((page,i)=>{
  const ix=index(doc)[i]
  const exact=intent.terms.filter(t=>ix.words.has(t))
  let score=exact.reduce((n,t)=>n+Math.log(1+corpus.length/(1+(frequency.get(t)||0))),0)
  let reason='Related source wording'
  const route=[...activeTopics].reverse().find(t=>routes[t].some(([id,p])=>id===doc.id&&p===page.page))
  const matchesClause=clause && new RegExp('(?:^|[^a-z0-9])'+clause+'(?:[^a-z0-9]|$)','i').test(page.text)
  if(clause){
   if(!matchesClause) return null
   score+=new RegExp('(?:^|\\n)\\s*'+clause+'[ \t]','i').test(page.text)?200:40
   reason='Article '+clause.toUpperCase()
  } else {
   for(const topic of intent.topics) if(concepts[topic].some(t=>ix.normalized.includes(t))) score+=2
   if(route){ score+=['creditPlacement','storyCredit','sharedCredit','creditDispute','creatorCredit','paymentTiming','productionFee','distribution'].includes(route)?40:25; reason='Related '+(topicNames[route]||route)+' provisions (may continue across pages)' }
   const specific=intent.topics.filter(t=>!['fee','television','feature'].includes(t))
   if(!route && specific.length && !specific.some(t=>concepts[t].some(word=>ix.normalized.includes(word))))return null
   const minimum=Math.min(intent.terms.length,Math.max(1,Math.ceil(intent.terms.length*.35)))
   if(!route && exact.length<minimum) return null
   if(!route && exact.length===0) return null
   if(!route && unknown.length && !unknown.some(t=>ix.words.has(t))) return null
  }
  if(doc.id==='ipa' && page.page>=224) score-=45
  if(doc.id==='ipa' && page.page>=123 && page.page<=150 && !intent.topics.includes('animation')) score-=8
  if(intent.topics.includes('animation') && doc.id==='ipa' && page.page<123) score-=25
  const term=intent.terms.find(t=>normalize(page.text).includes(t))
  const start=Math.max(0,term?page.text.toLowerCase().indexOf(term)-90:0)
  return {id:doc.id,title:doc.title,page:page.page,printedPage:page.printedPage,excerpt:`${start?'…':''}${page.text.slice(start,start+440)}${start+440<page.text.length?'…':''}`,reason,score}
 }).filter((r):r is NonNullable<typeof r>=>r!==null))
 scored.sort((a,b)=>b.score-a.score || a.page-b.page)
 // Keep explicitly linked rule/rate pages together, ahead of incidental wording.
 if(!clause && guide && intent.topics.includes('pilot')) scored.sort((a,b)=>{
  const rank=(r:typeof a)=>{const i=guide.sources.findIndex(s=>s.id===r.id&&s.page===r.page);return i<0?100:i}
  return rank(a)-rank(b) || b.score-a.score || a.page-b.page
 })
 const safeOffset=Number.isSafeInteger(offset)&&offset>=0?offset:0
 return {total:scored.length,results:scored.slice(safeOffset,safeOffset+20).map(r=>({id:r.id,title:r.title,page:r.page,printedPage:r.printedPage,excerpt:r.excerpt,reason:r.reason})),interpretation,corrections:intent.corrections,guide}
}
