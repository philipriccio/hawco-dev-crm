export const formats = ['HALF_HOUR_COMEDY','ONE_HOUR_DRAMA','LIMITED_SERIES','FEATURE'] as const
export const engines = ['SERIALIZED','EPISODIC'] as const
export const genres = ['COMEDY','DARK_COMEDY','CRIME_AND_MYSTERY','THRILLER','SOAP_AND_RELATIONSHIP_DRAMA','ROMANCE','FAMILY_DRAMA','WORKPLACE_DRAMA','YOUNG_ADULT'] as const
export const stages = ['SOURCING','NEGOTIATION','PACKAGING','MATERIALS','PITCH_READY','OUT_TO_BUYERS','NETWORK_DEVELOPMENT_DEAL','GREENLIGHT'] as const
export const classificationFields = ['standardizedFormat','narrativeEngine','primaryGenre','secondaryGenre','descriptorTags'] as const
export const classificationSelect = { standardizedFormat:true,narrativeEngine:true,primaryGenre:true,secondaryGenre:true,descriptorTags:true } as const
export type Classification = { standardizedFormat:typeof formats[number]|null;narrativeEngine:typeof engines[number]|null;primaryGenre:typeof genres[number]|null;secondaryGenre:typeof genres[number]|null;descriptorTags:string[] }
export const emptyClassification:Classification = {standardizedFormat:null,narrativeEngine:null,primaryGenre:null,secondaryGenre:null,descriptorTags:[]}
export function classificationLabel(value:string|null|undefined) {
 if(!value) return 'Not recorded'
 const special:Record<string,string> = {HALF_HOUR_COMEDY:'Half-hour comedy',ONE_HOUR_DRAMA:'One-hour drama',PITCH_READY:'Pitch-ready'}
 return special[value] || value.toLowerCase().replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())
}
export class ClassificationError extends Error { constructor(message:string,public status=400){super(message)} }
export function enumValue<T extends string>(v:unknown,list:readonly T[],name:string):T|null {
 if(v===null || v==='') return null
 if(typeof v!=='string'||!list.includes(v as T)) throw new ClassificationError(`Invalid ${name}`)
 return v as T
}
// No fixed product cap on tag count: a bounded aggregate payload prevents abuse.
export function parseClassification(v:Record<string,unknown>):Classification {
 const tags=v.descriptorTags
 if(!Array.isArray(tags)||tags.some(t=>typeof t!=='string'||!t.trim()||t.length>200)||JSON.stringify(tags).length>20000) throw new ClassificationError('Tags must be nonempty text, at most 200 characters each and 20,000 characters total')
 return {standardizedFormat:enumValue(v.standardizedFormat,formats,'format'),narrativeEngine:enumValue(v.narrativeEngine,engines,'engine'),primaryGenre:enumValue(v.primaryGenre,genres,'primary genre'),secondaryGenre:enumValue(v.secondaryGenre,genres,'secondary genre'),descriptorTags:Array.from(new Set((tags as string[]).map(t=>t.trim())))}
}
export function classificationSummary(v:Partial<Classification>) { return [v.standardizedFormat,v.narrativeEngine,v.primaryGenre,v.secondaryGenre].filter(Boolean).map(classificationLabel).join(' · ') || 'Classification not recorded' }
// Legacy writers remain compatible; new taxonomy cannot be silently ignored there.
export function hasClassificationFields(v:Record<string,unknown>) {return [...classificationFields,'pipelineStage'].some(k=>k in v)}
