import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { getSlate, saveBrief } from '@/lib/sourcing/service'
import { failure, readMutation, response } from '@/lib/sourcing/http'
export async function GET() {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try {const [versions,slate] = await Promise.all([prisma.sourcingBrief.findMany({orderBy:{version:'desc'},take:50}),getSlate()]); return response({versions,slate})} catch(e) {return failure(e)}
}
export async function POST(request:Request) {
 const actor = await requireApiAuth(); if(isAuthResponse(actor)) return actor
 try {return response(await saveBrief(actor,await readMutation(request)),201)} catch(e) {return failure(e)}
}
