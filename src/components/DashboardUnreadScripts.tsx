'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PillTone = 'priority-high' | 'priority-medium' | 'priority-low' | 'status'

export interface DashboardUnreadScriptItem {
  id: string
  href: string
  title: string
  writer: string
  source: string
  materialTypeLabel: string
  ageLabel: string
  ageTone: 'green' | 'amber' | 'red' | 'gray'
  uploadedLabel: string
  estimatedReadTime: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  projectStatus: string
}

interface DashboardUnreadScriptsProps {
  initialRows: DashboardUnreadScriptItem[]
  readQueueHref: string
  title?: string
  emptyLabel?: string
  viewAllLabel?: string
  sort: 'priority' | 'newest' | 'oldest'
  sortOptions: Array<{ value: 'priority' | 'newest' | 'oldest'; label: string }>
  todaysPickId?: string | null
  todaysPickReasons?: string[]
}

function pillClass(tone: PillTone) {
  switch (tone) {
    case 'priority-high':
      return 'bg-[#fee2e2] text-[#991b1b]'
    case 'priority-medium':
      return 'bg-[#fef3c7] text-[#92400e]'
    case 'priority-low':
      return 'bg-[#f4f4f5] text-[#71717a]'
    case 'status':
      return 'bg-[#ede9fe] text-[#5b21b6]'
  }
}

function Pill({ children, tone }: { children: ReactNode; tone: PillTone }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClass(tone)}`}>{children}</span>
}

function ageClass(tone: DashboardUnreadScriptItem['ageTone']) {
  if (tone === 'red') return 'text-[#b91c1c]'
  if (tone === 'amber') return 'text-[#b45309]'
  if (tone === 'green') return 'text-[#166534]'
  return 'text-[#71717a]'
}

function priorityTone(priority: DashboardUnreadScriptItem['priority']): PillTone {
  if (priority === 'HIGH') return 'priority-high'
  if (priority === 'MEDIUM') return 'priority-medium'
  return 'priority-low'
}

export default function DashboardUnreadScripts({
  initialRows,
  readQueueHref,
  title = 'Unread Full Scripts',
  emptyLabel = 'No unread full scripts. Clean.',
  viewAllLabel = 'View all',
  sort,
  sortOptions,
  todaysPickId,
  todaysPickReasons = [],
}: DashboardUnreadScriptsProps) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const todaysPick = todaysPickId ? rows.find((row) => row.id === todaysPickId) : null

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  async function markRead(materialId: string) {
    const previousRows = rows
    setUpdatingId(materialId)
    setRows((current) => current.filter((row) => row.id !== materialId))

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsRead: true }),
      })

      if (!response.ok) {
        let message = 'Failed to mark material read'
        try {
          const payload = await response.json()
          if (payload?.error) message = payload.error
        } catch {}
        throw new Error(message)
      }

      router.refresh()
    } catch (error) {
      console.error('Error marking dashboard material read:', { materialId, error })
      setRows(previousRows)
      alert('Failed to mark material read')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-[#e4e4e7] p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="mt-2 flex flex-wrap gap-1 rounded-lg bg-[#f4f4f5] p-1">
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={option.value === 'newest' ? '/' : `/?unreadSort=${option.value}`}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  sort === option.value
                    ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)]'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
        <Link href={readQueueHref} className="text-sm text-[#2563EB] hover:text-[#1D4ED8]">{viewAllLabel}</Link>
      </div>

      {todaysPick && (
        <div className="mb-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#92400e]">Today&apos;s pick</p>
          <p className="mt-1 font-semibold text-slate-900">Read {todaysPick.title} today</p>
          <p className="text-sm text-slate-600">
            {todaysPick.materialTypeLabel} sitting <span className={ageClass(todaysPick.ageTone)}>{todaysPick.ageLabel}</span> | Source: {todaysPick.source}
          </p>
          <p className="text-xs text-[#92400e] mt-1">
            Why this one: {todaysPickReasons.length > 0 ? todaysPickReasons.join(' | ') : `Sitting ${todaysPick.ageLabel} - oldest active material.`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link href={todaysPick.href} className="text-sm font-medium text-[#2563EB]">Open material</Link>
            <button
              type="button"
              onClick={() => markRead(todaysPick.id)}
              disabled={updatingId === todaysPick.id}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              {updatingId === todaysPick.id ? 'Marking...' : 'Mark read'}
            </button>
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="divide-y divide-[#f4f4f5]">
          {rows.slice(0, 8).map((material) => (
            <div key={material.id} className="py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <Link href={material.href} className="min-w-0 hover:text-[#2563EB]">
                  <p className="font-medium text-slate-900 truncate">{material.title}</p>
                  <p className="text-sm text-slate-500 truncate">{material.writer} | {material.source}</p>
                </Link>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Pill tone={priorityTone(material.priority)}>{material.priority}</Pill>
                  <Pill tone="status">{material.materialTypeLabel}</Pill>
                  <Pill tone="status">{material.projectStatus}</Pill>
                  <button
                    type="button"
                    onClick={() => markRead(material.id)}
                    disabled={updatingId === material.id}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
                    title="Mark as read"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {updatingId === material.id ? 'Marking...' : 'Mark read'}
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className={`font-semibold ${ageClass(material.ageTone)}`}>{material.ageLabel}</span>
                <span>|</span>
                <span>Uploaded {material.uploadedLabel}</span>
                <span>|</span>
                <span>{material.estimatedReadTime}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-[#fafafa] p-5 text-sm text-slate-500">{emptyLabel}</div>
      )}
    </section>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
