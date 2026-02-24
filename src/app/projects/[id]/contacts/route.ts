import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectContactRole } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    const { contactId, role, newContact } = body

    // If creating a new contact
    let finalContactId = contactId
    if (newContact && newContact.name) {
      const createdContact = await prisma.contact.create({
        data: {
          type: newContact.type || 'OTHER',
          name: newContact.name,
          email: newContact.email || null,
          phone: newContact.phone || null,
          companyId: newContact.companyId || null,
        },
      })
      finalContactId = createdContact.id
    }

    if (!finalContactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Check if relationship already exists
    const existing = await prisma.projectContact.findUnique({
      where: {
        projectId_contactId_role: {
          projectId,
          contactId: finalContactId,
          role: (role || 'PRODUCER') as ProjectContactRole,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This contact is already attached to this project' },
        { status: 400 }
      )
    }

    const projectContact = await prisma.projectContact.create({
      data: {
        projectId,
        contactId: finalContactId,
        role: (role || 'PRODUCER') as ProjectContactRole,
      },
      include: {
        contact: {
          include: { company: true },
        },
      },
    })

    return NextResponse.json(projectContact, { status: 201 })
  } catch (error) {
    console.error('Error adding contact to project:', error)
    return NextResponse.json(
      { error: 'Failed to add contact to project' },
      { status: 500 }
    )
  }
}