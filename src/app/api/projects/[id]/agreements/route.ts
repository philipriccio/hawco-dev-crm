import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function cleanDate(value: unknown) {
  const text = cleanString(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function cleanContactLinks(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => {
      if (typeof entry === 'string') return { contactId: entry.trim(), role: null }
      if (!entry || typeof entry !== 'object') return null

      const contactId = cleanString((entry as { contactId?: unknown }).contactId)
      if (!contactId) return null

      return {
        contactId,
        role: cleanString((entry as { role?: unknown }).role),
      }
    })
    .filter((entry): entry is { contactId: string; role: string | null } => Boolean(entry))
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
    const title = cleanString(body.title)
    const contactLinks = cleanContactLinks(body.contacts || body.contactLinks)

    if (!title) {
      return NextResponse.json({ error: 'Agreement title is required' }, { status: 400 })
    }

    const agreement = await prisma.projectAgreement.create({
      data: {
        projectId: id,
        title,
        agreementType: cleanString(body.agreementType),
        status: cleanString(body.status),
        counterparty: cleanString(body.counterparty),
        effectiveDate: cleanDate(body.effectiveDate),
        expiryDate: cleanDate(body.expiryDate),
        fileName: cleanString(body.fileName),
        fileUrl: cleanString(body.fileUrl),
        fileSize: typeof body.fileSize === 'number' ? body.fileSize : null,
        mimeType: cleanString(body.mimeType),
        notes: cleanString(body.notes),
        contacts: contactLinks.length > 0
          ? {
              create: contactLinks.map((contact) => ({
                contactId: contact.contactId,
                role: contact.role,
              })),
            }
          : undefined,
      },
      include: {
        contacts: {
          include: { contact: true },
          orderBy: { contact: { name: 'asc' } },
        },
      },
    })

    await logActivity({
      action: 'created',
      entityType: 'project_agreement',
      entityId: agreement.id,
      entityName: agreement.title,
      changes: { projectId: id },
    })

    return NextResponse.json(agreement)
  } catch (error) {
    console.error('Error creating agreement:', error)
    return NextResponse.json({ error: 'Failed to create agreement' }, { status: 500 })
  }
}
