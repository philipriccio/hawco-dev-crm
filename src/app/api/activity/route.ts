import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const entityType = searchParams.get('entityType')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

    const where: Record<string, unknown> = {}

    if (userId) {
      where.userId = userId
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (fromDate || toDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (fromDate) {
        dateFilter.gte = new Date(fromDate)
      }
      if (toDate) {
        // Add a day to include the entire end date
        const endDate = new Date(toDate)
        endDate.setDate(endDate.getDate() + 1)
        dateFilter.lte = endDate
      }
      where.createdAt = dateFilter
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      activities,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (error) {
    console.error('Error fetching activity log:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}
