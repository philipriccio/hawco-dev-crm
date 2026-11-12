import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { changeDeal, getDeal } from '@/lib/agreements/service'
import { failure, response } from '@/lib/agreements/http'
import { mayReadLegal } from '@/lib/agreements/domain'
type Context = { params: Promise<{ id: string }> }
export async function GET(_r: Request, c: Context) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    return response({
      ...(await getDeal((await c.params).id)),
      canLegal: mayReadLegal(a.id),
    })
  } catch (e) {
    return failure(e)
  }
}
export async function PATCH(r: Request, c: Context) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    return response(await changeDeal(a, (await c.params).id, await r.json()))
  } catch (e) {
    return failure(e)
  }
}
