import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { followUpInput } from '@/lib/follow-up-input'
const include = { contact: { select: { id: true, name: true, type: true } }, project: { select: { id: true, title: true } } }
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  return NextResponse.json({ error: 'Unable to save follow-up. Check the linked contact and project, then retry.' }, { status: 500 })
}
export async function GET(request: NextRequest) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  const q = request.nextUrl.searchParams
  if (q.has('completed') && !['true', 'false'].includes(q.get('completed')!)) return NextResponse.json({ error: 'Invalid completed filter' }, { status: 400 })
  try { return NextResponse.json(await prisma.followUp.findMany({ where: { ...(q.get('contactId') ? { contactId: q.get('contactId')! } : {}), ...(q.get('projectId') ? { projectId: q.get('projectId')! } : {}), ...(q.has('completed') ? { completed: q.get('completed') === 'true' } : {}) }, include, orderBy: [{ completed: 'asc' }, { dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }] })) } catch (e) { return failure(e) }
}
async function save(request: NextRequest, creating: boolean) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  let body, data
  try { body = await request.json(); data = followUpInput(body, creating); if (!creating && typeof body.id !== 'string') throw new Error('id is required') } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid request' }, { status: 400 }) }
  try {
    const existing = !creating ? await prisma.followUp.findUnique({ where: { id: body.id } }) : null
    if (!creating && !existing) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    const merged = { ...existing, ...data }
    if (!merged.contactId && !merged.projectId) return NextResponse.json({ error: 'Keep a contact or project linked' }, { status: 400 })
    if (merged.contactId && !await prisma.contact.findUnique({ where: { id: String(merged.contactId) }, select: { id: true } })) return NextResponse.json({ error: 'Contact not found' }, { status: 400 })
    if (merged.projectId && !await prisma.project.findUnique({ where: { id: String(merged.projectId) }, select: { id: true } })) return NextResponse.json({ error: 'Project not found' }, { status: 400 })
    const result = creating ? await prisma.followUp.create({ data: data as Prisma.FollowUpUncheckedCreateInput, include }) : await prisma.followUp.update({ where: { id: body.id }, data, include })
    return NextResponse.json(result, { status: creating ? 201 : 200 })
  } catch (e) { return failure(e) }
}
export const POST = (request: NextRequest) => save(request, true)
export const PATCH = (request: NextRequest) => save(request, false)
export async function DELETE(request: NextRequest) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  const id = request.nextUrl.searchParams.get('id'); if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  try { await prisma.followUp.delete({ where: { id } }); return NextResponse.json({ success: true }) } catch (e) { return failure(e) }
}
