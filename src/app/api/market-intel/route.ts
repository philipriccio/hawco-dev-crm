import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (network && network !== 'all') {
      where.network = network
    }
    if (status && status !== 'all') {
      where.status = {
        contains: status,
        mode: 'insensitive',
      }
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { genre: { contains: search, mode: 'insensitive' } },
        { prodCompany: { contains: search, mode: 'insensitive' } },
        { distributor: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const shows = await prisma.currentShow.findMany({
      where,
      orderBy: [
        { network: 'asc' },
        { title: 'asc' },
      ],
    })

    return NextResponse.json(shows)
  } catch (error) {
    console.error('Error fetching shows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shows' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { network, title, genre, prodCompany, distributor, status, notes } = body

    if (!network || !title) {
      return NextResponse.json(
        { error: 'Network and title are required' },
        { status: 400 }
      )
    }

    const show = await prisma.currentShow.create({
      data: {
        network,
        title,
        genre,
        prodCompany,
        distributor,
        status,
        notes,
      },
    })

    return NextResponse.json(show)
  } catch (error) {
    console.error('Error creating show:', error)
    return NextResponse.json(
      { error: 'Failed to create show' },
      { status: 500 }
    )
  }
}
