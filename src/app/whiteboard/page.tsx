import { prisma } from '@/lib/db'
import { ProjectStatus } from '@prisma/client'
import WhiteboardClient, { type ProjectItem } from './WhiteboardClient'

export const dynamic = 'force-dynamic'

const WHITEBOARD_COLUMNS: ProjectStatus[] = [
  'PACKAGING',
  'PITCHED',
  'DEVELOPING',
  'GREENLIT',
]

export default async function WhiteboardPage() {
  const projects = await prisma.project.findMany({
    where: {
      status: {
        in: WHITEBOARD_COLUMNS,
      },
    },
    include: {
      contacts: {
        include: { contact: true },
        where: { role: 'WRITER' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const serialized: ProjectItem[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    genre: p.genre,
    origin: p.origin,
    status: p.status as ProjectItem['status'],
    currentStage: p.currentStage,
    notes: p.notes,
    nextAction: p.nextAction,
    updatedAt: p.updatedAt.toISOString(),
    contacts: p.contacts.map((c) => ({
      contact: {
        name: c.contact.name,
      },
    })),
  }))

  return <WhiteboardClient initialProjects={serialized} />
}
