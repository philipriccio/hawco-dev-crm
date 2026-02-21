import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET all companies
export async function GET() {
  try {
    await requireAuth()
    
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { contacts: true, projects: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// POST create new company
export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const body = await request.json()

    const { name, type, website, notes } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        type: type || 'OTHER',
        website: website || null,
        notes: notes || null
      }
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}