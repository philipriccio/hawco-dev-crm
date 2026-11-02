import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getAgreement, searchPages, validDocument, validPage } from '@/lib/wgc-library'
import SourcePage from '@/components/wgc/SourcePage'
export const dynamic = 'force-dynamic'
const topics = [
  ['Originating-writer royalties', 'B113', 62], ['Development & concept work', 'B2', 68], ['Options', 'B3', 69],
  ['Theatrical films', 'C101', 71], ['TV movies & mini-series', 'C3', 79], ['TV series & pilots', 'C4', 81], ['Animation (separate section)', 'ANIMATION SECTION', 123],
] as const
export default async function UnionCheatSheetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  try { await requireAuth() } catch { redirect('/login') }
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : ''
  const query = value('q').slice(0, 161); const filter = validDocument(value('filter')) ? value('filter') : ''
  let docs
  try { docs = await Promise.all([getAgreement('ipa'), getAgreement('rates')]) } catch {
    return <main className="p-8"><h1 className="text-3xl">WGC agreement library</h1><p role="alert" className="mt-4">The agreement library is temporarily unavailable. Please reload to retry.</p></main>
  }
  const doc = docs.find(d => d.id === value('doc')) || docs[0]
  const pageNumber = validPage(value('page'), doc.pageCount) ? Number(value('page')) : 1
  const page = doc.pages[pageNumber - 1]
  const offset = /^\d{1,4}$/.test(value('offset')) ? Number(value('offset')) : 0
  const search = searchPages(filter ? docs.filter(d => d.id === filter) : docs, query, offset)
  const url = (extra: Record<string, string | number>) => `/union-cheat-sheet?${new URLSearchParams({ q: query, filter, doc: doc.id, page: String(pageNumber), ...Object.fromEntries(Object.entries(extra).map(([k,v]) => [k,String(v)])) })}`
  return <div className="p-4 md:p-8 bg-[#f6f4ee] min-h-full text-slate-800">
    <header className="max-w-6xl mx-auto mb-7"><p className="text-xs uppercase tracking-widest text-slate-500">Business tools / Union Cheat Sheet</p><h1 className="text-3xl md:text-4xl font-serif mt-3">WGC agreement library</h1><p className="mt-3 max-w-3xl text-sm text-slate-600">The complete Canadian writers’ agreement and final rate sheet, with searchable source text and page-accurate originals. English-language WGC only.</p></header>
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="bg-white rounded-xl border p-4 md:p-6" aria-label="Search agreements">
        <form className="flex flex-wrap gap-3 items-end" action="/union-cheat-sheet">
          <div className="flex-1 min-w-0 basis-64"><label htmlFor="query" className="block font-semibold text-sm mb-2">Find a clause or topic</label><input id="query" name="q" defaultValue={query} maxLength={160} placeholder="Try B113, pilot, or artificial intelligence" className="w-full border rounded-lg p-3" /></div>
          <div><label htmlFor="filter" className="block text-sm mb-2">Search in</label><select id="filter" name="filter" defaultValue={filter} className="border rounded-lg p-3 max-w-full"><option value="">Both documents</option><option value="ipa">Full agreement</option><option value="rates">Rate sheet</option></select></div>
          <button className="rounded-lg bg-[#14283c] text-white px-5 py-3">Search</button><Link href="/union-cheat-sheet" className="p-3 underline">Clear</Link>
        </form>
        <p className="mt-3 text-xs text-slate-500">All words must occur on the same PDF page. Case and punctuation are ignored. Search finds source passages—not legal answers. Clauses can continue onto the next page.</p>
        <div className="mt-4 flex flex-wrap gap-2">{topics.map(([title,clause,p]) => <Link key={clause} className="text-sm rounded-full bg-slate-100 px-3 py-2 hover:bg-slate-200" href={url({q:clause,doc:'ipa',page:p,offset:0})}>{title} · {clause}</Link>)}</div>
      </section>
      {query ? <section aria-label="Search results" className="bg-white rounded-xl border p-4 md:p-6">
        <h2 className="text-xl font-semibold">{query.length > 160 ? 'Search is too long' : `${search.total} matching ${search.total === 1 ? 'page' : 'pages'}`}</h2>
        {!search.total ? <p role="status" className="mt-3">No matching pages. Try fewer words or an article number such as B113. Words split across pages may need separate searches.</p> : <><p className="text-sm mt-2 text-slate-500">Showing {offset+1}–{Math.min(offset+20, search.total)}. Extracts may lose table alignment; read the original page for rates and conditions.</p><ul className="divide-y mt-3">{search.results.map(result => <li key={`${result.id}-${result.page}`} className="py-4"><Link href={`${url({doc:result.id,page:result.page})}#source-page`} className="font-semibold text-[#285a7a] underline">{result.title} · PDF page {result.page}{result.printedPage ? ` · printed ${result.printedPage}` : ''}</Link><p className="mt-2 text-sm whitespace-pre-wrap break-words">{result.excerpt}</p></li>)}</ul><nav aria-label="Search result pages" className="flex gap-6">{offset > 0 ? <Link className="underline" href={url({offset:Math.max(0,offset-20)})}>Previous results</Link> : null}{offset+20 < search.total ? <Link className="underline" href={url({offset:offset+20})}>Next results</Link> : null}</nav></>}
      </section> : null}
      <section id="source-page" aria-label="Source reader" className="bg-white rounded-xl border overflow-hidden scroll-mt-4">
        <div className="p-4 md:p-6 border-b space-y-4">
          <nav aria-label="Documents" className="flex flex-wrap gap-3">{docs.map(d => <Link key={d.id} aria-current={doc.id === d.id ? 'page' : undefined} className={`rounded-lg border px-4 py-2 ${doc.id === d.id ? 'bg-[#14283c] text-white' : ''}`} href={url({doc:d.id,page:1})}>{d.id === 'ipa' ? 'Full agreement · 258 pages' : 'Final rate sheet · 8 pages'}</Link>)}</nav>
          <div><h2 className="text-xl font-semibold">{doc.title}</h2><p className="text-sm mt-1">{doc.version}</p><p className="text-xs text-slate-500 mt-2">Agreement covers live-action and animation in distinct sections. Confirm the applicable section, production type and rate period. All original rate columns are preserved below.</p></div>
          <form className="flex flex-wrap gap-3 items-center" action="/union-cheat-sheet#source-page"><input type="hidden" name="doc" value={doc.id}/><input type="hidden" name="q" value={query}/><input type="hidden" name="filter" value={filter}/><label htmlFor="page">PDF page</label><input className="border p-2 rounded w-20" id="page" name="page" type="number" min="1" max={doc.pageCount} defaultValue={pageNumber} key={`${doc.id}-${pageNumber}`} /><span>of {doc.pageCount}{page.printedPage ? ` · printed ${page.printedPage}` : ''}</span><button className="border rounded px-4 py-2">Go to page</button></form>
          <div className="flex flex-wrap gap-4 text-sm">{pageNumber > 1 ? <Link className="underline" href={`${url({page:pageNumber-1})}#source-page`}>← Previous page</Link> : null}{pageNumber < doc.pageCount ? <Link className="underline" href={`${url({page:pageNumber+1})}#source-page`}>Next page →</Link> : null}<a className="underline" href={`/api/union-library/${doc.id}?download=1`}>Download original PDF</a><a className="underline" href={`/api/union-library/${doc.id}#page=${pageNumber}`} target="_blank" rel="noreferrer">Open PDF in new tab</a></div>
          <p className="text-xs text-slate-500">Page image preserves the original layout. On small screens, pinch to zoom or open/download the PDF for finer detail. Browser PDF apps may ignore the page link.</p>
        </div>
        <SourcePage key={`${doc.id}-${pageNumber}`} src={`/api/union-library/${doc.id}?page=${pageNumber}`} label={`${doc.title}, PDF page ${pageNumber}. Full extracted text follows.`}/>
        <details className="p-4 md:p-6 border-t"><summary className="cursor-pointer font-semibold">Accessible extracted text · PDF page {pageNumber}</summary><p className="text-xs text-amber-800 mt-3">Extraction can change reading order and lose table columns. Verify amounts and exceptions in the original PDF.</p><pre className="whitespace-pre-wrap break-words font-sans text-sm mt-4">{page.text || 'No extractable text on this page. Use the original PDF.'}</pre></details>
      </section>
      <details className="text-sm p-4 border rounded-lg"><summary className="cursor-pointer font-semibold">Version & source provenance</summary><p className="mt-3">{doc.source}. Full agreement term ends January 31, 2027. This is a dated source collection, not a live amendment feed. Official-site access prevented byte-for-byte currency verification on November 2, 2026; check with business affairs before relying on a deal term.</p><a href={doc.officialUrl} target="_blank" rel="noreferrer" className="underline block mt-3">Official WGC agreement page ↗</a><p className="mt-3 break-all text-xs">Original SHA-256: {doc.sha256}</p></details>
    </div>
  </div>
}
