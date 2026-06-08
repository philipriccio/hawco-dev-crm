import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import BuyerDetailClient from './BuyerDetailClient'

export const dynamic = 'force-dynamic'

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buyer = await prisma.company.findFirst({
    where: { id, isBuyer: true },
    include: {
      contacts: { orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, execTitle: true, execRole: true, type: true } },
      projects: { where: { role: { startsWith: 'TARGET_BUYER' } }, include: { project: { select: { id: true, title: true, status: true, currentStage: true, genre: true, format: true } } }, orderBy: { project: { title: 'asc' } } },
      slateItems: { include: { contacts: { include: { contact: { select: { id: true, name: true, type: true, execTitle: true, execRole: true, email: true } } }, orderBy: { contact: { name: 'asc' } } } }, orderBy: [{ dateNoted: 'desc' }, { title: 'asc' }] },
    },
  })
  if (!buyer) notFound()
  return <BuyerDetailClient buyer={buyer} />
}
