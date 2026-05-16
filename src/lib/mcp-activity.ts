import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { McpActor } from '@/lib/mcp-auth'

export type McpActivityAction = 'created' | 'updated' | 'deleted' | 'uploaded' | 'linked'

export type McpActivityEntityType =
  | 'contact'
  | 'company'
  | 'project'
  | 'coverage'
  | 'material'
  | 'meeting'
  | 'followup'
  | 'writer_signal'
  | 'tag'
  | 'user'

type McpActivityParams = {
  actor: McpActor
  action: McpActivityAction
  entityType: McpActivityEntityType
  entityId: string
  entityName: string
  tool: string
  changes?: Record<string, unknown> | null
  extra?: Record<string, unknown> | null
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'fileBytes',
  'bytes',
  'base64',
  'content',
])

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (!value || typeof value !== 'object') return value

  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      output[key] = '[redacted]'
    } else if (typeof child === 'string' && child.length > 500) {
      output[key] = `${child.slice(0, 500)}…[truncated]`
    } else {
      output[key] = sanitize(child)
    }
  }
  return output
}

async function getOrCreateMcpUser(actor: McpActor) {
  const email = `${actor.id}@mcp.local`
  return prisma.user.upsert({
    where: { email },
    update: { name: actor.name },
    create: {
      email,
      name: actor.name,
      role: 'MEMBER',
      password: 'mcp-service-actor-no-login',
    },
    select: { id: true },
  })
}

export async function logMcpActivity(params: McpActivityParams): Promise<void> {
  try {
    const user = await getOrCreateMcpUser(params.actor)
    const changes = sanitize({
      source: 'mcp',
      actorId: params.actor.id,
      actorName: params.actor.name,
      scopes: params.actor.scopes,
      tool: params.tool,
      changes: params.changes ?? null,
      extra: params.extra ?? null,
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        changes: changes as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    console.error('MCP activity log error:', error)
  }
}
