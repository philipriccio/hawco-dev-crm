import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectContactRole } from '@prisma/client'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/projects/[id]/contacts - List team members for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params

    const contacts = await prisma.projectContact.findMany({
      where: { projectId: id },
      include: {
        contact: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { contact: { name: 'asc' } },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching project contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project contacts' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[id]/contacts - Add a team member to a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()
    const { contactId, role, newContact } = body

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    let finalContactId = contactId

    // Create new contact if provided
    if (newContact && newContact.name) {
      const created = await prisma.contact.create({
        data: {
          name: newContact.name,
          email: newContact.email || null,
          phone: newContact.phone || null,
          type: newContact.type || 'OTHER',
          notes: newContact.notes || null,
        },
      })
      finalContactId = created.id
    }

    if (!finalContactId) {
      return NextResponse.json(
        { error: 'Contact ID or new contact data required' },
        { status: 400 }
      )
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    // Check if already exists
    const existing = await prisma.projectContact.findFirst({
      where: {
        projectId: id,
        contactId: finalContactId,
        role,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This contact is already added with this role' },
        { status: 400 }
      )
    }

    // Create the project-contact link
    const projectContact = await prisma.projectContact.create({
      data: {
        projectId: id,
        contactId: finalContactId,
        role,
      },
      include: {
        contact: {
          include: {
            company: true,
          },
        },
      },
    })

    return NextResponse.json(projectContact)
  } catch (error) {
    console.error('Error adding project contact:', error)
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/contacts - Remove a team member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contactId')
    const role = searchParams.get('role') as ProjectContactRole | null

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    const where: { projectId: string; contactId: string; role?: ProjectContactRole } = {
      projectId: id,
      contactId,
    }

    if (role) {
      where.role = role
    }

    await prisma.projectContact.deleteMany({ where })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing project contact:', error)
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}
