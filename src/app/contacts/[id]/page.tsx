import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import CanadianToggle from './CanadianToggle'
import HighPriorityToggle from './HighPriorityToggle'
import DeleteContactButton from './DeleteContactButton'
import WriterSignalsClient from './WriterSignalsClient'

export const dynamic = 'force-dynamic'

const typeColors: Record<string, string> = {
  WRITER: 'bg-purple-100 text-purple-700',
  AGENT: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  BUYER: 'bg-emerald-100 text-emerald-700',
  NETWORK_EXEC: 'bg-green-100 text-green-700',
  PRODUCER: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-slate-100 text-slate-700',
}

const typeLabels: Record<string, string> = {
  WRITER: 'Writer',
  AGENT: 'Agent',
  MANAGER: 'Manager',
  BUYER: 'Buyer',
  NETWORK_EXEC: 'Network Executive',
  PRODUCER: 'Producer',
  OTHER: 'Other',
}

const levelLabels: Record<string, string> = {
  EMERGING: 'Emerging',
  MID_LEVEL: 'Mid-Level',
  EXPERIENCED: 'Experienced',
  SHOWRUNNER: 'Showrunner',
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      agent: true,
      manager: true,
      representedWriters: {
        include: { company: true }
      },
      managedWriters: {
        include: { company: true }
      },
      projectContacts: {
        include: {
          project: {
            include: {
              coverages: true,
              rewriteCycles: true,
            }
          }
        }
      },
      materials: {
        include: { project: true }
      },
      writtenMaterials: {
        include: { project: true }
      },
      writerSignals: {
        orderBy: { createdAt: 'desc' }
      },
      meetingAttendees: {
        include: {
          meeting: {
            include: {
              projects: { include: { project: true } }
            }
          }
        },
        orderBy: { meeting: { date: 'desc' } }
      }
    }
  })

  if (!contact) {
    notFound()
  }

  return (
    <div className="p-8">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/contacts" className="text-amber-600 hover:text-amber-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Contacts
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-3xl font-bold text-slate-500">
            {contact.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{contact.name}</h1>
            {contact.isCanadian && (
              <span className="text-2xl" title="Canadian">🇨🇦</span>
            )}
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${typeColors[contact.type]}`}>
              {typeLabels[contact.type]}
            </span>
          </div>
          {contact.company && (
            <p className="text-lg text-slate-600">{contact.company.name}</p>
          )}
          {contact.execTitle && (
            <p className="text-slate-500">{contact.execTitle}</p>
          )}
          {contact.type === 'WRITER' && contact.writerLevel && (
            <p className="text-slate-500">{levelLabels[contact.writerLevel]} Writer</p>
          )}
        </div>
        <div className="flex gap-2">
          {contact.imdbUrl && (
            <a
              href={contact.imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
            >
              <span>IMDb</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              {contact.email && (
                <div>
                  <dt className="text-sm text-slate-500">Email</dt>
                  <dd className="text-slate-900">{contact.email}</dd>
                </div>
              )}
              {contact.phone && (
                <div>
                  <dt className="text-sm text-slate-500">Phone</dt>
                  <dd className="text-slate-900">{contact.phone}</dd>
                </div>
              )}
              {contact.citizenship && (
                <div>
                  <dt className="text-sm text-slate-500">Location/Citizenship</dt>
                  <dd className="text-slate-900">{contact.citizenship}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-slate-500 mb-1">Status</dt>
                <dd className="space-y-2">
                  <CanadianToggle contactId={contact.id} initialValue={contact.isCanadian} />
                  {contact.type === 'WRITER' && (
                    <HighPriorityToggle contactId={contact.id} initialValue={contact.highPriority} />
                  )}
                </dd>
              </div>
              {contact.unionMembership && (
                <div>
                  <dt className="text-sm text-slate-500">Union</dt>
                  <dd className="text-slate-900">{contact.unionMembership}</dd>
                </div>
              )}
              {contact.type === 'WRITER' && contact.writerGenres && (
                <div>
                  <dt className="text-sm text-slate-500">Genres</dt>
                  <dd className="text-slate-900">{contact.writerGenres}</dd>
                </div>
              )}
              {contact.type === 'WRITER' && contact.writerVoice && (
                <div className="col-span-2">
                  <dt className="text-sm text-slate-500">Voice / Style</dt>
                  <dd className="text-slate-900">{contact.writerVoice}</dd>
                </div>
              )}
              {contact.type === 'NETWORK_EXEC' && contact.execRole && (
                <div className="col-span-2">
                  <dt className="text-sm text-slate-500">Role / Mandate</dt>
                  <dd className="text-slate-900">{contact.execRole}</dd>
                </div>
              )}
              {contact.type === 'AGENT' && contact.agentVibe && (
                <div>
                  <dt className="text-sm text-slate-500">Role</dt>
                  <dd className="text-slate-900">{contact.agentVibe}</dd>
                </div>
              )}
              {contact.agent && (
                <div>
                  <dt className="text-sm text-slate-500">Agent</dt>
                  <dd>
                    <Link href={`/contacts/${contact.agent.id}`} className="text-amber-600 hover:text-amber-700">
                      {contact.agent.name}
                    </Link>
                  </dd>
                </div>
              )}
              {contact.manager && (
                <div>
                  <dt className="text-sm text-slate-500">Manager</dt>
                  <dd>
                    <Link href={`/contacts/${contact.manager.id}`} className="text-amber-600 hover:text-amber-700">
                      {contact.manager.name}
                    </Link>
                  </dd>
                </div>
              )}
              {contact.type === 'BUYER' && contact.lookingFor && (
                <div className="col-span-2">
                  <dt className="text-sm text-slate-500">What They&apos;re Looking For Now</dt>
                  <dd className="text-slate-900 whitespace-pre-wrap">{contact.lookingFor}</dd>
                </div>
              )}
            </dl>
            {contact.notes && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm text-slate-500 mb-1">Notes</dt>
                <dd className="text-slate-900 whitespace-pre-wrap">{contact.notes}</dd>
              </div>
            )}
          </div>

          {contact.type === 'WRITER' && (
            <WriterSignalsClient
              contactId={contact.id}
              signals={contact.writerSignals.map((signal) => ({
                ...signal,
                createdAt: signal.createdAt.toISOString(),
              }))}
            />
          )}

          {/* Writer Relationship Timeline */}
          {contact.type === 'WRITER' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Writer Relationship Timeline</h2>
              <div className="space-y-3">
                {contact.projectContacts.map((pc) => (
                  <div key={pc.id} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-sm font-medium text-slate-900">Project submitted: <Link href={`/projects/${pc.project.id}`} className="text-amber-700 hover:underline">{pc.project.title}</Link></p>
                    <p className="text-xs text-slate-500">{new Date(pc.project.createdAt).toLocaleDateString()} · {pc.project.status.replace(/_/g, ' ')}</p>
                    {pc.project.coverages[0] && <p className="text-xs text-slate-600 mt-1">Coverage outcome: {pc.project.coverages[0].verdict}</p>}
                    {pc.project.rewriteCycles[0] && <p className="text-xs text-slate-600 mt-1">Latest rewrite cycle: #{pc.project.rewriteCycles[0].cycleNumber}</p>}
                  </div>
                ))}
                {contact.meetingAttendees.map((ma) => (
                  <div key={ma.id} className="border-l-2 border-blue-300 pl-3">
                    <p className="text-sm font-medium text-slate-900">Meeting: {ma.meeting.title}</p>
                    <p className="text-xs text-slate-500">{new Date(ma.meeting.date).toLocaleDateString()}</p>
                  </div>
                ))}
                {contact.writerSignals.map((signal) => (
                  <div key={signal.id} className="border-l-2 border-emerald-300 pl-3">
                    <p className="text-sm font-medium text-slate-900">Signal: {signal.signalType}</p>
                    <p className="text-xs text-slate-500">{new Date(signal.createdAt).toLocaleDateString()}</p>
                    {signal.note && <p className="text-xs text-slate-600">{signal.note}</p>}
                  </div>
                ))}
                {contact.projectContacts.length === 0 && contact.meetingAttendees.length === 0 && contact.writerSignals.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No timeline events yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Projects */}
          {contact.projectContacts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Projects ({contact.projectContacts.length})
              </h2>
              <div className="space-y-3">
                {contact.projectContacts.map((pc) => (
                  <Link
                    key={pc.id}
                    href={`/projects/${pc.project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{pc.project.title}</p>
                      <p className="text-sm text-slate-500">
                        {pc.role.charAt(0) + pc.role.slice(1).toLowerCase().replace('_', ' ')}
                        {pc.project.genre && ` · ${pc.project.genre}`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pc.project.status === 'PASSED' ? 'bg-red-100 text-red-700' :
                      pc.project.status === 'DEVELOPING' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {pc.project.status.charAt(0) + pc.project.status.slice(1).toLowerCase()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Written Materials (for writers) */}
          {contact.type === 'WRITER' && contact.writtenMaterials && contact.writtenMaterials.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                📝 Scripts &amp; Materials ({contact.writtenMaterials.length})
              </h2>
              <div className="space-y-3">
                {contact.writtenMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{material.title}</p>
                      <p className="text-sm text-slate-500">
                        {material.type.replace('_', ' ')}
                        {material.project && ` · ${material.project.title}`}
                      </p>
                    </div>
                    {material.fileUrl && (
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-300"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submitted Materials */}
          {contact.materials.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Submitted Materials ({contact.materials.length})
              </h2>
              <div className="space-y-3">
                {contact.materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50"
                  >
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{material.title}</p>
                      <p className="text-sm text-slate-500">
                        {material.type.replace('_', ' ')}
                        {material.project && ` · ${material.project.title}`}
                      </p>
                    </div>
                    {material.fileUrl && (
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meetings */}
          {contact.meetingAttendees.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Meetings ({contact.meetingAttendees.length})
              </h2>
              <div className="space-y-4">
                {contact.meetingAttendees.map((ma) => (
                  <div key={ma.id} className="border-l-2 border-amber-500 pl-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{ma.meeting.title}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(ma.meeting.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {ma.meeting.location && ` · ${ma.meeting.location}`}
                        </p>
                      </div>
                    </div>
                    {ma.meeting.notes && (
                      <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{ma.meeting.notes}</p>
                    )}
                    {ma.meeting.projects.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {ma.meeting.projects.map((mp) => (
                          <Link
                            key={mp.id}
                            href={`/projects/${mp.project.id}`}
                            className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                          >
                            {mp.project.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Represented Writers (for agents) */}
          {contact.type === 'AGENT' && contact.representedWriters.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Writers Represented ({contact.representedWriters.length})
              </h2>
              <div className="space-y-2">
                {contact.representedWriters.map((writer) => (
                  <Link
                    key={writer.id}
                    href={`/contacts/${writer.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-700">
                        {writer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{writer.name}</p>
                      {writer.writerLevel && (
                        <p className="text-xs text-slate-500">{levelLabels[writer.writerLevel]}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Projects</span>
                <span className="font-medium text-slate-900">{contact.projectContacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Materials</span>
                <span className="font-medium text-slate-900">{contact.materials.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Meetings</span>
                <span className="font-medium text-slate-900">{contact.meetingAttendees.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Positive Signals</span>
                <span className="font-medium text-slate-900">{contact.writerSignals.length}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/meetings/new?contact=${contact.id}`}
                className="flex items-center gap-2 w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Log Meeting
              </Link>
              <Link
                href={`/contacts/${contact.id}/edit`}
                className="flex items-center gap-2 w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Contact
              </Link>
              <DeleteContactButton contactId={contact.id} contactName={contact.name} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
