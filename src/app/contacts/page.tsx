import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const typeColors: Record<string, string> = {
  WRITER: 'bg-purple-100 text-purple-700',
  AGENT: 'bg-blue-100 text-blue-700',
  NETWORK_EXEC: 'bg-green-100 text-green-700',
  PRODUCER: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-slate-100 text-slate-700',
}

const typeLabels: Record<string, string> = {
  WRITER: 'Writer',
  AGENT: 'Agent',
  NETWORK_EXEC: 'Network Exec',
  PRODUCER: 'Producer',
  OTHER: 'Other',
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string }>
}) {
  const params = await searchParams
  
  const where: Record<string, unknown> = {}
  
  if (params.type) {
    where.type = params.type.toUpperCase()
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { notes: { contains: params.search, mode: 'insensitive' } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      company: true,
      _count: {
        select: {
          projectContacts: true,
          materials: true,
        }
      }
    },
    orderBy: { name: 'asc' },
  })

  const counts = await prisma.contact.groupBy({
    by: ['type'],
    _count: { type: true },
  })

  const countMap = Object.fromEntries(
    counts.map((c) => [c.type, c._count.type])
  )

  const totalCount = contacts.length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 mt-1">Writers, agents, and network executives</p>
        </div>
        <Link
          href="/contacts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterPill href="/contacts" active={!params.type} count={totalCount}>
            All
          </FilterPill>
          <FilterPill href="/contacts?type=writer" active={params.type === 'writer'} count={countMap['WRITER'] || 0}>
            Writers
          </FilterPill>
          <FilterPill href="/contacts?type=agent" active={params.type === 'agent'} count={countMap['AGENT'] || 0}>
            Agents
          </FilterPill>
          <FilterPill href="/contacts?type=network_exec" active={params.type === 'network_exec'} count={countMap['NETWORK_EXEC'] || 0}>
            Network Execs
          </FilterPill>
        </div>
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <Link
            key={contact.id}
            href={`/contacts/${contact.id}`}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-slate-600">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
                  {contact.isCanadian && (
                    <span title="Canadian">🇨🇦</span>
                  )}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[contact.type]}`}>
                    {typeLabels[contact.type]}
                  </span>
                </div>
                {contact.company && (
                  <p className="text-sm text-slate-500 mt-0.5">{contact.company.name}</p>
                )}
                {contact.email && (
                  <p className="text-sm text-slate-400 truncate mt-1">{contact.email}</p>
                )}
                {contact.type === 'WRITER' && contact.writerLevel && (
                  <p className="text-xs text-slate-400 mt-2">
                    {contact.writerLevel.replace('_', ' ')} · {contact._count.projectContacts} projects
                  </p>
                )}
                {contact.type === 'NETWORK_EXEC' && contact.execTitle && (
                  <p className="text-xs text-slate-400 mt-2">{contact.execTitle}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
        {contacts.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-slate-500">
              No contacts found. <Link href="/contacts/new" className="text-amber-600 hover:underline">Add your first contact</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPill({ 
  href, 
  active, 
  count, 
  children 
}: { 
  href: string
  active: boolean
  count: number
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active 
          ? 'bg-amber-500 text-white' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-amber-200' : 'text-slate-400'}`}>
        {count}
      </span>
    </Link>
  )
}
