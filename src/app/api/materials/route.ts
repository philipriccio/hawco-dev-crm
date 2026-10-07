import { NextRequest, NextResponse } from 'next/server'
import { MaterialType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { createMaterialIntake, IntakeError } from '@/lib/material-intake'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const materialId = searchParams.get('materialId')
    const search = searchParams.get('search')
    const read = searchParams.get('read')
    const orphans = searchParams.get('orphans')

    const where: Record<string, unknown> = {}

    if (materialId) {
      where.id = materialId
    }
    if (type) {
      // Support comma-separated types (e.g., "pilot,feature,bible")
      const types = type.split(',').map(t => t.trim().toUpperCase())
      if (types.some(value => !Object.values(MaterialType).includes(value as MaterialType))) return NextResponse.json({ error: 'Invalid material type filter' }, { status: 400 })
      if (types.length > 1) {
        where.type = { in: types }
      } else {
        where.type = types[0]
      }
    }
    if (projectId) {
      where.projectId = projectId
    } else if (orphans === 'true') {
      where.projectId = null
    }
    if (read === 'read') {
      where.readAt = { not: null }
    } else if (read === 'unread') {
      where.readAt = null
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const materials = await prisma.material.findMany({
      where,
      include: {
        project: true,
        submittedBy: true,
        writer: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const body = await request.json()
    const { material, replayed } = await createMaterialIntake(prisma, body)
    if (replayed) return NextResponse.json(material)

    // Log activity
    await logActivity({
      action: 'created',
      entityType: 'material',
      entityId: material.id,
      entityName: material.title,
    })

    return NextResponse.json(material)
  } catch (error) {
    if (error instanceof IntakeError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    console.error('Error creating material:', error)
    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    )
  }
}
