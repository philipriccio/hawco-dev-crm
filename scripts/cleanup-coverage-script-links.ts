import { prisma } from '../src/lib/db'

const SCRIPT_TYPES = ['PILOT_SCRIPT', 'FEATURE_SCRIPT', 'TREATMENT', 'SERIES_BIBLE'] as const

async function main() {
  const coverages = await prisma.coverage.findMany({
    where: { projectId: { not: null }, scriptId: { not: null } },
    select: {
      id: true,
      title: true,
      projectId: true,
      scriptId: true,
      script: { select: { id: true, title: true, type: true, projectId: true } },
      project: {
        select: {
          id: true,
          title: true,
          materials: {
            where: { type: { in: [...SCRIPT_TYPES] } },
            select: { id: true, title: true, type: true, createdAt: true, readAt: true },
            orderBy: [{ readAt: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  })

  let cleared = 0
  let repointed = 0
  const skipped: Array<{ id: string; title: string; reason: string }> = []

  for (const coverage of coverages) {
    if (!coverage.projectId || !coverage.scriptId) continue

    const linkedScript = coverage.script
    const linkedToSameProject = linkedScript?.projectId === coverage.projectId
    const linkedToReadableScript = linkedScript && SCRIPT_TYPES.includes(linkedScript.type as (typeof SCRIPT_TYPES)[number])

    if (linkedToSameProject && linkedToReadableScript) continue

    const projectScripts = coverage.project?.materials || []

    if (projectScripts.length === 1) {
      await prisma.coverage.update({
        where: { id: coverage.id },
        data: { scriptId: projectScripts[0].id },
      })
      repointed += 1
      console.log(`repointed ${coverage.title} (${coverage.id}) -> ${projectScripts[0].title} (${projectScripts[0].id})`)
      continue
    }

    await prisma.coverage.update({
      where: { id: coverage.id },
      data: { scriptId: null },
    })
    cleared += 1
    skipped.push({
      id: coverage.id,
      title: coverage.title,
      reason: projectScripts.length === 0 ? 'no script-type material on project' : 'multiple script-type materials; projectId is authoritative',
    })
    console.log(`cleared ${coverage.title} (${coverage.id}) — ${skipped[skipped.length - 1].reason}`)
  }

  console.log(JSON.stringify({ checked: coverages.length, repointed, cleared, skipped }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
