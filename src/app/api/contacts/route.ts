import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContactType, WriterLevel } from '@prisma/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}

  if (type) {
    where.type = type.toUpperCase()
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      company: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(contacts)
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Clean up empty strings to null
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ])
    )

    // Handle nested agent creation for writers
    let agentId = cleanData.agentId as string | null
    
    // If new agent data is provided, create the agent first
    if (cleanData.newAgent && (cleanData.newAgent as { name?: string }).name) {
      const newAgent = await prisma.contact.create({
        data: {
          type: 'AGENT',
          name: (cleanData.newAgent as { name: string }).name,
          email: (cleanData.newAgent as { email?: string }).email || null,
          phone: (cleanData.newAgent as { phone?: string }).phone || null,
          agentVibe: (cleanData.newAgent as { company?: string }).company || null,
        },
      })
      agentId = newAgent.id
    }

    const contact = await prisma.contact.create({
      data: {
        type: cleanData.type as ContactType,
        name: cleanData.name as string,
        email: cleanData.email as string | null,
        phone: cleanData.phone as string | null,
        imdbUrl: cleanData.imdbUrl as string | null,
        notes: cleanData.notes as string | null,
        agentId: agentId,
        // Writer fields
        writerLevel: cleanData.writerLevel as WriterLevel | null,
        writerGenres: cleanData.writerGenres as string | null,
        writerVoice: cleanData.writerVoice as string | null,
        citizenship: cleanData.citizenship as string | null,
        isCanadian: (cleanData.isCanadian as boolean) || false,
        unionMembership: cleanData.unionMembership as string | null,
        // Agent fields
        agentVibe: cleanData.agentVibe as string | null,
        // Network exec fields
        execTitle: cleanData.execTitle as string | null,
        execRole: cleanData.execRole as string | null,
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
