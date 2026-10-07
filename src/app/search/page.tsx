import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { globalSearch, validateSearchQuery } from '@/lib/global-search'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  if (!await getSession()) redirect('/login')
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.trim() : ''
  let error = ''
  let results: Awaited<ReturnType<typeof globalSearch>> | null = null
  if (query) {
    try { validateSearchQuery(query) } catch { error = 'Enter between 2 and 120 characters to search.' }
    if (!error) {
      try { results = await globalSearch(query) } catch { error = 'Search is unavailable. Please try again.' }
    }
  }
  const groups = results ? [
    { title: 'Projects', items: results.projects.map(item => ({ id: item.id, title: item.title, detail: item.status.replaceAll('_', ' '), href: `/projects/${item.id}` })) },
    { title: 'People', items: results.contacts.map(item => ({ id: item.id, title: item.name, detail: item.type.replaceAll('_', ' '), href: `/contacts/${item.id}` })) },
    { title: 'Materials', items: results.materials.map(item => ({ id: item.id, title: item.title, detail: item.project?.title || item.type.replaceAll('_', ' '), href: `/materials?materialId=${encodeURIComponent(item.id)}` })) },
  ] : []
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Search</h1>
      <p className="mt-2 text-slate-600">Find projects, people and materials in one place.</p>
      <form action="/search" method="GET" className="my-6">
        <label htmlFor="global-search" className="mb-2 block text-sm font-medium">Search the CRM</label>
        <div className="flex gap-2">
          <input id="global-search" name="q" type="search" defaultValue={query} minLength={2} maxLength={120} required placeholder="Project, person or document…" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2" />
          <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">Search</button>
        </div>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
      {results && <p className="mb-4 text-sm text-slate-600">Results for “{query}”. Showing up to 20 per group.</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        {groups.map(group => <section key={group.title} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">{group.title} <span className="text-sm font-normal text-slate-500">{group.items.length}{group.items.length === 20 ? '+' : ''}</span></h2>
          {group.items.length === 0 ? <p className="text-sm text-slate-500">No matching {group.title.toLowerCase()}.</p> : <ul className="space-y-2">{group.items.map(item => <li key={item.id}><Link href={item.href} className="block rounded-lg p-2 hover:bg-blue-50"><span className="block break-words font-medium text-blue-800">{item.title}</span><span className="block break-words text-xs text-slate-500">{item.detail}</span></Link></li>)}</ul>}
        </section>)}
      </div>
    </div>
  )
}
