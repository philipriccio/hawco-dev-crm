import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MaterialType, Prisma, ProjectStatus } from '@prisma/client'
import { logActivity, calculateChanges } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { normalizeTargetBuyerRole, targetBuyerRoleOptions } from '@/lib/target-buyers'

const targetBuyerRoleValues = new Set<string>(targetBuyerRoleOptions.map((option) => option.value))
const projectVerdictValues = new Set(['PASS', 'CONSIDER', 'RECOMMEND'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
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

    if (body.verdict && !projectVerdictValues.has(String(body.verdict))) {
      return NextResponse.json(
        { error: 'Invalid verdict value' },
        { status: 400 }
      )
    }

    if (body.verdict === 'PASS') {
      updateData.status = 'PASSED'
      updateData.nextAction = null
    } else if (body.verdict === 'CONSIDER') {
      updateData.status = 'CONSIDERING'
      updateData.nextAction = null
    } else if (body.verdict === 'RECOMMEND' && !('status' in body)) {
      updateData.status = 'EARLY_DEVELOPMENT'
    }

    const readableMaterialTypes: MaterialType[] = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'PITCH_DECK', 'ONE_PAGER', 'TREATMENT', 'SERIES_BIBLE']
    const hasReadToggle = typeof body.markAsRead === 'boolean'
    const hasCompanyUpdate = 'companyId' in body
    const hasTargetBuyerCompanyIds = Array.isArray(body.targetBuyerCompanyIds)
    const hasTargetBuyerLinks = Array.isArray(body.targetBuyerLinks)
    const hasGenreTagIds = Array.isArray(body.genreTagIds)

    if (hasReadToggle && !('status' in body) && !body.verdict) {
      if (body.markAsRead) {
        updateData.status = 'READ'
      } else if (existingProject.status === 'READ') {
        updateData.status = 'READING'
      }
    }

    if (
      Object.keys(updateData).length === 0 &&
      !hasCompanyUpdate &&
      !hasTargetBuyerCompanyIds &&
      !hasTargetBuyerLinks &&
      !hasGenreTagIds
    ) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const targetBuyerLinks: Array<{ companyId: string; role: string }> | null = hasTargetBuyerLinks
      ? body.targetBuyerLinks
          .filter((entry: unknown): entry is { companyId: string; role?: string | null } => (
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof (entry as { companyId?: unknown }).companyId === 'string'
          ))
          .map((entry: { companyId: string; role?: string | null }) => ({
            companyId: entry.companyId,
            role: targetBuyerRoleValues.has(entry.role || '')
              ? normalizeTargetBuyerRole(entry.role)
              : 'TARGET_BUYER',
          }))
      : null

    const project = await prisma.$transaction(async (tx) => {
      if (hasCompanyUpdate) {
        await tx.projectCompany.deleteMany({
          where: {
            projectId: id,
            OR: [{ role: null }, { NOT: { role: { startsWith: 'TARGET_BUYER' } } }],
          },
        })
        if (body.companyId) {
          await tx.projectCompany.create({
            data: { projectId: id, companyId: body.companyId, role: 'Primary' },
          })
        }
      }

      if (targetBuyerLinks) {
        await tx.projectCompany.deleteMany({ where: { projectId: id, role: { startsWith: 'TARGET_BUYER' } } })
        if (targetBuyerLinks.length > 0) {
          await tx.projectCompany.createMany({
            data: targetBuyerLinks.map(({ companyId, role }) => ({
              projectId: id,
              companyId,
              role,
            })),
            skipDuplicates: true,
          })
        }
      } else if (hasTargetBuyerCompanyIds) {
        await tx.projectCompany.deleteMany({ where: { projectId: id, role: { startsWith: 'TARGET_BUYER' } } })
        if (body.targetBuyerCompanyIds.length > 0) {
          await tx.projectCompany.createMany({
            data: body.targetBuyerCompanyIds.map((companyId: string) => ({
              projectId: id,
              companyId,
              role: 'TARGET_BUYER',
            })),
            skipDuplicates: true,
          })
        }
      }

      if (hasGenreTagIds) {
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


      const incomingStatus = (updateData.status as ProjectStatus | undefined) ?? (body.status as ProjectStatus | undefined)
      if (!existingProject.firstReadAt && incomingStatus && ['READING', 'READ', 'CONSIDERING', 'PASSED', 'CONSIDER_RELATIONSHIP', 'EARLY_DEVELOPMENT', 'REWRITE_IN_PROGRESS'].includes(incomingStatus)) {
        updateData.firstReadAt = new Date()
      }

      const updatedProject = Object.keys(updateData).length > 0
        ? await tx.project.update({
            where: { id },
            data: updateData,
          })
        : await tx.project.findUniqueOrThrow({ where: { id } })

      const targetStatus = (updateData.status as ProjectStatus | undefined) ?? (body.status as ProjectStatus | undefined)

      const shouldMarkReadableMaterialsRead = (
        body.markAsRead === true ||
        ['READ', 'CONSIDERING', 'PASSED', 'EARLY_DEVELOPMENT'].includes(targetStatus || '') ||
        projectVerdictValues.has(String(body.verdict || ''))
      )

      // Keep readable material state in sync when a project is sorted out of the unread workflow.
      if (shouldMarkReadableMaterialsRead) {
        await tx.material.updateMany({
          where: {
            projectId: id,
            type: { in: readableMaterialTypes },
            readAt: null,
          },
          data: { readAt: new Date() },
        })
      }

      if (hasReadToggle && body.markAsRead === false) {
        await tx.material.updateMany({
          where: {
            projectId: id,
            type: { in: readableMaterialTypes },
            readAt: { not: null },
          },
          data: { readAt: null },
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
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
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
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
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
