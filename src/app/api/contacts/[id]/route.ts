import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity, calculateChanges } from '@/lib/activity'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        agent: true,
        manager: true,
        company: true,
      },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get the existing contact for change tracking
    const existingContact = await prisma.contact.findUnique({
      where: { id },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // All editable fields
    const allowedFields = [
      'type', 'name', 'email', 'phone', 'imdbUrl', 'notes',
      'writerLevel', 'writerGenres', 'writerVoice', 'citizenship', 'isCanadian', 'unionMembership',
      'agentVibe', 'execTitle', 'execRole', 'lookingFor',
      'agentId', 'managerId', 'companyId'
    ]
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        // Convert empty strings to null for optional fields
        const value = body[field]
        updateData[field] = value === '' ? null : value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        agent: true,
        manager: true,
      },
    })

    // Log activity with changes
    const changes = calculateChanges(
      existingContact as unknown as Record<string, unknown>,
      updateData
    )
    await logActivity({
      action: 'updated',
      entityType: 'contact',
      entityId: contact.id,
      entityName: contact.name,
      changes,
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get contact name before deleting
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { name: true },
    })

    await prisma.contact.delete({
      where: { id },
    })

    // Log activity
    if (contact) {
      await logActivity({
        action: 'deleted',
        entityType: 'contact',
        entityId: id,
        entityName: contact.name,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
