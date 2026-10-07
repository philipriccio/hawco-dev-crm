import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { fundingDeadlineInput } from '@/lib/funding-deadlines'
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return NextResponse.json({ error: 'Funding deadline not found' }, { status: 404 })
  return NextResponse.json({ error: 'Could not save the funding deadline. Please retry.' }, { status: 500 })
}
export async function GET(request: NextRequest) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  const archived = request.nextUrl.searchParams.get('archived')
  if (archived && !['true', 'false', 'all'].includes(archived)) return NextResponse.json({ error: 'Invalid archive filter' }, { status: 400 })
  try {
    const deadlines = await prisma.fundingDeadline.findMany({ where: archived === 'all' ? {} : { archived: archived === 'true' }, orderBy: { closingDate: 'asc' } })
    return NextResponse.json(deadlines.map(d => ({ ...d, closingDate: d.closingDate.toISOString().slice(0, 10) })))
  } catch (error) { return failure(error) }
}
async function save(request: NextRequest, creating: boolean) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  let body, data
  try {
    body = await request.json(); data = fundingDeadlineInput(body, creating)
    if (!creating && (typeof body.id !== 'string' || !body.id)) throw new Error('Deadline ID is required')
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 }) }
  try {
    const deadline = creating
      ? await prisma.fundingDeadline.create({ data: data as Prisma.FundingDeadlineUncheckedCreateInput })
      : await prisma.fundingDeadline.update({ where: { id: body.id }, data })
    return NextResponse.json({ ...deadline, closingDate: deadline.closingDate.toISOString().slice(0, 10) }, { status: creating ? 201 : 200 })
  } catch (error) { return failure(error) }
}
export const POST = (request: NextRequest) => save(request, true)
export const PATCH = (request: NextRequest) => save(request, false)
// Archive instead of destructive deletion, keeping prior rounds and their source evidence.
export async function DELETE(request: NextRequest) {
  const session = await requireApiAuth(); if (isAuthResponse(session)) return session
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Deadline ID is required' }, { status: 400 })
  try { await prisma.fundingDeadline.update({ where: { id }, data: { archived: true } }); return NextResponse.json({ success: true, archived: true }) } catch(error) { return failure(error) }
}
