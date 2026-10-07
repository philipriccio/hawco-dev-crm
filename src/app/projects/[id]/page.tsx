import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getUploadedFileAccessUrl } from '@/lib/file-storage'
import ProjectDetailClient from './ProjectDetailClient'
import ProjectWorkflow from '@/components/ProjectWorkflow'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      followUps: { include: { contact: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: 'desc' } },
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
          writer: true,
          coverages: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      agreements: {
        include: {
          contacts: {
            include: { contact: true },
            orderBy: { contact: { name: 'asc' } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      developmentCosts: {
        orderBy: { spentAt: 'desc' },
      },
      coverages: {
        orderBy: { dateRead: 'desc' },
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
      rewriteCycles: {
        orderBy: { cycleNumber: 'desc' },
      },
    },
  })

  // Fetch available coverages that can be linked to this project
  // Exclude coverages already linked to this project (either directly or via materials)
  const linkedCoverageIds = new Set([
    ...(project?.materials.flatMap(m => m.coverages.map(c => c.id)) || []),
    ...(project?.coverages.map(c => c.id) || []),
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
      select: { id: true, name: true, isBuyer: true },
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

  const projectWithAgreementAccessUrls = {
    ...project,
    agreements: await Promise.all(
      project.agreements.map(async (agreement) => ({
        ...agreement,
        fileUrl: agreement.fileUrl
          ? await getUploadedFileAccessUrl(agreement.fileUrl, agreement.fileName)
          : null,
      }))
    ),
  }

  return (

    <ProjectDetailClient
      workflow={<ProjectWorkflow projectId={id} materials={project.materials.map(m => ({ id: m.id, title: m.title, familyId: m.familyId, supersedesId: m.supersedesId, approvedAt: m.approvedAt?.toISOString() || null, approvedBy: m.approvedBy, createdAt: m.createdAt.toISOString() }))} release={{ status: project.releaseStatus, evidence: project.releaseEvidence, reviewedBy: project.releaseReviewedBy, reviewedAt: project.releaseReviewedAt?.toISOString() || null }} followUps={project.followUps.map(f => ({ ...f, createdAt: f.createdAt.toISOString(), dueAt: f.dueAt?.toISOString() || null, completedAt: f.completedAt?.toISOString() || null, updatedAt: f.updatedAt.toISOString() }))} />}
      project={projectWithAgreementAccessUrls}
      availableCoverages={availableCoverages}
      availableCompanies={availableCompanies}
      availableGenreTags={availableGenreTags}
    />
  )
}
