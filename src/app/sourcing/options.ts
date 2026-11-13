import { prisma } from '@/lib/db'
export async function options() {
 const [contacts,projects,ips] = await Promise.all([prisma.contact.findMany({select:{id:true,name:true},orderBy:{name:'asc'}}),prisma.project.findMany({select:{id:true,title:true},orderBy:{title:'asc'}}),prisma.ipProperty.findMany({select:{id:true,title:true},orderBy:{title:'asc'}})])
 return {contacts,projects,ips}
}
