import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDeal } from '@/lib/agreements/service'
import { mayReadLegal } from '@/lib/agreements/domain'
import Detail from './Detail'
export const dynamic = 'force-dynamic'
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const actor = await requireAuth()
  const { id } = await params
  const [deal, ips, contacts, templates] = await Promise.all([
    getDeal(id),
    prisma.ipProperty.findMany({
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.contact.findMany({ select: { id: true, name: true } }),
    prisma.agreementTemplate.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, type: true, versionLabel: true, hash: true },
    }),
  ])
  return (
    <Detail
      initial={JSON.parse(JSON.stringify(deal))}
      canLegal={mayReadLegal(actor.id)}
      ips={JSON.parse(JSON.stringify(ips))}
      contacts={contacts}
      templates={templates}
    />
  )
}
