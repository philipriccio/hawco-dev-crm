import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const read = searchParams.get('read')

    const where: Record<string, unknown> = {}

    if (type) {
      // Support comma-separated types (e.g., "pilot,feature,bible")
      const types = type.split(',').map(t => t.trim().toUpperCase())
      if (types.length > 1) {
        where.type = { in: types }
      } else {
        where.type = types[0]
      }
    }
    if (projectId) {
      where.projectId = projectId
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
    const { type, title, filename, fileUrl, fileSize, mimeType, notes, projectId, submittedById, writerId, newWriter } = body

    if (!type || !title || !fileUrl) {
      return NextResponse.json(
        { error: 'Type, title, and file URL are required' },
        { status: 400 }
      )
    }

    // Handle new writer creation
    let finalWriterId = writerId
    if (newWriter && newWriter.name) {
      const createdWriter = await prisma.contact.create({
        data: {
          type: 'WRITER',
          name: newWriter.name,
          email: newWriter.email || null,
        },
      })
      finalWriterId = createdWriter.id
    }

    const material = await prisma.material.create({
      data: {
        type,
        title,
        filename: filename || title,
        fileUrl,
        fileSize,
        mimeType,
        notes,
        projectId,
        submittedById,
        writerId: finalWriterId,
      },
      include: {
        project: true,
        submittedBy: true,
        writer: true,
      },
    })

    // Log activity
    await logActivity({
      action: 'created',
      entityType: 'material',
      entityId: material.id,
      entityName: material.title,
    })

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    )
  }
}
