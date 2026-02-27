import { prisma } from './db'
import { getSession } from './auth'
import { Prisma } from '@prisma/client'

export type ActivityAction = 'created' | 'updated' | 'deleted'
export type EntityType = 'contact' | 'company' | 'project' | 'coverage' | 'material' | 'meeting' | 'user'

interface LogActivityParams {
  action: ActivityAction
  entityType: EntityType
  entityId: string
  entityName: string
  changes?: Record<string, unknown> | null
  userId?: string // Optional override if we already have the user
}

/**
 * Log an activity to the audit trail.
 * Will automatically get the current user from the session if not provided.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let userId = params.userId

    // Get current user from session if not provided
    if (!userId) {
      const session = await getSession()
      if (session) {
        userId = session.id
      }
    }

    // If we still don't have a user, skip logging (shouldn't happen in normal use)
    if (!userId) {
      console.warn('Activity log: No user found, skipping log')
      return
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        changes: params.changes ? (params.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })
  } catch (error) {
    // Don't let logging errors break the main operation
    console.error('Activity log error:', error)
  }
}

/**
 * Calculate the changes between old and new data for update logging.
 */
export function calculateChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const key of Object.keys(newData)) {
    // Skip internal fields
    if (['id', 'createdAt', 'updatedAt'].includes(key)) continue

    const oldValue = oldData[key]
    const newValue = newData[key]

    // Check if values are different (simple comparison)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { from: oldValue, to: newValue }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}
