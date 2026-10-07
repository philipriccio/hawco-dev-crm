import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { validateVersionLink } from '@/lib/material-version-input'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  const { id } = await context.params
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (typeof body.materialId !== 'string' || typeof body.familyId !== 'string' || !body.familyId.trim() || body.familyId.length > 120 || (body.supersedesId != null && typeof body.supersedesId !== 'string') || typeof body.approved !== 'boolean') return NextResponse.json({ error: 'Choose a material, family name, and approval state' }, { status: 400 })
  try {
    const result = await prisma.$transaction(async tx => {
      const materials = await tx.material.findMany({ where: { projectId: id }, select: { id: true, title: true, familyId: true, supersedesId: true, approvedAt: true, approvedBy: true } })
      const { material, familyId } = validateVersionLink(materials, body.materialId, body.familyId, body.supersedesId || null)
      if (body.approved) await tx.material.updateMany({ where: { projectId: id, familyId }, data: { approvedAt: null, approvedBy: null } })
      const updated = await tx.material.update({ where: { id: material.id }, data: { familyId, supersedesId: body.supersedesId || null, approvedAt: body.approved ? new Date() : null, approvedBy: body.approved ? (session.name || session.email) : null } })
      // Preserve every displaced approval before updating the current pointer; audit is atomic.
      const affected = materials.filter(m => m.id === material.id || (body.approved && m.familyId === familyId && m.approvedAt))
      for (const prior of affected) {
        const after = prior.id === material.id ? updated : { ...prior, approvedAt: null, approvedBy: null }
        await tx.activityLog.create({ data: {
          userId: session.id, action: 'updated', entityType: 'material', entityId: prior.id, entityName: prior.title,
          changes: {
            reason: prior.id === material.id ? 'Version classification and approval review' : 'Current approval replaced by another draft',
            projectId: id, replacementMaterialId: body.approved ? material.id : null,
            before: { familyId: prior.familyId, supersedesId: prior.supersedesId, approvedAt: prior.approvedAt?.toISOString() || null, approvedBy: prior.approvedBy },
            after: { familyId: after.familyId, supersedesId: after.supersedesId, approvedAt: after.approvedAt?.toISOString() || null, approvedBy: after.approvedBy },
          },
        } })
      }
      return updated
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) return NextResponse.json({ error: 'Versions changed or that draft already has a successor. Refresh and retry.' }, { status: 409 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to save versions' }, { status: 400 })
  }
}
