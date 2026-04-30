import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { ContactType, ProjectContactRole } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: projectId } = await params
    const body = await request.json()

    const { contactId, role, newContact } = body

    // If creating a new contact (inline)
    let finalContactId = contactId
    if (newContact && newContact.name) {
      // Check if company exists or create it
      let companyId = null
      if (newContact.company) {
        const existingCompany = await prisma.company.findFirst({
          where: { name: { equals: newContact.company, mode: 'insensitive' } },
        })
        if (existingCompany) {
          companyId = existingCompany.id
        } else {
          const newCompany = await prisma.company.create({
            data: { name: newContact.company, type: 'OTHER' },
          })
          companyId = newCompany.id
        }
      }

      // Handle agent - create or find
      let agentId = null
      if (newContact.agentName) {
        const existingAgent = await prisma.contact.findFirst({
          where: { 
            name: { equals: newContact.agentName, mode: 'insensitive' },
            type: 'AGENT',
          },
        })
        if (existingAgent) {
          agentId = existingAgent.id
        } else {
          const newAgent = await prisma.contact.create({
            data: {
              type: 'AGENT',
              name: newContact.agentName,
              companyId: newContact.agentCompany ? undefined : undefined,
            },
          })
          // Create company for agent if provided
          if (newContact.agentCompany) {
            const agentCompany = await prisma.company.findFirst({
              where: { name: { equals: newContact.agentCompany, mode: 'insensitive' } },
            })
            if (agentCompany) {
              await prisma.contact.update({ where: { id: newAgent.id }, data: { companyId: agentCompany.id } })
            } else {
              const created = await prisma.company.create({ data: { name: newContact.agentCompany, type: 'AGENCY' } })
              await prisma.contact.update({ where: { id: newAgent.id }, data: { companyId: created.id } })
            }
          }
          agentId = newAgent.id
        }
      }

      // Handle manager - create or find
      let managerId = null
      if (newContact.managerName) {
        const existingManager = await prisma.contact.findFirst({
          where: { 
            name: { equals: newContact.managerName, mode: 'insensitive' },
            type: 'MANAGER',
          },
        })
        if (existingManager) {
          managerId = existingManager.id
        } else {
          const newManager = await prisma.contact.create({
            data: {
              type: 'MANAGER',
              name: newContact.managerName,
            },
          })
          // Create company for manager if provided
          if (newContact.managerCompany) {
            const managerCompany = await prisma.company.findFirst({
              where: { name: { equals: newContact.managerCompany, mode: 'insensitive' } },
            })
            if (managerCompany) {
              await prisma.contact.update({ where: { id: newManager.id }, data: { companyId: managerCompany.id } })
            } else {
              const created = await prisma.company.create({ data: { name: newContact.managerCompany, type: 'OTHER' } })
              await prisma.contact.update({ where: { id: newManager.id }, data: { companyId: created.id } })
            }
          }
          managerId = newManager.id
        }
      }

      const createdContact = await prisma.contact.create({
        data: {
          type: (newContact.type as ContactType) || 'OTHER',
          name: newContact.name,
          email: newContact.email || null,
          phone: newContact.phone || null,
          companyId,
          agentId,
          managerId,
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