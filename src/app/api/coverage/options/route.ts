import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET() {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const [writers, sources] = await Promise.all([
      prisma.contact.findMany({
        where: { type: 'WRITER' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.coverage.findMany({
        where: { source: { not: null } },
        distinct: ['source'],
        select: { source: true },
        orderBy: { source: 'asc' },
      }),
    ])

    return NextResponse.json({
      writers,
      sources: sources.map((entry) => entry.source).filter((source): source is string => Boolean(source)),
    })
  } catch (error) {
    console.error('Error fetching coverage options:', error)
    return NextResponse.json({ error: 'Failed to fetch coverage options' }, { status: 500 })
  }
}
