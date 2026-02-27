import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma, ProjectStatus } from '@prisma/client'
import { logActivity, calculateChanges } from '@/lib/activity'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get existing project for change tracking
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Define allowed fields for update
    const allowedFields = [
      'title',
      'status',
      'logline',
      'synopsis',
      'genre',
      'format',
      'comps',
      'currentStage',
      'packagingNeeds',
      'nextAction',
      'targetNetwork',
      'notes',
      'verdict',
      'origin',
      'intlPotential',
      'dateReceived',
      'optionExpiryDate',
    ] as const

    const updateData: Prisma.ProjectUpdateInput = {}

    for (const field of allowedFields) {
      if (field in body) {
        // Type assertion needed for Prisma update input
        (updateData as Record<string, unknown>)[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (body.status) {
      const validStatuses = Object.values(ProjectStatus)
      if (!validStatuses.includes(body.status as ProjectStatus)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        )
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    // Log activity with changes
    const changes = calculateChanges(
      existingProject as unknown as Record<string, unknown>,
      updateData as Record<string, unknown>
    )
    await logActivity({
      action: 'updated',
      entityType: 'project',
      entityId: project.id,
      entityName: project.title,
      changes,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
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
    
    // Get project name before deleting
    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true },
    })

    await prisma.project.delete({
      where: { id },
    })

    // Log activity
    if (project) {
      await logActivity({
        action: 'deleted',
        entityType: 'project',
        entityId: id,
        entityName: project.title,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        contacts: {
          include: {
            contact: {
              include: {
                company: true,
              },
            },
          },
        },
        companies: {
          include: {
            company: true,
          },
        },
        materials: {
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}
