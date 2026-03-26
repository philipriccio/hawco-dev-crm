import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const notes = await prisma.buyerNote.findMany({
      orderBy: { buyer: 'asc' },
    })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching buyer notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buyer notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buyer, notes } = body

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer is required' },
        { status: 400 }
      )
    }

    // Upsert: create or update by buyer name
    const existing = await prisma.buyerNote.findFirst({
      where: { buyer },
    })

    let result
    if (existing) {
      result = await prisma.buyerNote.update({
        where: { id: existing.id },
        data: { notes: notes || '' },
      })
    } else {
      result = await prisma.buyerNote.create({
        data: { buyer, notes: notes || '' },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error saving buyer note:', error)
    return NextResponse.json(
      { error: 'Failed to save buyer note' },
      { status: 500 }
    )
  }
}
