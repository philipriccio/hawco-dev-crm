import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseAmountCents(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100)
  const text = cleanString(value)
  if (!text) return null
  const amount = Number(text.replace(/[$,\s]/g, ''))
  if (!Number.isFinite(amount)) return null
  return Math.round(amount * 100)
}

function cleanDate(value: unknown) {
  const text = cleanString(value)
  if (!text) return new Date()
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()
    const description = cleanString(body.description)
    const amountCents = parseAmountCents(body.amount)

    if (!description) {
      return NextResponse.json({ error: 'Cost description is required' }, { status: 400 })
    }

    if (amountCents === null || amountCents < 0) {
      return NextResponse.json({ error: 'Enter a valid non-negative amount' }, { status: 400 })
    }

    const cost = await prisma.developmentCost.create({
      data: {
        projectId: id,
        description,
        category: cleanString(body.category),
        vendor: cleanString(body.vendor),
        amountCents,
        currency: cleanString(body.currency)?.toUpperCase() || 'CAD',
        spentAt: cleanDate(body.spentAt),
        notes: cleanString(body.notes),
      },
    })

    await logActivity({
      action: 'created',
      entityType: 'development_cost',
      entityId: cost.id,
      entityName: cost.description,
      changes: { projectId: id, amountCents: cost.amountCents, currency: cost.currency },
    })

    return NextResponse.json(cost)
  } catch (error) {
    console.error('Error creating development cost:', error)
    return NextResponse.json({ error: 'Failed to create development cost' }, { status: 500 })
  }
}
