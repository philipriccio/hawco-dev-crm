import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // 1. Update Halfyard - keep DEVELOPING, add note about Crave paying
    await prisma.project.updateMany({
      where: { title: 'Halfyard' },
      data: {
        status: 'DEVELOPING',
        notes: 'In active development with Crave. Crave paid for development. One Pager stage.'
      }
    })

    // 2. Update The Vig - change to PASSED, add note about Crave passing
    await prisma.project.updateMany({
      where: { title: 'The Vig' },
      data: {
        status: 'PASSED',
        notes: 'New Montreal version pitched to Crave. Crave/CTV passed on it.'
      }
    })

    // 3. Update Worst Breakup Ever - change to PACKAGING (looking for development partner)
    await prisma.project.updateMany({
      where: { title: 'Worst Breakup Ever' },
      data: {
        status: 'PACKAGING',
        notes: 'Pitch Deck needs revisions. Looking for development partner. Target: Crave/Bell, 2nd choice Netflix Canada.'
      }
    })

    // Return updated statuses
    const originals = await prisma.project.findMany({
      where: {
        origin: 'HAWCO_ORIGINAL'
      },
      select: {
        title: true,
        status: true,
        notes: true
      },
      orderBy: { title: 'asc' }
    })

    return NextResponse.json({
      success: true,
      message: 'Project statuses updated',
      projects: originals
    })
  } catch (error) {
    console.error('Error updating statuses:', error)
    return NextResponse.json(
      { error: 'Failed to update statuses' },
      { status: 500 }
    )
  }
}
