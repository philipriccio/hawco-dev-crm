import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { getSourcingFeedback } from '@/lib/sourcing/feedback'
import { failure, response } from '@/lib/sourcing/http'
export async function GET(request:Request) {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try {
  const page = Math.floor(Math.max(0,Math.min(100000,Number(new URL(request.url).searchParams.get('page'))||0)))
  return response(await getSourcingFeedback(page))
 } catch(e) {return failure(e)}
}
