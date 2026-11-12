import { prisma } from '../db'
import { assert, sourceValid } from './domain'
import { privateAccess, json, type Actor } from './service'
export const templateMetadata = {
  id: true,
  type: true,
  versionLabel: true,
  status: true,
  name: true,
  mimeType: true,
  hash: true,
  parentId: true,
  source: true,
  decisions: true,
  actorId: true,
  createdAt: true,
  updatedAt: true,
} as const
export async function decideTemplate(
  actor: Actor,
  body: Record<string, unknown>,
) {
  privateAccess(actor)
  assert(
    sourceValid(body.source as never),
    'Approval / retirement requires cited review evidence',
  )
  return prisma.$transaction(
    async (tx) => {
      const t = await tx.agreementTemplate.findUnique({
        where: { id: String(body.id) },
      })
      assert(
        t && t.updatedAt.toISOString() === body.expectedVersion,
        'Template changed; reread before review',
      )
      assert(
        (t.status === 'DRAFT' && body.decision === 'APPROVED') ||
          (t.status === 'APPROVED' && body.decision === 'RETIRED'),
        'Only explicit draft approval or approved-version retirement permitted',
      )
      const history = Array.isArray(t.decisions) ? t.decisions : []
      const result = await tx.agreementTemplate.updateMany({
        where: { id: t.id, updatedAt: t.updatedAt },
        data: {
          status: String(body.decision),
          decisions: json([
            ...history,
            {
              decision: body.decision,
              actorId: actor.id,
              at: new Date().toISOString(),
              source: body.source,
            },
          ]),
        },
      })
      assert(result.count === 1, 'Concurrent template change')
      return { id: t.id, status: body.decision }
    },
    { isolationLevel: 'Serializable' },
  )
}
