import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ProjectDetailClient from './ProjectDetailClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      contacts: {
        include: {
          contact: {
            include: {
              company: true,
            },
          },
        },
      },
      companies: {
        include: {
          company: true,
        },
      },
      materials: {
        include: {
          submittedBy: true,
          coverages: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      reviews: {
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  // Fetch available coverages that can be linked to this project
  // Exclude coverages already linked to this project (either directly or via materials)
  const linkedCoverageIds = new Set([
    ...(project?.materials.flatMap(m => m.coverages.map(c => c.id)) || []),
  ])
  
  const [availableCoverages, availableCompanies, availableGenreTags] = await Promise.all([
    prisma.coverage.findMany({
      where: {
        id: { notIn: Array.from(linkedCoverageIds) },
      },
      orderBy: { dateRead: 'desc' },
      take: 50,
    }),
    prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      where: { category: 'genre' },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!project) {
    notFound()
  }

  return (
    <ProjectDetailClient
      project={project}
      availableCoverages={availableCoverages}
      availableCompanies={availableCompanies}
      availableGenreTags={availableGenreTags}
    />
  )
}
