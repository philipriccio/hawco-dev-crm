import { prisma } from '@/lib/db'
import CoverageForm from '../CoverageForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ scriptId?: string; projectId?: string }>
}

export default async function NewCoveragePage({ searchParams }: PageProps) {
  const { scriptId, projectId } = await searchParams

  // Fetch materials and projects for dropdowns
  const [materials, projects, prefilledData] = await Promise.all([
    prisma.material.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
      },
    }),
    // If scriptId or projectId is provided, fetch the data to prefill
    scriptId
      ? prisma.material.findUnique({
          where: { id: scriptId },
          include: {
            project: {
              select: {
                id: true,
                title: true,
                contacts: {
                  where: { role: 'WRITER' },
                  include: { contact: { select: { name: true } } },
                  take: 1,
                },
              },
            },
            submittedBy: {
              select: { name: true },
            },
          },
        })
      : Promise.resolve(null),
  ])

  // Build prefill data from script if provided
  const prefillData: {
    title?: string
    writer?: string
    projectId?: string
    scriptId?: string
  } = {}

  if (prefilledData) {
    prefillData.scriptId = prefilledData.id
    prefillData.title = prefilledData.project?.title || prefilledData.title
    prefillData.writer =
      prefilledData.submittedBy?.name ||
      prefilledData.project?.contacts[0]?.contact.name ||
      ''
    if (prefilledData.project?.id) {
      prefillData.projectId = prefilledData.project.id
    }
  }

  // If only projectId is provided (no scriptId), fetch project data
  if (projectId && !scriptId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        contacts: {
          where: { role: 'WRITER' },
          include: { contact: { select: { name: true } } },
          take: 1,
        },
      },
    })

    if (project) {
      prefillData.projectId = project.id
      prefillData.title = project.title
      prefillData.writer = project.contacts[0]?.contact.name || ''
    }
  }

  return (
    <CoverageForm
      coverage={null}
      materials={materials}
      projects={projects}
      mode="create"
      prefillData={prefillData}
    />
  )
}
