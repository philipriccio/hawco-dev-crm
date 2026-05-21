import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import BuyerDetailClient from './BuyerDetailClient'

export const dynamic = 'force-dynamic'

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buyer = await prisma.company.findFirst({
    where: { id, isBuyer: true },
    include: {
      contacts: { where: { type: 'NETWORK_EXEC' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, execTitle: true, execRole: true } },
      projects: { where: { role: 'TARGET_BUYER' }, include: { project: { select: { id: true, title: true, status: true, currentStage: true } } }, orderBy: { project: { title: 'asc' } } },
      slateItems: { orderBy: [{ dateNoted: 'desc' }, { title: 'asc' }] },
    },
  })
  if (!buyer) notFound()
  return <BuyerDetailClient buyer={buyer} />
}
