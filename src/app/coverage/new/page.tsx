import NewCoverageForm from './NewCoverageForm'

export default async function NewCoveragePage({ searchParams }: { searchParams: Promise<{ projectId?: string; scriptId?: string }> }) {
  const query = await searchParams
  return <NewCoverageForm initialProjectId={query.projectId} initialScriptId={query.scriptId} />
}
