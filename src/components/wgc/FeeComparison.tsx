import Link from 'next/link'
import { comparisonRows, otherComparisonRows, type ComparisonRow } from '@/lib/union-comparison'
function Row({row,length}:{row:ComparisonRow;length:30|60}) {
 return <article className="border-b border-slate-200 py-5 last:border-0" aria-label={row.title}>
  <h3 className="font-semibold text-base mb-3">{row.title}</h3>
  <div className="grid grid-cols-2 gap-3 sm:gap-6">
   {(['wgc','wga'] as const).map(guild=>{const item=row[guild];return <div key={guild} className="min-w-0 rounded-lg bg-slate-50 p-3 sm:p-4">
    <p className="text-xs font-semibold tracking-wide text-slate-600">{guild.toUpperCase()} · {guild==='wgc'?'CAD':'USD'}</p>
    <p className="text-lg sm:text-2xl font-semibold mt-2 break-words">{item.value}</p>
    <p className={`text-xs mt-2 font-medium ${item.status==='Applies in this example'?'text-emerald-800':'text-amber-900'}`}>{item.status}</p>
    <p className="text-sm leading-relaxed mt-2 break-words">{item.detail}</p>
   </div>})}
  </div>
  <p className="text-sm mt-3 text-slate-600"><span className="font-semibold text-slate-800">The difference: </span>{row.difference}</p>
  <details className="mt-2 text-sm"><summary className="cursor-pointer text-[#285a7a] underline">Check sources</summary><ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{row.sources.map(s=><li key={`${s.id}-${s.page}`}><Link className="underline" href={`/union-cheat-sheet?view=compare&length=${length}&doc=${s.id}&page=${s.page}#source-page`}>{s.label} · PDF {s.page}</Link></li>)}</ul></details>
 </article>
}
export default function FeeComparison({length}:{length:30|60}) {
 return <section aria-label="WGC and WGA fee comparison" className="bg-white rounded-xl border p-4 sm:p-6">
  <h2 className="text-2xl sm:text-3xl font-serif mt-2">TV writing minimums</h2>
  <p className="text-sm text-slate-600 mt-2">Minimum writing fees side by side. Different currencies; no exchange-rate conversion.</p>
  <form action="/union-cheat-sheet" className="flex flex-wrap items-end gap-3 mt-5"><input type="hidden" name="view" value="compare"/><div><label htmlFor="length" className="block text-sm font-semibold mb-2">TV episode length</label><select id="length" name="length" defaultValue={length} className="border rounded-lg p-3"><option value="60">60-minute episode</option><option value="30">30-minute episode</option></select></div><button className="bg-[#14283c] text-white rounded-lg px-4 py-3">Update comparison</button></form>
  <p className="mt-4 text-sm leading-relaxed"><strong>Example:</strong> live-action TV · WGC C4 (budget over CAD $82,000) / WGA network prime time, high budget · November 2026 rates. Not a streaming, animation or film quote.</p>
  <details className="mt-2 text-sm text-slate-600"><summary className="cursor-pointer underline">Scope, dates & applicability</summary><p className="mt-2">WGC budget above CAD $82,000; WGA ABC, CBS, Fox or NBC network prime time, high-budget rewrite/polish rates. Freelance writing steps, not weekly staff employment or TV movies.</p><p className="mt-2">Snapshot: November 19, 2026. WGC rates: February 1, 2026–January 31, 2027. WGA rates: May 2, 2026–May 1, 2027. Later dates need new rates.</p><p className="mt-2">Producer/signatory, engagement and any granted waiver determine coverage—not a choice of the cheaper guild. “Conditional” is not “not applicable”.</p></details>
  <div className="mt-3">{[...comparisonRows(length),otherComparisonRows[0]].map(row=><Row key={row.title} row={row} length={length}/>)}</div>
  <details className="mt-5 border-t pt-5"><summary className="cursor-pointer font-semibold text-lg">Other costs & when they apply</summary><p className="text-sm mt-3 text-slate-600">Benefits, development, options and later-use payments are separate from the script minimum. These are not included in an all-in total.</p>{otherComparisonRows.slice(1).map(row=><Row key={row.title} row={row} length={length}/>)}</details>
  <p className="mt-5 text-xs text-slate-500">Use the exact source for an offer. Unknown coverage stays unconfirmed; it does not become a zero fee or “not applicable”. Taxes, administration fees and separately negotiated terms are not totalled here.</p>
 </section>
}
