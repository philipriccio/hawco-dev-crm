import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isCoverageSample } from '@/lib/coverage-save'
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
          genre: true,
        },
      },
      script: {
        select: {
          id: true,
          title: true,
          notes: true,
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
      where: { type: { in: ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'SERIES_BIBLE', 'PITCH_DECK', 'ONE_PAGER', 'TREATMENT'] } },
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
      coverage={{ ...coverage, genre: coverage.genre ?? (coverage.script && isCoverageSample(coverage.script) ? null : coverage.project?.genre ?? null) }}
      materials={materials}
      projects={projects}
      mode="edit"
    />
  )
}
