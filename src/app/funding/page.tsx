import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import FundingManager from './FundingManager'
export const dynamic = 'force-dynamic'
export default async function FundingPage() {
  await requireAuth()
  const deadlines = await prisma.fundingDeadline.findMany({ orderBy: { closingDate: 'asc' } })
  return <FundingManager initialDeadlines={deadlines.map(d => ({ ...d, closingDate: d.closingDate.toISOString().slice(0, 10), createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() }))} now={new Date().toISOString()} />
}
