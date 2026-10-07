import { prisma } from '@/lib/db'

export function validateSearchQuery(value: string): string {
  const query = value.trim()
  if (query.length < 2 || query.length > 120) {
    throw new Error('Enter between 2 and 120 characters to search.')
  }
  return query
}

// Call only after the page/route has authenticated the current user.
export async function globalSearch(query: string) {
  const contains = { contains: validateSearchQuery(query), mode: 'insensitive' as const }
  const [projects, contacts, materials] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ title: contains }, { logline: contains }] },
      select: { id: true, title: true, status: true },
      orderBy: { title: 'asc' }, take: 20,
    }),
    prisma.contact.findMany({
      where: { OR: [{ name: contains }, { email: contains }] },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' }, take: 20,
    }),
    prisma.material.findMany({
      where: { OR: [{ title: contains }, { filename: contains }] },
      select: { id: true, title: true, type: true, project: { select: { id: true, title: true } } },
      orderBy: { title: 'asc' }, take: 20,
    }),
  ])
  return { projects, contacts, materials }
}
