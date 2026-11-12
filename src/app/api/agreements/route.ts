import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { createDeal } from '@/lib/agreements/service'
import { failure, response } from '@/lib/agreements/http'
export async function POST(request: Request) {
  const actor = await requireApiAuth()
  if (isAuthResponse(actor)) return actor
  try {
    return response(await createDeal(actor, await request.json()))
  } catch (e) {
    return failure(e)
  }
}
