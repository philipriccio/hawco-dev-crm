import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Update Halfyard - keep DEVELOPING, add note about Crave paying
  const halfyard = await prisma.project.updateMany({
    where: { title: 'Halfyard' },
    data: {
      status: 'DEVELOPING',
      notes: 'In active development with Crave. Crave paid for development. One Pager stage.'
    }
  })
  console.log('Updated Halfyard:', halfyard.count)

  // 2. Update The Vig - change to PASSED, add note about Crave passing
  const vig = await prisma.project.updateMany({
    where: { title: 'The Vig' },
    data: {
      status: 'PASSED',
      notes: 'New Montreal version pitched to Crave. Crave/CTV passed on it.'
    }
  })
  console.log('Updated The Vig:', vig.count)

  // 3. Update Worst Breakup Ever - change to PACKAGING (looking for development partner)
  const wbe = await prisma.project.updateMany({
    where: { title: 'Worst Breakup Ever' },
    data: {
      status: 'PACKAGING',
      notes: 'Pitch Deck needs revisions. Looking for development partner. Target: Crave/Bell, 2nd choice Netflix Canada.'
    }
  })
  console.log('Updated Worst Breakup Ever:', wbe.count)

  // List all Hawco originals to confirm
  const originals = await prisma.project.findMany({
    where: {
      origin: 'HAWCO_ORIGINAL'
    },
    select: {
      title: true,
      status: true,
      notes: true
    },
    orderBy: { title: 'asc' }
  })
  
  console.log('\n--- Hawco Originals Status ---')
  originals.forEach(p => {
    console.log(`${p.title}: ${p.status}`)
    if (p.notes) console.log(`  Notes: ${p.notes}`)
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
