import { NextRequest, NextResponse } from 'next/server'
import { isCoverageSample } from '@/lib/coverage-save'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireApiAuth()
  if (isAuthResponse(session)) return session
  try {
    const query = request.nextUrl.searchParams
    const scriptId = query.get('scriptId') || null
    let projectId = query.get('projectId') || null
    const material = scriptId ? await prisma.material.findUnique({ where: { id: scriptId }, select: { id: true, title: true, projectId: true, writer: { select: { name: true } } } }) : null
    if (scriptId && !material) return NextResponse.json({ error: 'Selected material no longer exists' }, { status: 404 })
    if (material && projectId && material.projectId !== projectId) return NextResponse.json({ error: 'Selected material does not belong to this project' }, { status: 400 })
    projectId ||= material?.projectId ?? null
    if (!projectId) return NextResponse.json({ error: 'Choose a project to prefill coverage' }, { status: 400 })
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true, title: true, logline: true, synopsis: true, genre: true, format: true,
        contacts: { where: { role: 'WRITER' }, select: { contact: { select: { name: true } } } },
        materials: { where: { type: { in: ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE', 'PITCH_DECK', 'ONE_PAGER', 'TREATMENT'] } }, select: { id: true, title: true, type: true, createdAt: true, notes: true }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!project) return NextResponse.json({ error: 'Project no longer exists' }, { status: 404 })
    const selected = scriptId ? project.materials.find(m => m.id === scriptId) : null
    // A writer sample can belong to a different story than its containing project.
    const sample = selected && isCoverageSample(selected)
    return NextResponse.json({
      ...project,
      projectTitle: project.title,
      materials: project.materials.map(m => ({ id: m.id, title: m.title, type: m.type, createdAt: m.createdAt })),
      title: material?.title || project.title,
      writer: material?.writer?.name || project.contacts.map(({ contact }) => contact.name).join(' & '),
      logline: sample ? null : project.logline,
      synopsis: sample ? null : project.synopsis,
      genre: sample ? null : project.genre,
      warning: sample ? 'This material is labelled as a sample or unrelated story. Project summaries and genre were not copied; enter details for the material you read.' : '',
    })
  } catch {
    return NextResponse.json({ error: 'Could not load coverage details. Retry or enter them manually.' }, { status: 500 })
  }
}
