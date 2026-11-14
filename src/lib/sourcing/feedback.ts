import { prisma } from '../db'

// Exact attributed notes, including history for restored suggestions. No inferred taste rules.
export async function getSourcingFeedback(page = 0) {
 const where = {kind:'DISMISSED',note:{not:''}}
 const [feedback,total] = await prisma.$transaction([
  prisma.sourcingEvent.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],take:50,skip:page*50,select:{id:true,note:true,actorId:true,actorName:true,createdAt:true,lead:{select:{id:true,title:true,creator:true,kind:true,sourceUrl:true,decision:true,dismissedAt:true}}}}),
  prisma.sourcingEvent.count({where}),
 ])
 return {feedback,total,page}
}
