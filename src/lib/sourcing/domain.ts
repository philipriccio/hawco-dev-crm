export const kinds = ['WRITER', 'BOOK', 'PLAY', 'OTHER_IP'] as const
export const decisions = ['NEW', 'INTERESTED', 'PURSUING', 'PASSED', 'NOT_NOW'] as const
export const rightsStatuses = ['UNKNOWN', 'REPRESENTED', 'CONFIRMED_AVAILABLE', 'OPTIONED_SOLD', 'DO_NOT_PURSUE'] as const
export const bases = ['DESCRIPTION_ONLY', 'REVIEWS', 'EXCERPT', 'FULL_WORK'] as const
export const factualEvents = ['INQUIRY_SENT', 'RESPONSE_RECEIVED', 'READING_COPY_RECEIVED', 'MEETING_HELD', 'NOTE'] as const
export const provisionalBrief = `DRAFT — provisional direction, not approved targets or buyer mandates.
Objective: a network development deal, then a greenlight.
Working slate reference: about 20 active projects and 4–8 IP adaptations across stages. These are provisional planning references, not quotas.
Explore a mix of comedy and drama, serialized and episodic; interests include thrillers, romance, soapy drama and dark comedy.
Use the current slate below. Missing metadata is unknown, not evidence of a creative gap. Project origin is the recorded intake origin, not an adaptation classification. An IP link does not establish rights clearance.
Keep Three Canadian screenwriters to know unchanged. Match writers to explicit project needs separately, including known writers.
Research only. No outreach, drafts, automatic project creation, rights clearance or changes to reading/coverage records.
Buyer needs: distinguish dated direct requests from commissioning signals and our interpretation. No buyer request is established by this draft.
Before approval: review actual slate gaps, priorities, source coverage and the next research questions.`
export class SourcingError extends Error { constructor(message: string, public status = 400) { super(message) } }
export function object(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SourcingError('Expected an object')
 return value as Record<string, unknown>
}
export function text(value: unknown, label: string, max = 8000, required = false) {
 if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new SourcingError(`Invalid ${label}`)
 return value.trim()
}
export function choice(value: unknown, allowed: readonly string[], label: string) {
 const v = text(value, label, 100, true)
 if (!allowed.includes(v)) throw new SourcingError(`Invalid ${label}`)
 return v
}
export function date(value: unknown, label: string, required = false) {
 const v = text(value, label, 10, required)
 if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v + 'T00:00:00Z')) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v)) throw new SourcingError(`Invalid ${label}`)
 return v
}
export function url(value: unknown, required = false) {
 const v = text(value, 'source URL', 2000, required)
 if (!v) return v
 try { const u = new URL(v); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw Error(); return u.href } catch { throw new SourcingError('Use an http or https source URL without credentials') }
}
export function version(value: unknown) {
 if (!Number.isSafeInteger(value) || Number(value) < 0) throw new SourcingError('Invalid version')
 return Number(value)
}
export function identity(kind: string, title: string, creator: string) {
 const normalize = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
 return JSON.stringify([kind, normalize(title), normalize(creator)])
}
export function leadInput(value: unknown) {
 const v = object(value)
 const fields = ['title','creator','kind','sourceChannel','sourceUrl','sourceDate','basis','fit','gap','nextStep','rightsStatus','rightsEvidence','rightsCheckedOn','contactId','projectId','ipId']
 for (const key of Object.keys(v)) if (!fields.includes(key)) throw new SourcingError(`Unsupported lead field: ${key}`)
 const title = text(v.title,'title',300,true), creator = text(v.creator ?? '', 'creator',300)
 const kind = choice(v.kind,kinds,'kind')
 const rightsStatus = choice(v.rightsStatus ?? 'UNKNOWN',rightsStatuses,'rights status')
 const rightsEvidence = text(v.rightsEvidence ?? '', 'rights evidence')
 const rightsCheckedOn = date(v.rightsCheckedOn ?? '', 'rights check date')
 if (rightsStatus !== 'UNKNOWN' && (!rightsEvidence || !rightsCheckedOn)) throw new SourcingError('A rights assertion requires evidence and a checked date; otherwise use Unknown')
 const link = (key: string) => v[key] === null || v[key] === undefined || v[key] === '' ? null : text(v[key],key,100,true)
 return { title, creator, kind, identityKey: identity(kind,title,creator), sourceChannel: text(v.sourceChannel,'source channel',200,true), sourceUrl: url(v.sourceUrl,true), sourceDate: date(v.sourceDate,'source date',true), basis: choice(v.basis ?? 'DESCRIPTION_ONLY',bases,'reading basis'), fit: text(v.fit ?? '','fit'), gap: text(v.gap ?? '','gap'), nextStep: text(v.nextStep ?? '','next step'), rightsStatus, rightsEvidence, rightsCheckedOn, contactId: link('contactId'), projectId: link('projectId'), ipId: link('ipId') }
}
