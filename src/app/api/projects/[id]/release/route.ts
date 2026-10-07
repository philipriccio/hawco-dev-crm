import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  const { id } = await context.params
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!['MISSING', 'RECEIVED', 'NEEDS_REVIEW', 'VALID', 'NOT_REQUIRED'].includes(body.status) || typeof body.evidence !== 'string' || body.evidence.length > 5000 || (['VALID', 'NOT_REQUIRED', 'RECEIVED'].includes(body.status) && !body.evidence.trim())) return NextResponse.json({ error: 'Select a status and provide supporting evidence for received, valid, or not required.' }, { status: 400 })
  try {
    if (!await prisma.project.findUnique({ where: { id }, select: { id: true } })) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const project = await prisma.project.update({ where: { id }, data: { releaseStatus: body.status, releaseEvidence: body.evidence.trim() || null, releaseReviewedBy: session.name || session.email, releaseReviewedAt: new Date() } })
    return NextResponse.json({ status: project.releaseStatus, evidence: project.releaseEvidence, reviewedBy: project.releaseReviewedBy, reviewedAt: project.releaseReviewedAt })
  } catch { return NextResponse.json({ error: 'Could not update release review. Please retry.' }, { status: 500 }) }
}
