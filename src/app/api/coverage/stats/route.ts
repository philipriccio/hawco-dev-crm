import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET() {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Get all coverages for calculations
    const [allCoverages, weekCoverages, monthCoverages, yearCoverages] = await Promise.all([
      prisma.coverage.findMany({
        select: {
          verdict: true,
          scoreTotal: true,
          dateRead: true,
        },
      }),
      prisma.coverage.count({
        where: {
          dateRead: {
            gte: startOfWeek,
          },
        },
      }),
      prisma.coverage.count({
        where: {
          dateRead: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.coverage.count({
        where: {
          dateRead: {
            gte: startOfYear,
          },
        },
      }),
    ])

    // Calculate verdict breakdown
    const verdictCounts = allCoverages.reduce((acc, c) => {
      acc[c.verdict] = (acc[c.verdict] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate average score
    const scores = allCoverages
      .map((c) => c.scoreTotal)
      .filter((s): s is number => s !== null)
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null

    return NextResponse.json({
      counts: {
        week: weekCoverages,
        month: monthCoverages,
        year: yearCoverages,
        total: allCoverages.length,
      },
      verdicts: {
        PASS: verdictCounts.PASS || 0,
        CONSIDER: verdictCounts.CONSIDER || 0,
        RECOMMEND: verdictCounts.RECOMMEND || 0,
      },
      averageScore,
    })
  } catch (error) {
    console.error('Error fetching coverage stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coverage stats' },
      { status: 500 }
    )
  }
}
