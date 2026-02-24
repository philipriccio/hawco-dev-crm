import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    const tags = await prisma.tag.findMany({
      where: category ? { category } : undefined,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, category } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || null,
        category: category || null,
      },
    })

    return NextResponse.json(tag)
  } catch (error: unknown) {
    console.error('Error creating tag:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}
