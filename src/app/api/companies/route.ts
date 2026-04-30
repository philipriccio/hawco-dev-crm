import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

// GET all companies
export async function GET() {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    
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
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
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

    // Log activity
    await logActivity({
      action: 'created',
      entityType: 'company',
      entityId: company.id,
      entityName: company.name,
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
