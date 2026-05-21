import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { logActivity } from '@/lib/activity'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id, itemId } = await params
    const body = await request.json()
    const contactId = typeof body.contactId === 'string' ? body.contactId : ''
    const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : null
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    if (!contactId) return NextResponse.json({ error: 'contactId is required' }, { status: 400 })

    const item = await prisma.buyerSlateItem.findFirst({ where: { id: itemId, buyerId: id }, include: { buyer: true } })
    if (!item) return NextResponse.json({ error: 'Slate item not found' }, { status: 404 })

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, companyId: id },
      select: { id: true, name: true },
    })
    if (!contact) return NextResponse.json({ error: 'Contact not found for this buyer' }, { status: 404 })

    const link = await prisma.buyerSlateContact.upsert({
      where: { slateItemId_contactId: { slateItemId: itemId, contactId } },
      update: { role, notes },
      create: { slateItemId: itemId, contactId, role, notes },
      include: { contact: true },
    })
    await logActivity({ action: 'updated', entityType: 'buyer_slate_item', entityId: item.id, entityName: item.title, changes: { attachedContact: contact.name, buyer: item.buyer.name } })
    return NextResponse.json(link)
  } catch (error) {
    console.error('Error attaching slate contact:', error)
    return NextResponse.json({ error: 'Failed to attach contact' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id, itemId } = await params
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId') || ''
    if (!contactId) return NextResponse.json({ error: 'contactId is required' }, { status: 400 })
    const item = await prisma.buyerSlateItem.findFirst({ where: { id: itemId, buyerId: id } })
    if (!item) return NextResponse.json({ error: 'Slate item not found' }, { status: 404 })
    await prisma.buyerSlateContact.deleteMany({ where: { slateItemId: itemId, contactId } })
    await logActivity({ action: 'updated', entityType: 'buyer_slate_item', entityId: item.id, entityName: item.title, changes: { detachedContactId: contactId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error detaching slate contact:', error)
    return NextResponse.json({ error: 'Failed to detach contact' }, { status: 500 })
  }
}
