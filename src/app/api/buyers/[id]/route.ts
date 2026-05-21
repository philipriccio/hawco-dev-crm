import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { logActivity } from '@/lib/activity'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { id } = await params
    const body = await request.json()
    const company = await prisma.company.update({
      where: { id },
      data: {
        lookingFor: typeof body.lookingFor === 'string' ? body.lookingFor : undefined,
        brands: typeof body.brands === 'string' ? body.brands : undefined,
        region: typeof body.region === 'string' ? body.region : undefined,
      },
    })
    await logActivity({ action: 'updated', entityType: 'company', entityId: company.id, entityName: company.name, changes: { lookingFor: true } })
    return NextResponse.json(company)
  } catch (error) {
    console.error('Error updating buyer:', error)
    return NextResponse.json({ error: 'Failed to update buyer' }, { status: 500 })
  }
}
