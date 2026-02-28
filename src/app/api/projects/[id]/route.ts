import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MaterialType, Prisma, ProjectStatus } from '@prisma/client'
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
      'firstReadAt',
      'readPriority',
      'considerRelationship',
      'rewriteStatus',
      'pitchReady',
      'pitchChecklist',
    ] as const

    const updateData: Prisma.ProjectUpdateInput = {}

    for (const field of allowedFields) {
      if (field in body) {
        // Type assertion needed for Prisma update input
        const value = body[field]
        if ((field === 'dateReceived' || field === 'optionExpiryDate' || field === 'firstReadAt') && value) {
          (updateData as Record<string, unknown>)[field] = new Date(value as string)
        } else {
          (updateData as Record<string, unknown>)[field] = value
        }
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

    const scriptTypes: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE']

    const project = await prisma.$transaction(async (tx) => {
      if ('companyId' in body) {
        await tx.projectCompany.deleteMany({ where: { projectId: id } })
        if (body.companyId) {
          await tx.projectCompany.create({
            data: { projectId: id, companyId: body.companyId, role: 'Primary' },
          })
        }
      }

      if (Array.isArray(body.genreTagIds)) {
        await tx.projectTag.deleteMany({ where: { projectId: id } })
        if (body.genreTagIds.length > 0) {
          await tx.projectTag.createMany({
            data: body.genreTagIds.map((tagId: string) => ({ projectId: id, tagId })),
            skipDuplicates: true,
          })

          const genreTags = await tx.tag.findMany({
            where: { id: { in: body.genreTagIds } },
            select: { name: true },
            orderBy: { name: 'asc' },
          })
          updateData.genre = genreTags.map((tag) => tag.name).join(', ')
        } else {
          updateData.genre = null
        }
      }


      if (!existingProject.firstReadAt && body.status && ['READING', 'READ', 'PASSED', 'CONSIDER_RELATIONSHIP', 'REWRITE_IN_PROGRESS'].includes(body.status)) {
        updateData.firstReadAt = new Date()
      }

      const updatedProject = await tx.project.update({
        where: { id },
        data: updateData,
      })

      // When moving a project to READ, also timestamp any unread script materials.
      // This keeps dashboard "Scripts Read" counters in sync with status changes.
      if (body.status === 'READ' && existingProject.status !== 'READ') {
        await tx.material.updateMany({
          where: {
            projectId: id,
            type: { in: scriptTypes },
            readAt: null,
          },
          data: { readAt: new Date() },
        })
      }

      return updatedProject
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
        tags: {
          include: {
            tag: true,
          },
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
