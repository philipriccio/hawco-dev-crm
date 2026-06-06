import Link from 'next/link'
import type React from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  displayValue,
  formatDate,
  ipChainStatusLabels,
  ipDocumentTypeLabels,
  ipInterestColors,
  ipInterestLabels,
  ipStatusColors,
  ipStatusLabels,
  ipTypeLabels,
} from '@/lib/ip-display'

export const dynamic = 'force-dynamic'

export default async function IpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ip = await prisma.ipProperty.findUnique({
    where: { id },
    include: {
      rightsHolderContact: true,
      rightsHolderCompany: true,
      project: true,
      documents: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!ip) notFound()

  const holder = ip.rightsHolderContact?.name || ip.rightsHolderCompany?.name || ip.rightsHolderName || 'To confirm'

  return (
    <div className="p-8 min-w-[900px]">
      <div className="mb-6">
        <Link href="/ip" className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">
          Back to IP
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{ip.title}</h1>
            <p className="text-slate-500 mt-1">
              {ipTypeLabels[ip.type] || ip.type} {ip.creator ? `by ${ip.creator}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${ipStatusColors[ip.status] || 'bg-slate-100 text-slate-700'}`}>
              {ipStatusLabels[ip.status] || ip.status}
            </span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${ipInterestColors[ip.interest] || 'bg-slate-100 text-slate-700'}`}>
              {ipInterestLabels[ip.interest] || ip.interest} Interest
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Section title="General Info">
            <InfoGrid
              items={[
                ['Creator', displayValue(ip.creator)],
                ['Publisher / Source', displayValue(ip.publisher)],
                ['Year', displayValue(ip.sourceYear)],
                ['Country', displayValue(ip.country)],
                ['Language', displayValue(ip.language)],
                ['Source URL', ip.sourceUrl ? <a href={ip.sourceUrl} className="text-[#2563EB] hover:text-[#1D4ED8]" target="_blank" rel="noopener noreferrer">Open source</a> : 'Not set'],
                ['Source Material', displayValue(ip.sourceLocation)],
                ['Upload Allowed', ip.uploadAllowed === null ? 'Unknown' : ip.uploadAllowed ? 'Yes' : 'No'],
              ]}
            />
          </Section>

          <Section title="Rights Snapshot">
            <InfoGrid
              items={[
                ['Rights Holder', holder],
                ['Rights Sought', displayValue(ip.rightsSought)],
                ['Territory', displayValue(ip.territory)],
                ['Term', displayValue(ip.termNotes)],
                ['Exclusivity', displayValue(ip.exclusivity)],
                ['Option Start', formatDate(ip.optionStartDate) || 'Not set'],
                ['Option Expiry', formatDate(ip.optionExpiryDate) || 'Not set'],
                ['Extension Deadline', formatDate(ip.extensionDeadline) || 'Not set'],
                ['Option Fee', displayValue(ip.optionFee)],
                ['Purchase Price', displayValue(ip.purchasePrice)],
              ]}
            />
            {ip.dealNotes && <LongText title="Deal Notes" value={ip.dealNotes} />}
          </Section>

          <Section title="Chain of Title">
            <InfoGrid
              items={[
                ['Confidence', ipChainStatusLabels[ip.chainOfTitleStatus] || ip.chainOfTitleStatus],
                ['Legal Review', displayValue(ip.legalReviewStatus)],
              ]}
            />
            <LongText title="Chain Notes" value={ip.chainOfTitleNotes} />
            <LongText title="Encumbrances / Gaps" value={ip.encumbranceNotes} />
          </Section>

          <Section title="Meetings & Email Trail">
            <InfoGrid
              items={[
                ['Last Contact', formatDate(ip.lastContactAt) || 'Not set'],
                ['Next Action', displayValue(ip.nextAction)],
              ]}
            />
            <LongText title="Meeting Notes" value={ip.meetingNotes} />
            <LongText title="Email Trail" value={ip.emailTrail} />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Documents">
            {ip.documents.length > 0 ? (
              <div className="space-y-3">
                {ip.documents.map((document) => (
                  <div key={document.id} className="border border-slate-200 rounded-lg p-3">
                    <p className="font-medium text-slate-900">{document.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{ipDocumentTypeLabels[document.type] || document.type}</p>
                    {document.fileUrl && (
                      <a href={document.fileUrl} className="text-sm text-[#2563EB] hover:text-[#1D4ED8] mt-2 inline-block" target="_blank" rel="noopener noreferrer">
                        Open file
                      </a>
                    )}
                    {document.externalUrl && (
                      <a href={document.externalUrl} className="text-sm text-[#2563EB] hover:text-[#1D4ED8] mt-2 inline-block" target="_blank" rel="noopener noreferrer">
                        Open link
                      </a>
                    )}
                    {document.notes && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{document.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No documents attached yet.</p>
            )}
          </Section>

          <Section title="Development Handoff">
            {ip.project ? (
              <div>
                <p className="text-sm text-slate-600">Linked project</p>
                <Link href={`/projects/${ip.project.id}`} className="font-medium text-[#2563EB] hover:text-[#1D4ED8]">
                  {ip.project.title}
                </Link>
                <p className="text-xs text-slate-500 mt-1">Status: {ip.project.status.replace(/_/g, ' ')}</p>
                <Link href="/whiteboard" className="text-sm text-[#2563EB] hover:text-[#1D4ED8] mt-3 inline-block">
                  View Development Board
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Once rights are secured, this IP can be linked to a CRM project and moved onto the Development Board.
                </p>
                <Link href="/projects/new" className="inline-flex items-center px-3 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] text-sm">
                  Create Project
                </Link>
              </div>
            )}
          </Section>

          <Section title="Notes">
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{displayValue(ip.notes)}</p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function InfoGrid({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</dt>
          <dd className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function LongText({ title, value }: { title: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{title}</p>
      <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
