import { prisma } from './db'
import { POTENTIAL_DEVELOPMENT_WHERE } from './development-slate'

export async function getPotentialDevelopment() {
  return prisma.project.findMany({
    where: POTENTIAL_DEVELOPMENT_WHERE,
    select: {
      id: true, title: true, logline: true, currentStage: true, nextAction: true,
      contacts: { where: { role: 'WRITER' }, select: { contact: { select: { id: true, name: true } } }, orderBy: { contact: { name: 'asc' } } },
    },
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
  })
}
