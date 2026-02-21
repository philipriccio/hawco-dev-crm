import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import CoverageForm from '../../CoverageForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCoveragePage({ params }: PageProps) {
  const { id } = await params

  const coverage = await prisma.coverage.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      script: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!coverage) {
    notFound()
  }

  // Fetch materials and projects for dropdowns
  const [materials, projects] = await Promise.all([
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
  ])

  return (
    <CoverageForm
      coverage={coverage}
      materials={materials}
      projects={projects}
      mode="edit"
    />
  )
}
