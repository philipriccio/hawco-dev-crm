import Link from 'next/link'
import { prisma } from '@/lib/db'

function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1]?.toLowerCase() || ''
}

function getFirstNames(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, -1).join(' ').toLowerCase()
}

export const dynamic = 'force-dynamic'

const typeColors: Record<string, string> = {
  WRITER: 'bg-purple-100 text-purple-700',
  AGENT: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  NETWORK_EXEC: 'bg-green-100 text-green-700',
  PRODUCER: 'bg-orange-100 text-orange-700',
  BUYER: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-[#F2F4F7] text-slate-700',
}

const typeLabels: Record<string, string> = {
  WRITER: 'Writer',
  AGENT: 'Agent',
  MANAGER: 'Manager',
  NETWORK_EXEC: 'Network Exec',
  PRODUCER: 'Producer',
  BUYER: 'Buyer',
  OTHER: 'Other',
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; view?: string }>
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

  const contactsRaw = await prisma.contact.findMany({
    where,
    include: {
      company: true,
      writerSignals: true,
      meetingAttendees: {
        include: { meeting: true },
      },
      projectContacts: { include: { project: true } },
      _count: {
        select: {
          projectContacts: true,
          materials: true,
        }
      }
    },
  })

  const contactsBase = [...contactsRaw].sort((a, b) => {
    const lastCmp = getLastName(a.name).localeCompare(getLastName(b.name))
    if (lastCmp !== 0) return lastCmp
    return getFirstNames(a.name).localeCompare(getFirstNames(b.name))
  })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const staleCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const contactsWithHealth = contactsBase.map((contact) => {
    const signalScore = contact.writerSignals.length * 8
    const recentMeeting = contact.meetingAttendees.some((ma) => new Date(ma.meeting.date) >= monthStart) ? 15 : 0
    const relationshipProjects = contact.projectContacts.filter((pc) => pc.project.considerRelationship).length
    const activeRewrite = contact.projectContacts.filter((pc) => pc.project.status === 'REWRITE_IN_PROGRESS').length
    const stalePenalty = new Date(contact.updatedAt) < staleCutoff ? -10 : 0
    const relationshipHealth = Math.max(0, Math.min(100, 25 + signalScore + recentMeeting + relationshipProjects * 10 + activeRewrite * 12 + stalePenalty))
    return { ...contact, relationshipHealth }
  })

  const contacts = (params.view === 'high-priority'
    ? contactsWithHealth.filter((c) => c.type === 'WRITER' && c.highPriority)
    : contactsWithHealth
  )

  const counts = await prisma.contact.groupBy({
    by: ['type'],
    _count: { type: true },
  })

  const countMap = Object.fromEntries(
    counts.map((c) => [c.type, c._count.type])
  )

  const totalCount = contactsBase.length

  const buildFilterHref = (type?: string) => {
    const query = new URLSearchParams()
    if (type) query.set('type', type)
    if (params.search) query.set('search', params.search)
    const qs = query.toString()
    return qs ? `/contacts?${qs}` : '/contacts'
  }

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
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-4">
        <form method="GET" action="/contacts" className="flex gap-3">
          {params.type && <input type="hidden" name="type" value={params.type} />}
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Search contacts by name, email, or notes"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
          {params.search && (
            <Link
              href={params.type ? `/contacts?type=${params.type}` : '/contacts'}
              className="px-4 py-2 bg-[#F2F4F7] text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterPill href={buildFilterHref()} active={!params.type} count={totalCount}>
            All
          </FilterPill>
          <FilterPill href={buildFilterHref('writer')} active={params.type === 'writer'} count={countMap['WRITER'] || 0}>
            Writers
          </FilterPill>
          <FilterPill href={buildFilterHref('agent')} active={params.type === 'agent'} count={countMap['AGENT'] || 0}>
            Agents
          </FilterPill>
          <FilterPill href={buildFilterHref('manager')} active={params.type === 'manager'} count={countMap['MANAGER'] || 0}>
            Managers
          </FilterPill>
          <FilterPill href={buildFilterHref('network_exec')} active={params.type === 'network_exec'} count={countMap['NETWORK_EXEC'] || 0}>
            Network Execs
          </FilterPill>
          <FilterPill href={buildFilterHref('buyer')} active={params.type === 'buyer'} count={countMap['BUYER'] || 0}>
            Buyers
          </FilterPill>
          <FilterPill href="/contacts?type=writer&view=high-priority" active={params.view === 'high-priority'} count={contactsWithHealth.filter((c) => c.type === 'WRITER' && c.highPriority).length}>
            High Priority Writers
          </FilterPill>
        </div>
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((contact) => (
          <Link
            key={contact.id}
            href={`/contacts/${contact.id}`}
            className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#F2F4F7] rounded-full flex items-center justify-center flex-shrink-0">
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
                {contact.type === 'WRITER' && (
                  <div className="mt-1 space-y-1">
                    {contact.highPriority && (
                      <p className="text-xs text-[#1D4ED8] font-semibold">⭐ High Priority</p>
                    )}
                    <p className="text-xs text-slate-500 font-medium">Relationship health score: {contact.relationshipHealth}/100</p>
                  </div>
                )}
                {contact.type === 'NETWORK_EXEC' && contact.execTitle && (
                  <p className="text-xs text-slate-400 mt-2">{contact.execTitle}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
        {contacts.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
            <p className="text-slate-500">
              No contacts found. <Link href="/contacts/new" className="text-[#2563EB] hover:underline">Add your first contact</Link>
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
          ? 'bg-[#2563EB] text-white' 
          : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-blue-200' : 'text-slate-400'}`}>
        {count}
      </span>
    </Link>
  )
}
