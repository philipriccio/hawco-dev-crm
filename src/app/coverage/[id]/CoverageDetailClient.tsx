'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Verdict } from '@prisma/client'

interface CoverageWithRelations {
  id: string
  reader: string
  dateRead: Date
  createdAt: Date
  updatedAt: Date
  title: string
  writer: string
  format: string | null
  source: string | null
  draftDate: string | null
  logline: string | null
  synopsis: string | null
  seriesEngine: string | null
  targetNetwork: string | null
  comps: string | null
  scoreConcept: number | null
  scoreCharacters: number | null
  scoreStructure: number | null
  scoreDialogue: number | null
  scoreMarketFit: number | null
  scoreTotal: number | null
  notesConcept: string | null
  notesCharacters: string | null
  notesStructure: string | null
  notesDialogue: string | null
  notesMarketFit: string | null
  mandateCanadian: boolean
  mandateStarRole: boolean
  mandateIntlCoPro: boolean
  mandateBudget: boolean
  strengths: string | null
  weaknesses: string | null
  summary: string | null
  verdict: Verdict
  scriptId: string | null
  projectId: string | null
  project: {
    id: string
    title: string
    status: string
    genre: string | null
  } | null
  script: {
    id: string
    title: string
    type: string
    filename: string
    fileUrl: string | null
  } | null
}

interface CoverageDetailClientProps {
  coverage: CoverageWithRelations
}

const verdictStampColors: Record<Verdict, string> = {
  PASS: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  CONSIDER: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  RECOMMEND: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
}

const verdictLabels: Record<Verdict, string> = {
  PASS: 'PASS',
  CONSIDER: 'CONSIDER',
  RECOMMEND: 'RECOMMEND',
}

// Card color variants — neutral for professional tool feel
const pinnedCardColors = [
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
]

