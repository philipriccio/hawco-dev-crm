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

  if (!project) {
    notFound()
  }

  return <ProjectDetailClient project={project} />
}
