import { editorialSources, genreLabel, type Editorial } from '@/lib/sourcing/editorial'
import { panelClass } from './styles'
export default function EditorialOverview({lead,compact=false}:{lead:Editorial;compact?:boolean}) {
 const genre = genreLabel(lead), sources = editorialSources(lead.editorialSources)
 const grouped = new Map<string,{url:string;labels:Set<string>;fields:Set<string>;dates:Set<string>}>()
 for(const source of sources) {
  const group = grouped.get(source.url) || {url:source.url,labels:new Set<string>(),fields:new Set<string>(),dates:new Set<string>()}
  group.labels.add(source.label);group.fields.add(source.field);group.dates.add(source.checkedOn);grouped.set(source.url,group)
 }
 return <div className={compact?'space-y-3':panelClass}>
  {genre&&<p className="text-sm font-medium text-[#224b66]">{genre}</p>}
  <p className="whitespace-pre-wrap">{lead.editorialSynopsis || 'Synopsis not yet verified.'}</p>
  {lead.editorialWhy&&<div><h3 className="text-sm font-semibold">Why it’s interesting</h3><p className="whitespace-pre-wrap">{lead.editorialWhy}</p></div>}
  {lead.editorialAccolades&&<div><h3 className="text-sm font-semibold">Awards & accolades</h3><p className="whitespace-pre-wrap">{lead.editorialAccolades}</p></div>}
  {lead.editorialSales&&<div><h3 className="text-sm font-semibold">Sales & reach</h3><p className="whitespace-pre-wrap">{lead.editorialSales}</p></div>}
  {lead.editorialCaveat&&<div className="border-l-2 border-amber-400 pl-3"><h3 className="text-sm font-semibold">Worth knowing</h3><p className="whitespace-pre-wrap">{lead.editorialCaveat}</p></div>}
  {!compact&&sources.length>0&&<details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Sources & dates ({grouped.size})</summary><ul className="mt-3 space-y-2 text-sm">{Array.from(grouped.values()).map(s=><li key={s.url}><a className="underline" target="_blank" rel="noopener noreferrer" href={s.url}>{Array.from(s.labels).join(' / ')}</a> · {Array.from(s.fields).join(', ')} · Evidence reviewed {Array.from(s.dates).sort().join(', ')}</li>)}</ul></details>}
 </div>
}
