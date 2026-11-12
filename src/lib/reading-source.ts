import type { Prisma } from '@prisma/client'

export type ReadingSource = '' | 'main' | 'website-unsolicited'

// Only explicit project metadata classifies intake. External origin and notes are not evidence.
export function isWebsiteUnsolicited(material: { project?: { websiteUnsolicited?: boolean } | null }): boolean {
  return material.project?.websiteUnsolicited === true
}

export function readingSourceWhere(source: ReadingSource): Prisma.MaterialWhereInput {
  if (source === 'website-unsolicited') return { project: { is: { websiteUnsolicited: true } } }
  if (source === 'main') return { OR: [{ project: { is: null } }, { project: { is: { websiteUnsolicited: false } } }] }
  return {}
}

// Closing a submission never implies it was read. Classification applies to drafts too.
export function unreadQueueWhere(): Prisma.MaterialWhereInput {
 return {readAt:null,readState:'UNREAD',classification:'SUBMISSION',OR:[{projectId:null},{project:{is:{classification:'SUBMISSION',status:{notIn:['PASSED','PASS_KEEP_WRITER','NOT_READING','REFERENCE_ONLY','SHELVED']}}}}]}
}
export function isQueueEligible(material:{readAt?:unknown,readState?:string,classification?:string,project?:{classification?:string,status?:string}|null}):boolean {
 return !material.readAt && (!material.readState||material.readState==='UNREAD') && (!material.classification||material.classification==='SUBMISSION') && (!material.project?.classification||material.project.classification==='SUBMISSION') && !['PASSED','PASS_KEEP_WRITER','NOT_READING','REFERENCE_ONLY','SHELVED'].includes(material.project?.status||'')
}
