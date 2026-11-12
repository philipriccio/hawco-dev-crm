import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { mayReadLegal } from '@/lib/agreements/domain'
import { templateMetadata } from '@/lib/agreements/templates'
import Templates from './Templates'
export const dynamic = 'force-dynamic'
export default async function Page() {
  const a = await requireAuth()
  const canManage = mayReadLegal(a.id)
  const rows = await prisma.agreementTemplate.findMany({
    where: canManage ? {} : { status: 'APPROVED' },
    select: templateMetadata,
    orderBy: { createdAt: 'desc' },
  })
  return (
    <Templates
      initial={JSON.parse(JSON.stringify(rows))}
      canManage={canManage}
    />
  )
}
