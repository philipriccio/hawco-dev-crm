import { NextRequest, NextResponse } from 'next/server'
import { BuyerSlateStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const validStatuses = Object.values(BuyerSlateStatus)
    const status = validStatuses.includes(body.status) ? body.status : 'IN_DEVELOPMENT'
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    const item = await prisma.buyerSlateItem.create({
      data: { buyerId: id, title, status, logline: body.logline || null, productionCompany: body.productionCompany || null, source: body.source || null, sourceUrl: body.sourceUrl || null, notes: body.notes || null, confirmed: Boolean(body.confirmed) },
      include: { buyer: true },
    })
    await logActivity({ action: 'created', entityType: 'buyer_slate_item', entityId: item.id, entityName: item.title, changes: { buyer: item.buyer.name, confirmed: item.confirmed } })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating buyer slate item:', error)
    return NextResponse.json({ error: 'Failed to create slate item' }, { status: 500 })
  }
}