export default function CoverageDetailClient({ coverage }: CoverageDetailClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mandates, setMandates] = useState({
    mandateCanadian: coverage.mandateCanadian,
    mandateStarRole: coverage.mandateStarRole,
    mandateIntlCoPro: coverage.mandateIntlCoPro,
    mandateBudget: coverage.mandateBudget,
  })
  const [projectMaterials, setProjectMaterials] = useState<Array<{ id: string; title: string; type: string }>>([])
  const [selectedScriptId, setSelectedScriptId] = useState(coverage.scriptId || '')

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/coverage/${coverage.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete coverage')
      router.push('/coverage')
    } catch (error) {
      console.error('Error deleting coverage:', error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  useEffect(() => {
    const fetchProjectMaterials = async () => {
      if (!coverage.projectId) return
      const res = await fetch(`/api/materials?projectId=${coverage.projectId}&type=PILOT_SCRIPT,FEATURE_SCRIPT,SERIES_BIBLE`)
      if (res.ok) {
        const materials = await res.json()
        setProjectMaterials(materials)
      }
    }

    fetchProjectMaterials()
  }, [coverage.projectId])

  const updateCoverage = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/coverage/${coverage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Failed to update coverage')
    }

    router.refresh()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const scoreLabels: Record<string, string> = {
    scoreConcept: 'Concept',
    scoreCharacters: 'Characters',
    scoreStructure: 'Structure',
    scoreDialogue: 'Dialogue',
    scoreMarketFit: 'Market Fit',
  }

  const scores = [
    { key: 'scoreConcept', value: coverage.scoreConcept, notes: coverage.notesConcept },
    { key: 'scoreCharacters', value: coverage.scoreCharacters, notes: coverage.notesCharacters },
    { key: 'scoreStructure', value: coverage.scoreStructure, notes: coverage.notesStructure },
    { key: 'scoreDialogue', value: coverage.scoreDialogue, notes: coverage.notesDialogue },
    { key: 'scoreMarketFit', value: coverage.scoreMarketFit, notes: coverage.notesMarketFit },
  ]

  return (
    <div 
      className="min-h-screen bg-[#F2F4F7] p-6"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(139, 69, 19, 0.03) 1px, transparent 1px),
          radial-gradient(circle at 80% 80%, rgba(139, 69, 19, 0.03) 1px, transparent 1px),
          linear-gradient(45deg, transparent 49%, rgba(139, 69, 19, 0.02) 50%, transparent 51%),
          linear-gradient(-45deg, transparent 49%, rgba(139, 69, 19, 0.02) 50%, transparent 51%)
        `,
        backgroundSize: '20px 20px, 20px 20px, 40px 40px, 40px 40px',
      }}
    >
      {/* Back Navigation */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link 
          href="/coverage" 
          className="text-[#1D4ED8] hover:text-[#1E40AF] flex items-center gap-1 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Coverage
        </Link>
        {coverage.project && (
          <>
            <svg className="w-4 h-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href={`/projects/${coverage.project.id}`} 
              className="text-[#1D4ED8] hover:text-[#1E40AF] font-medium"
            >
              {coverage.project.title}
            </Link>
          </>
        )}
      </div>

      {/* Header Zone */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#E4E7EC]/50 p-6 relative overflow-hidden">
          {/* Corkboard edge effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1D4ED8]" />
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header Label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold tracking-widest text-[#1D4ED8] uppercase">Hawco Productions</span>
                <span className="text-[#3B82F6]">|</span>
                <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase">Script Assessment</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{coverage.title}</h1>
              
              {/* Writer */}
              <p className="text-lg text-slate-600 mb-4">by {coverage.writer}</p>

              {/* Meta Info */}
              <div className="flex items-center gap-3 flex-wrap">
                {coverage.format && (
                  <span className="px-3 py-1.5 bg-[#F8F9FB] text-[#1E40AF] rounded-full text-sm font-medium border border-[#E4E7EC]">
                    {coverage.format}
                  </span>
                )}
                {coverage.source && (
                  <span className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium border border-stone-200">
                    Source: {coverage.source}
                  </span>
                )}
                {coverage.draftDate && (
                  <span className="px-3 py-1.5 bg-[#F2F4F7] text-slate-700 rounded-full text-sm font-medium border border-[#E4E7EC]">
                    Draft: {coverage.draftDate}
                  </span>
                )}
                <span className="px-3 py-1.5 bg-[#F2F4F7] text-slate-700 rounded-full text-sm font-medium border border-[#E4E7EC]">
                  Read: {formatDate(coverage.dateRead)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-3">
              <div className={`px-5 py-3 rounded-2xl border-2 text-center min-w-[180px] shadow-lg rotate-1 ${verdictStampColors[coverage.verdict]}`}>
                <div className="text-[10px] font-black tracking-[0.35em] uppercase opacity-70 mb-1">Verdict</div>
                <div className="text-2xl font-black tracking-wide">{verdictLabels[coverage.verdict]}</div>
              </div>
              <Link
                href={`/coverage/${coverage.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm font-medium shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Coverage
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Project Details & Logline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Logline */}
          <PinnedCard title="Logline" colorIndex={0}>
            {coverage.logline ? (
              <p className="text-slate-800 font-medium leading-relaxed">{coverage.logline}</p>
            ) : (
              <p className="text-slate-400 italic">No logline provided</p>
            )}
          </PinnedCard>

          {coverage.synopsis && (
            <PinnedCard title="Synopsis" colorIndex={1}>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{coverage.synopsis}</p>
            </PinnedCard>
          )}

          {/* Project Details */}
          <PinnedCard title="Project Details" colorIndex={1}>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Title</span>
                <span className="text-slate-800 font-medium">{coverage.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Writer</span>
                <span className="text-slate-800">{coverage.writer}</span>
              </div>
              {coverage.format && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Format</span>
                  <span className="text-slate-800">{coverage.format}</span>
                </div>
              )}
              {coverage.source && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Source</span>
                  <span className="text-slate-800">{coverage.source}</span>
                </div>
              )}
              {coverage.draftDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Draft Date</span>
                  <span className="text-slate-800">{coverage.draftDate}</span>
                </div>
              )}
              {coverage.project && (
                <div className="pt-3 border-t border-[#E4E7EC]/50">
                  <Link 
                    href={`/projects/${coverage.project.id}`}
                    className="inline-flex items-center gap-2 text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                  >
                    View Project
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </PinnedCard>

          {/* Linked Script */}
          <PinnedCard title="Script Material" colorIndex={2}>
            {coverage.script && (
              <a
                href={coverage.script.fileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-all border border-transparent hover:border-[#E4E7EC] mb-3"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-2xl">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{coverage.script.title}</p>
                  <p className="text-xs text-slate-500">{coverage.script.filename}</p>
                </div>
              </a>
            )}

            {!coverage.projectId ? (
              <p className="text-sm text-slate-500">Link this coverage to a project first to choose a script.</p>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedScriptId}
                  onChange={async (e) => {
                    const scriptId = e.target.value
                    setSelectedScriptId(scriptId)
                    await updateCoverage({ scriptId: scriptId || null })
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                >
                  <option value="">No linked script</option>
                  {projectMaterials.map((material) => (
                    <option key={material.id} value={material.id}>{material.title}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Pick a specific script material to link to this coverage.</p>
              </div>
            )}
          </PinnedCard>

          {(coverage.comps || coverage.targetNetwork || coverage.seriesEngine) && (
            <PinnedCard title="Development Notes" colorIndex={2}>
              <div className="space-y-4">
                {coverage.comps && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Comparable Shows</p>
                    <div className="flex flex-wrap gap-2">
                      {coverage.comps.split(',').map((comp) => comp.trim()).filter(Boolean).map((comp) => (
                        <span
                          key={comp}
                          className="px-3 py-1 rounded-full bg-white/80 border border-[#E4E7EC] text-sm text-[#1E40AF] font-medium"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {coverage.targetNetwork && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Target Network</p>
                    <p className="text-slate-700 text-sm">{coverage.targetNetwork}</p>
                  </div>
                )}
                {coverage.seriesEngine && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Series Engine</p>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{coverage.seriesEngine}</p>
                  </div>
                )}
              </div>
            </PinnedCard>
          )}

          {/* Analyst Comments */}
          <PinnedCard title="Analyst Comments" colorIndex={3}>
            {/* Strengths */}
            {coverage.strengths && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Strengths</p>
                <div className="text-slate-700 text-sm whitespace-pre-wrap">{coverage.strengths}</div>
              </div>
            )}
            
            {/* Weaknesses */}
            {coverage.weaknesses && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Weaknesses</p>
                <div className="text-slate-700 text-sm whitespace-pre-wrap">{coverage.weaknesses}</div>
              </div>
            )}
            
            {/* Summary */}
            {coverage.summary && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Summary</p>
                <p className="text-slate-700 text-sm leading-relaxed">{coverage.summary}</p>
              </div>
            )}
            
            {!coverage.strengths && !coverage.weaknesses && !coverage.summary && (
              <p className="text-slate-400 italic">No analyst comments</p>
            )}
          </PinnedCard>
        </div>

        {/* Middle & Right Columns - Scorecard & Mandate */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scorecard */}
          <PinnedCard title="Scorecard" colorIndex={4}>
            <div className="space-y-4">
              {scores.map((score) => (
                <div key={score.key} className="flex items-center gap-4">
                  <div className="w-28 flex-shrink-0">
                    <span className="text-sm font-medium text-slate-700">{scoreLabels[score.key]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {/* Score bar */}
                      <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#2563EB] rounded-full transition-all"
                          style={{ width: score.value ? `${(score.value / 10) * 100}%` : '0%' }}
                        />
                      </div>
                      {score.value !== null && (
                        <span className="text-sm font-bold text-slate-700 w-12 text-right">{score.value}/10</span>
                      )}
                    </div>
                    {score.notes && (
                      <p className="text-sm text-slate-600 mt-1 italic">{score.notes}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total Score */}
              <div className="pt-4 border-t border-[#E4E7EC]/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Total Score</span>
                  <span className={`text-2xl font-bold ${
                    (coverage.scoreTotal || 0) >= 40 ? 'text-green-600' :
                    (coverage.scoreTotal || 0) >= 30 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {coverage.scoreTotal !== null ? `${coverage.scoreTotal}/50` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </PinnedCard>

          {/* Mandate Checklist */}
          <PinnedCard title="Mandate Checklist" colorIndex={5}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'mandateCanadian', label: 'Canadian Content' },
                { key: 'mandateStarRole', label: 'Star Role' },
                { key: 'mandateIntlCoPro', label: "Int'l Co-Pro Friendly" },
                { key: 'mandateBudget', label: 'Budget Feasible' },
              ].map((item) => (
                <MandateItem
                  key={item.key}
                  checked={mandates[item.key as keyof typeof mandates]}
                  label={item.label}
                  onToggle={async () => {
                    const nextValue = !mandates[item.key as keyof typeof mandates]
                    const nextState = { ...mandates, [item.key]: nextValue }
                    setMandates(nextState)
                    await updateCoverage({ [item.key]: nextValue })
                  }}
                />
              ))}
            </div>
          </PinnedCard>

          {/* Reader Info */}
          <PinnedCard title="Reader Info" colorIndex={2}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Reader</span>
                <span className="text-slate-700">{coverage.reader}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Read</span>
                <span className="text-slate-700">{formatDate(coverage.dateRead)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700">{formatDate(coverage.createdAt)}</span>
              </div>
            </div>
          </PinnedCard>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Coverage?</h3>
            <p className="text-slate-600 mb-6">
              This will permanently delete the coverage for <strong>{coverage.title}</strong>. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-[#F2F4F7] text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MandateItem({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-lg border text-left ${
      checked 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        checked ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
      }`}>
        {checked ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span className={`font-medium ${checked ? 'text-green-800' : 'text-red-700'}`}>
        {label}
      </span>
    </button>
  )
}

// Pinned Card Component
function PinnedCard({ 
  children, 
  title, 
  colorIndex = 0,
  className = ''
}: { 
  children: React.ReactNode
  title: string
  colorIndex?: number
  className?: string
}) {
  const colorClass = pinnedCardColors[colorIndex % pinnedCardColors.length]
  
  return (
    <div className={`
      ${colorClass} 
      rounded-2xl
      border
      shadow-[0_1px_4px_rgba(16,24,40,0.06)]
      overflow-hidden
      transition-all duration-200
      hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]
      hover:border-[#CDD2DB]
      ${className}
    `}>
      {/* Card Header */}
      <div className="bg-[#F8F9FB] border-b border-[#E4E7EC] px-5 py-4">
        <h3 className="text-xs font-semibold text-[#101828] uppercase tracking-wider">
          {title}
        </h3>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}
