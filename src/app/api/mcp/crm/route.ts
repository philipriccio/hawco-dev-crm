import { NextRequest } from 'next/server'
import { requireMcpAuth, isMcpAuthResponse } from '@/lib/mcp-auth'
import { mcpError, mcpOk } from '@/lib/mcp-response'
import {
  createMcpCompany,
  createMcpContact,
  createMcpMaterial,
  createMcpProject,
  createMcpTag,
  deleteMcpCompany,
  deleteMcpContact,
  deleteMcpMaterial,
  deleteMcpProject,
  updateMcpCompany,
  updateMcpContact,
  updateMcpMaterial,
  updateMcpProject,
  updateMcpUser,
} from '@/lib/mcp-crud'

type Body = Record<string, unknown>

async function dispatch(actor: Awaited<ReturnType<typeof requireMcpAuth>>, body: Body) {
  if (isMcpAuthResponse(actor)) return actor
  const entity = typeof body.entity === 'string' ? body.entity : ''
  const action = typeof body.action === 'string' ? body.action : ''
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const data = (body.data && typeof body.data === 'object' ? body.data : body) as Body

  switch (`${entity}:${action}`) {
    case 'contact:create': return createMcpContact(actor, data)
    case 'contact:update': return updateMcpContact(actor, id, data)
    case 'contact:delete': return deleteMcpContact(actor, id)
    case 'company:create': return createMcpCompany(actor, data)
    case 'company:update': return updateMcpCompany(actor, id, data)
    case 'company:delete': return deleteMcpCompany(actor, id)
    case 'project:create': return createMcpProject(actor, data)
    case 'project:update': return updateMcpProject(actor, id, data)
    case 'project:delete': return deleteMcpProject(actor, id)
    case 'material:create': return createMcpMaterial(actor, data)
    case 'material:update': return updateMcpMaterial(actor, id, data)
    case 'material:delete': return deleteMcpMaterial(actor, id)
    case 'tag:create': return createMcpTag(actor, data)
    case 'user:update': return updateMcpUser(actor, id, data)
    default: throw new Error(`unsupported CRM action: ${entity}:${action}`)
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const action = typeof body.action === 'string' ? body.action : ''
  const requiredScope = action === 'delete' ? 'crm:delete' : 'crm:write'
  const actor = await requireMcpAuth(request, requiredScope)
  if (isMcpAuthResponse(actor)) return actor

  try {
    const result = await dispatch(actor, body)
    return mcpOk(result, { actor: actor.id, action, entity: body.entity })
  } catch (error) {
    return mcpError('crm_action_failed', error instanceof Error ? error.message : 'CRM action failed')
  }
}
