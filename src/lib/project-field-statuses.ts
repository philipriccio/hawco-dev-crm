import { ProjectStatus } from '@prisma/client'

// These decisions also update reading/classification/history through their own workflow.
export const READING_DECISION_STATUSES: ProjectStatus[] = ['PASS_KEEP_WRITER', 'NOT_READING', 'REFERENCE_ONLY', 'SHELVED']
export const EDITABLE_PROJECT_STATUSES = Object.values(ProjectStatus).filter(status => !READING_DECISION_STATUSES.includes(status))
