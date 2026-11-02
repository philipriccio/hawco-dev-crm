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
export function searchPages(docs: Agreement[], query: string, offset = 0) {
  const terms = normalize(query).split(' ').filter(Boolean)
  if (!terms.length || query.length > 160) return { total: 0, results: [] }
  const results = docs.flatMap(doc => doc.pages.filter(page => {
    const words = ` ${normalize(page.text)} `
    return terms.every(term => words.includes(` ${term} `))
  }).map(page => {
    const lower = page.text.toLowerCase(); const first = lower.indexOf(terms[0]); const start = Math.max(0, first - 110)
    return { id: doc.id, title: doc.title, page: page.page, printedPage: page.printedPage, excerpt: `${start ? '…' : ''}${page.text.slice(start, start + 440)}${start + 440 < page.text.length ? '…' : ''}` }
  }))
  const clause = /^[a-z]\d{3,4}$/.test(terms.join('')) ? terms.join('') : null
  if (clause) results.sort((a,b) => {
    const score = (r: typeof a) => { const text = docs.find(d => d.id === r.id)!.pages[r.page-1].text; return (new RegExp('(?:^|\\n)'+clause+'[ \t]','i').test(text) ? 100 : 0) - (r.id === 'ipa' && r.page >= 224 ? 200 : 0) }
    return score(b)-score(a) || a.page-b.page
  })
  return { total: results.length, results: results.slice(offset, offset + 20) }
}
