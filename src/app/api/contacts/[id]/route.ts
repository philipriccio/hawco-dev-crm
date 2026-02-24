import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}
