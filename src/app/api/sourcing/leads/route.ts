import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { createLead } from '@/lib/sourcing/service'
import { failure, readMutation, response } from '@/lib/sourcing/http'
import { choice, decisions, kinds } from '@/lib/sourcing/domain'
export async function GET(request: Request) {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try {
  const q = new URL(request.url).searchParams
  const query = (q.get('q') || '').slice(0,200), decision = q.get('decision'), kind = q.get('kind')
  const page = Math.max(0,Math.min(100000,Number(q.get('page')) || 0))
  const where = {...(decision ? {decision:choice(decision,decisions,'decision')} : {}),...(kind ? {kind:choice(kind,kinds,'kind')} : {}),...(query ? {OR:[{title:{contains:query,mode:'insensitive' as const}},{creator:{contains:query,mode:'insensitive' as const}},{gap:{contains:query,mode:'insensitive' as const}}]} : {})}
  const [leads,total] = await prisma.$transaction([prisma.sourcingLead.findMany({where,orderBy:[{updatedAt:'desc'},{id:'asc'}],take:50,skip:Math.floor(page)*50}),prisma.sourcingLead.count({where})])
  return response({leads,total,page:Math.floor(page)})
 } catch(e) { return failure(e) }
}
export async function POST(request: Request) {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try { return response(await createLead(actor,await readMutation(request)),201) } catch(e) {return failure(e)}
}
