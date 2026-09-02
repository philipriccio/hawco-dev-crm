import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getUploadedFileAccessUrl } from '@/lib/file-storage'

export const dynamic = 'force-dynamic'

function formatDate(value: Date | null) {
  if (!value) return null
  return value.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function statusClass(status: string | null) {
  const normalized = status?.toLowerCase() || ''
  if (normalized.includes('executed') || normalized.includes('signed')) {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (normalized.includes('draft') || normalized.includes('pending')) {
    return 'bg-amber-100 text-amber-700'
  }
  if (normalized.includes('expired')) {
    return 'bg-red-100 text-red-700'
  }
  return 'bg-[#F2F4F7] text-slate-700'
}

export default async function AgreementsPage() {
  const agreements = await prisma.projectAgreement.findMany({
    include: {
      project: true,
      contacts: {
        include: { contact: true },
        orderBy: { contact: { name: 'asc' } },
      },
    },
    orderBy: [
      { effectiveDate: 'desc' },
      { createdAt: 'desc' },
    ],
  })
  const agreementsWithAccessUrls = await Promise.all(
    agreements.map(async (agreement) => ({
      ...agreement,
      fileUrl: agreement.fileUrl
        ? await getUploadedFileAccessUrl(agreement.fileUrl, agreement.fileName)
        : null,
    }))
  )

  const activeCount = agreementsWithAccessUrls.filter((agreement) => {
    const normalized = agreement.status?.toLowerCase() || ''
    return normalized.includes('executed') || normalized.includes('signed') || normalized.includes('active')
  }).length

  const datedCount = agreementsWithAccessUrls.filter((agreement) => agreement.effectiveDate || agreement.expiryDate).length

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Agreements</h1>
        <p className="mt-1 text-slate-500">All project agreements and rights paperwork entered in the CRM</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{agreementsWithAccessUrls.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active / Signed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{activeCount}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">With Dates</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{datedCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="border-b border-[#E4E7EC] px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Agreement Register</h2>
        </div>

        {agreementsWithAccessUrls.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No agreements have been entered yet.</div>
        ) : (
          <div className="divide-y divide-[#E4E7EC]">
            {agreementsWithAccessUrls.map((agreement) => (
              <div key={agreement.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  {agreement.fileUrl ? (
                    <a
                      href={agreement.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#1D4ED8] hover:underline"
                    >
                      {agreement.title}
                    </a>
                  ) : (
                    <p className="font-semibold text-slate-900">{agreement.title}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500">
                    {agreement.agreementType || 'Agreement'}
                    {agreement.counterparty ? ` · ${agreement.counterparty}` : ''}
                  </p>
                  {agreement.fileName && <p className="mt-1 truncate text-xs text-slate-400">{agreement.fileName}</p>}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</p>
                  <Link href={`/projects/${agreement.project.id}`} className="mt-1 block text-sm font-medium text-[#1D4ED8] hover:underline">
                    {agreement.project.title}
                  </Link>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</p>
                  {agreement.contacts.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {agreement.contacts.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/contacts/${entry.contact.id}`}
                          className="rounded-md bg-[#F2F4F7] px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                        >
                          {entry.contact.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">No contacts linked</p>
                  )}
                </div>

                <div className="lg:text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(agreement.status)}`}>
                    {agreement.status || 'Status unknown'}
                  </span>
                  <p className="mt-2 text-xs text-slate-500">
                    {[formatDate(agreement.effectiveDate), agreement.expiryDate ? `Expires ${formatDate(agreement.expiryDate)}` : null]
                      .filter(Boolean)
                      .join(' · ') || 'No dates'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
