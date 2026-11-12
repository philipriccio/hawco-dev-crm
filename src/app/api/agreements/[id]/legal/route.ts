import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { privateAccess } from '@/lib/agreements/service'
import { assert } from '@/lib/agreements/domain'
import { failure, response } from '@/lib/agreements/http'
type C = { params: Promise<{ id: string }> }
export async function GET(_r: Request, c: C) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    privateAccess(a)
    return response(
      await prisma.agreementLegal.findMany({
        where: { agreementId: (await c.params).id },
        select: {
          id: true,
          kind: true,
          name: true,
          body: true,
          mimeType: true,
          hash: true,
          parentId: true,
          actorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    )
  } catch (e) {
    return failure(e)
  }
}
export async function POST(r: Request, c: C) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    privateAccess(a)
    const b = await r.json()
    assert(
      typeof b.body === 'string' && b.body.trim() && b.body.length <= 50000,
      'Restricted note required',
    )
    assert(typeof b.name === 'string' && b.name.length <= 200, 'Title required')
    const { id } = await c.params
    assert(
      (await prisma.agreementWorkspace.count({ where: { id } })) === 1,
      'Initialize the agreement workspace first',
    )
    return response(
      await prisma.agreementLegal.create({
        data: {
          agreementId: id,
          kind: 'NOTE',
          name: b.name,
          body: b.body,
          actorId: a.id,
        },
        select: { id: true },
      }),
    )
  } catch (e) {
    return failure(e)
  }
}
