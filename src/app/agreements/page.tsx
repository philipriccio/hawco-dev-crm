import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Hub from './Hub'
export const dynamic = 'force-dynamic'
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAuth()
  const params = await searchParams
  const [agreements, workspaces, projects, ips, contacts, templates] =
    await Promise.all([
      prisma.projectAgreement.findMany({
        include: { project: { select: { id: true, title: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.agreementWorkspace.findMany(),
      prisma.project.findMany({
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      }),
      prisma.ipProperty.findMany({
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      }),
      prisma.contact.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.agreementTemplate.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, type: true, versionLabel: true, hash: true },
      }),
    ])
  return (
    <Hub
      data={JSON.parse(
        JSON.stringify({
          agreements: agreements.map((a) => ({
            ...a,
            workspace: workspaces.find((w) => w.id === a.id)?.data ?? null,
          })),
          projects,
          ips,
          contacts,
          templates,
          defaultProjectId:
            typeof params.projectId === 'string' &&
            projects.some((p) => p.id === params.projectId)
              ? params.projectId
              : '',
          startNew: params.new === '1',
        }),
      )}
    />
  )
}
