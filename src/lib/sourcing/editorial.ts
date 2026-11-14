import { object, text, url, date, choice, SourcingError } from './domain'
import { classificationLabel } from '../classification/domain'
export const editorialFields = ['editorialSynopsis','editorialGenre','editorialAccolades','editorialSales','editorialWhy','editorialCaveat'] as const
export const evidenceFields = ['synopsis','genre','accolades','sales','why','caveat'] as const
export type EditorialSource = {field:string;url:string;label:string;checkedOn:string}
export type Editorial = Record<typeof editorialFields[number],string> & {editorialSources:unknown;primaryGenre?:string|null;secondaryGenre?:string|null}
export function editorialInput(input:unknown) {
 const v = object(input)
 if(Object.keys(v).some(k=>![...editorialFields,'editorialSources'].includes(k))) throw new SourcingError('Unsupported editorial field')
 const result = Object.fromEntries(editorialFields.map(k=>[k,text(v[k] ?? '',k,k==='editorialGenre'?200:k==='editorialSynopsis'?1800:1200)])) as Record<typeof editorialFields[number],string>
 if(!Array.isArray(v.editorialSources)||v.editorialSources.length>40) throw new SourcingError('Provide up to 40 source references')
 const editorialSources = v.editorialSources.map(source=>{
  const s = object(source)
  if(Object.keys(s).some(k=>!['field','url','label','checkedOn'].includes(k))) throw new SourcingError('Unsupported source field')
  return {field:choice(s.field,evidenceFields,'source field'),url:url(s.url,true),label:text(s.label,'source label',300,true),checkedOn:date(s.checkedOn,'source check date',true)}
 })
 for(const field of evidenceFields) {
  const key = `editorial${field[0].toUpperCase()}${field.slice(1)}` as typeof editorialFields[number]
  if(result[key] && !editorialSources.some(s=>s.field===field)) throw new SourcingError(`Add a dated source for ${field}`)
 }
 return {...result,editorialSources}
}
export function editorialSources(value:unknown):EditorialSource[] {
 if(!Array.isArray(value)) return []
 return value.flatMap(v=>{
  try {const s=object(v);return [{field:choice(s.field,evidenceFields,'source field'),url:url(s.url,true),label:text(s.label,'source label',300,true),checkedOn:date(s.checkedOn,'source date',true)}]} catch {return []}
 })
}
export function genreLabel(lead:Editorial) {
 return [lead.primaryGenre,lead.secondaryGenre].filter(Boolean).map(classificationLabel).join(' / ') || lead.editorialGenre
}
