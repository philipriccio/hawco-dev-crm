import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getAgreement, UNION_IDS, validDocument, validPage } from '@/lib/wgc-library'
import { searchUnion, guild, comparisonQuestions, comparisonGuide } from '@/lib/union-library'
import SourcePage from '@/components/wgc/SourcePage'
import FeeComparison from '@/components/wgc/FeeComparison'
import { comparisonLength } from '@/lib/union-comparison'
export const dynamic = 'force-dynamic'
const topics = [
  ['Originating-writer royalties', 'B113', 62], ['Development & concept work', 'B2', 68], ['Options', 'B3', 69],
  ['Theatrical films', 'C101', 71], ['TV movies & mini-series', 'C3', 79], ['TV series & pilots', 'C4', 81], ['Animation (separate section)', 'ANIMATION SECTION', 123],
] as const
export default async function UnionCheatSheetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  try { await requireAuth() } catch { redirect('/login') }
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : ''
  const query = value('q').slice(0, 161); const filter = (validDocument(value('filter')) || ['wga','wgc'].includes(value('filter'))) ? value('filter') : ''
  const compare = value('view') === 'compare' || (!filter && Boolean(comparisonGuide(query))) || (!query && !value('doc') && value('view') !== 'search')
  const showReader = !compare || Boolean(value('doc'))
  let docs
  try { docs = await Promise.all(UNION_IDS.map(getAgreement)) } catch {
    return <main className="p-8"><h1 className="text-3xl">WGC / WGA agreement library</h1><p role="alert" className="mt-4">The agreement library is temporarily unavailable. Please reload to retry.</p></main>
  }
  const doc = docs.find(d => d.id === value('doc')) || docs[0]
  const pageNumber = validPage(value('page'), doc.pageCount) ? Number(value('page')) : 1
  const page = doc.pages[pageNumber - 1]
  const offset = /^\d{1,4}$/.test(value('offset')) ? Number(value('offset')) : 0
  const search = searchUnion(filter ? docs.filter(d => d.id === filter || guild(d.id).toLowerCase() === filter) : docs, query, offset)
  const url = (extra: Record<string, string | number>) => `/union-cheat-sheet?${new URLSearchParams({ q: query, filter, view:compare?'compare':'search', length:value('length'), doc: doc.id, page: String(pageNumber), ...Object.fromEntries(Object.entries(extra).map(([k,v]) => [k,String(v)])) })}`
  return <div className="p-4 md:p-8 bg-[#f6f4ee] min-h-full text-slate-800">
    <header className="max-w-6xl mx-auto mb-7"><p className="text-xs uppercase tracking-widest text-slate-500">Business tools / Union Cheat Sheet</p><h1 className="text-3xl md:text-4xl font-serif mt-3">{compare ? 'Union fees, side by side' : 'WGC / WGA agreement library'}</h1><p className="mt-3 max-w-3xl text-sm text-slate-600">{compare ? 'Compare minimums, see what applies, and check the source when needed.' : 'Search either guild, then read the exact agreement pages. WGC amounts are CAD; WGA amounts are USD.'}</p></header>
    <div className="max-w-6xl mx-auto space-y-6">
      <nav aria-label="Library views" className="flex flex-wrap gap-3"><Link aria-current={compare ? 'page' : undefined} className={`rounded-lg px-4 py-3 border font-semibold ${compare ? 'bg-[#14283c] text-white' : 'bg-white'}`} href="/union-cheat-sheet?view=compare">WGA vs WGC · fee comparison</Link><Link aria-current={!compare ? 'page' : undefined} className={`rounded-lg px-4 py-3 border font-semibold ${!compare ? 'bg-[#14283c] text-white' : 'bg-white'}`} href="/union-cheat-sheet?view=search">Search the agreements</Link></nav>
      {compare ? <FeeComparison length={comparisonLength(value('length'))}/> : null}
      <details open={!compare}><summary className="cursor-pointer font-semibold text-[#285a7a]">Search exact provisions & browse sources</summary><div className="mt-4 space-y-6">
      <section className="bg-white rounded-xl border p-4 md:p-6" aria-label="Search agreements">
        <form className="flex flex-wrap gap-3 items-end" action="/union-cheat-sheet"><input type="hidden" name="view" value="search"/>
          <div className="flex-1 min-w-0 basis-64"><label htmlFor="query" className="block font-semibold text-sm mb-2">Ask about the agreement</label><input id="query" name="q" defaultValue={query} maxLength={160} placeholder="e.g. minimum fee one hour pilot" className="w-full border rounded-lg p-3" /></div>
          <div className="min-w-0 max-w-full"><label htmlFor="filter" className="block text-sm mb-2">Search in</label><select id="filter" name="filter" defaultValue={filter} className="border rounded-lg p-3 max-w-full w-full"><option value="">Both guilds</option><option value="wgc">WGC only · CAD</option><option value="wga">WGA only · USD</option>{docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</select></div>
          <button className="rounded-lg bg-[#14283c] text-white px-5 py-3">Search</button><Link href="/union-cheat-sheet" className="p-3 underline">Clear</Link>
        </form>
        <p className="mt-3 text-xs text-slate-500">Use everyday language or an article number. WGA 2023 is base text: always read it with the 2026 amendments and current minimums. Search connects related terms and provisions across pages. Results are source passages, not an AI-generated legal answer.</p>
        <details className="mt-4" open={!query}><summary className="cursor-pointer text-sm font-semibold">Explore money & credit questions</summary><div className="mt-4 grid gap-5 md:grid-cols-2">
          {[
            {title:'Compare WGC & WGA',questions:comparisonQuestions},
            {title:'Money & fees',questions:['minimum fee one hour pilot','TV script fees','rewrite and polish fees','payment schedule and late payment','option renewal costs','creator royalties','production fee vs distribution royalties','writer pension and insurance']},
            {title:'Credits',questions:['written by vs teleplay by','story by credit','created by credit','shared writing credits','credit arbitration','credit position and size']},
          ].map(group => <nav key={group.title} aria-label={group.title}><h2 className="font-semibold mb-2">{group.title}</h2><div className="flex flex-wrap gap-2">{group.questions.map(question => <Link key={question} className="text-sm rounded-lg border px-3 py-2 hover:bg-slate-50" href={group.title==='Compare WGC & WGA' ? `/union-cheat-sheet?view=compare&q=${encodeURIComponent(question)}` : `/union-cheat-sheet?view=search&q=${encodeURIComponent(question)}&filter=${filter}`}>{question}</Link>)}</div></nav>)}
        </div>
        </details>
        <details className="mt-4"><summary className="text-sm cursor-pointer text-slate-600">Browse article shortcuts</summary><div className="mt-3 flex flex-wrap gap-2">{topics.map(([title,clause,p]) => <Link key={clause} className="text-sm rounded-full bg-slate-100 px-3 py-2 hover:bg-slate-200" href={url({q:clause,doc:'ipa',page:p,offset:0})}>{title} · {clause}</Link>)}</div></details>
      </section>
      {query ? <section aria-label="Search results" className="bg-white rounded-xl border p-4 md:p-6">
        <h2 className="text-xl font-semibold">{query.length > 160 ? 'Search is too long' : `${search.total} related source ${search.total === 1 ? 'page' : 'pages'}`}</h2>
        {search.interpretation.length ? <p className="text-sm mt-3 text-slate-600">Looking for: {search.interpretation.join(' · ')}. Check these topics match your question.</p> : null}
        {search.corrections.length ? <p className="text-sm mt-2">Spelling interpreted as: {search.corrections.join(', ')}.</p> : null}
        {search.guide && search.total ? <aside className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4" aria-label="Reading guide"><h3 className="font-semibold">{search.guide.title}</h3><p className="text-sm mt-2 leading-relaxed">{search.guide.text}</p><div className="flex flex-wrap gap-3 mt-3">{search.guide.sources.map(source => <Link key={`${source.id}-${source.page}`} href={`${url({doc:source.id,page:source.page})}#source-page`} className="text-sm underline">{source.label} · PDF {source.page}</Link>)}</div>{comparisonGuide(query) ? <p className="mt-3 text-sm">Coverage references: <a className="underline" href="https://www.wga.org/members/membership-information/constitution/working-rules" target="_blank" rel="noreferrer">WGA Working Rules (Rule 8)</a> · <a className="underline" href="https://www.wga.org/members/membership-information/international-members" target="_blank" rel="noreferrer">WGA international guidance</a>. Confirm the exact engagement with the guilds; these guides do not decide coverage.</p> : null}</aside> : null}
        {!search.total ? <p role="status" className="mt-3">No reliable match for this question. Try one of the suggested questions, name the production type, or search an article such as B113. This search cannot interpret every question; no answer has been inferred.</p> : <><p className="text-sm mt-2 text-slate-500">Showing {offset+1}–{Math.min(offset+20, search.total)}. For money questions, check production type, writing engagement and rate date. Extracts may lose table alignment; the original page preserves rates and conditions.</p><ul className="divide-y mt-3">{search.results.map(result => <li key={`${result.id}-${result.page}`} className="py-4"><Link href={`${url({doc:result.id,page:result.page})}#source-page`} className="font-semibold text-[#285a7a] underline">{result.title} · PDF page {result.page}{result.printedPage ? ` · printed ${result.printedPage}` : ''}</Link><p className="mt-2 text-xs text-slate-500">{result.reason}</p><p className="mt-2 text-sm whitespace-pre-wrap break-words">{result.excerpt}</p></li>)}</ul><nav aria-label="Search result pages" className="flex gap-6">{offset > 0 ? <Link className="underline" href={url({offset:Math.max(0,offset-20)})}>Previous results</Link> : null}{offset+20 < search.total ? <Link className="underline" href={url({offset:offset+20})}>Next results</Link> : null}</nav></>}
      </section> : null}
      </div></details>
      {showReader ? <><section id="source-page" aria-label="Source reader" className="bg-white rounded-xl border overflow-hidden scroll-mt-4">
        <div className="p-4 md:p-6 border-b space-y-4">
          <nav aria-label="Documents" className="flex flex-wrap gap-3">{docs.map(d => <Link key={d.id} aria-current={doc.id === d.id ? 'page' : undefined} className={`rounded-lg border px-4 py-2 ${doc.id === d.id ? 'bg-[#14283c] text-white' : ''}`} href={url({doc:d.id,page:1})}>{d.title} · {d.pageCount} pages</Link>)}</nav>
          <div><h2 className="text-xl font-semibold">{doc.title}</h2><p className="text-sm mt-1">{doc.version}</p><p className="text-xs text-slate-500 mt-2">Confirm guild coverage, production type, writing step and effective date. WGA base provisions may be amended by the 2026 MOA. Old rate columns are not current offers.</p></div>
          <form className="flex flex-wrap gap-3 items-center" action="/union-cheat-sheet#source-page"><input type="hidden" name="doc" value={doc.id}/><input type="hidden" name="q" value={query}/><input type="hidden" name="filter" value={filter}/><label htmlFor="page">PDF page</label><input className="border p-2 rounded w-20" id="page" name="page" type="number" min="1" max={doc.pageCount} defaultValue={pageNumber} key={`${doc.id}-${pageNumber}`} /><span>of {doc.pageCount}{page.printedPage ? ` · printed ${page.printedPage}` : ''}</span><button className="border rounded px-4 py-2">Go to page</button></form>
          <div className="flex flex-wrap gap-4 text-sm">{pageNumber > 1 ? <Link className="underline" href={`${url({page:pageNumber-1})}#source-page`}>← Previous page</Link> : null}{pageNumber < doc.pageCount ? <Link className="underline" href={`${url({page:pageNumber+1})}#source-page`}>Next page →</Link> : null}<a className="underline" href={`/api/union-library/${doc.id}?download=1`}>Download original PDF</a><a className="underline" href={`/api/union-library/${doc.id}#page=${pageNumber}`} target="_blank" rel="noreferrer">Open PDF in new tab</a></div>
          <p className="text-xs text-slate-500">Page image preserves the original layout. On small screens, pinch to zoom or open/download the PDF for finer detail. Browser PDF apps may ignore the page link.</p>
        </div>
        <SourcePage key={`${doc.id}-${pageNumber}`} src={`/api/union-library/${doc.id}?page=${pageNumber}`} label={`${doc.title}, PDF page ${pageNumber}. Full extracted text follows.`}/>
        <details className="p-4 md:p-6 border-t"><summary className="cursor-pointer font-semibold">Accessible extracted text · PDF page {pageNumber}</summary><p className="text-xs text-amber-800 mt-3">Extraction can change reading order and lose table columns. Verify amounts and exceptions in the original PDF.</p><pre className="whitespace-pre-wrap break-words font-sans text-sm mt-4">{page.text || 'No extractable text on this page. Use the original PDF.'}</pre></details>
      </section>
      <details className="text-sm p-4 border rounded-lg"><summary className="cursor-pointer font-semibold">Version & source provenance</summary><p className="mt-3">{doc.source}. {guild(doc.id) === 'WGC' ? 'WGC term ends January 31, 2027. Existing WGC source copies were supplied by Suzanne; later amendments are not automatically imported.' : 'WGA 2023 base must be read with the 2026 MOA and current minimums.'} This is a dated source collection, not a live amendment feed. Confirm applicable coverage with business affairs and the guilds.</p><a href={doc.officialUrl} target="_blank" rel="noreferrer" className="underline block mt-3">Official source ↗</a><p className="mt-3 break-all text-xs">Original SHA-256: {doc.sha256}</p></details>
    </> : null}
    </div>
  </div>
}
