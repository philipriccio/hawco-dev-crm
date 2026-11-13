import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { changeLead } from '@/lib/sourcing/service'
import { failure, readMutation, response } from '@/lib/sourcing/http'
type Context = { params: Promise<{id:string}> }
export async function GET(request: Request, {params}:Context) {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try { const lead = await prisma.sourcingLead.findUnique({where:{id:(await params).id},include:{events:{orderBy:[{createdAt:'desc'},{id:'asc'}],take:100},contact:{select:{id:true,name:true}},project:{select:{id:true,title:true}},ip:{select:{id:true,title:true}}}}); return lead ? response(lead) : response({error:'Lead not found'},404) } catch(e) { return failure(e) }
}
export async function PATCH(request:Request,{params}:Context) {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try {return response(await changeLead(actor,(await params).id,await readMutation(request)))} catch(e) {return failure(e)}
}
