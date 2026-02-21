import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import CoverageDetailClient from './CoverageDetailClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CoverageDetailPage({ params }: PageProps) {
  const { id } = await params

  const coverage = await prisma.coverage.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          genre: true,
        },
      },
      script: {
        select: {
          id: true,
          title: true,
          type: true,
          filename: true,
          fileUrl: true,
        },
      },
    },
  })

  if (!coverage) {
    notFound()
  }

  return <CoverageDetailClient coverage={coverage} />
}
