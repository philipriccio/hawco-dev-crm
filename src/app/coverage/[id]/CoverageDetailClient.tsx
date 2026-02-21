'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

const verdictColors: Record<Verdict, string> = {
  PASS: 'bg-red-100 text-red-700 border-red-300',
  CONSIDER: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  RECOMMEND: 'bg-green-100 text-green-700 border-green-300',
}

const verdictLabels: Record<Verdict, string> = {
  PASS: 'PASS',
  CONSIDER: 'CONSIDER',
  RECOMMEND: 'RECOMMEND',
}

// Corkboard paper colors for pinned cards
const pinnedCardColors = [
  'bg-amber-50 border-amber-200',
  'bg-orange-50 border-orange-200',
  'bg-yellow-50 border-yellow-200',
  'bg-stone-50 border-stone-200',
  'bg-amber-100/60 border-amber-300',
  'bg-orange-100/60 border-orange-300',
]

export default function CoverageDetailClient({ coverage }: CoverageDetailClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      className="min-h-screen bg-amber-50/80 p-6"
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
      <div className="mb-6">
        <Link 
          href="/coverage" 
          className="text-amber-700 hover:text-amber-800 flex items-center gap-1 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Coverage
        </Link>
      </div>

      {/* Header Zone */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6 relative overflow-hidden">
          {/* Corkboard edge effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700" />
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header Label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold tracking-widest text-amber-700 uppercase">Hawco Productions</span>
                <span className="text-amber-400">|</span>
                <span className="text-xs font-bold tracking-widest text-amber-600 uppercase">Script Assessment</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{coverage.title}</h1>
              
              {/* Writer */}
              <p className="text-lg text-slate-600 mb-4">by {coverage.writer}</p>

              {/* Meta Info */}
              <div className="flex items-center gap-3 flex-wrap">
                {coverage.format && (
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-900 rounded-full text-sm font-medium border border-amber-200">
                    {coverage.format}
                  </span>
                )}
                {coverage.source && (
                  <span className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium border border-stone-200">
                    Source: {coverage.source}
                  </span>
                )}
                {coverage.draftDate && (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
                    Draft: {coverage.draftDate}
                  </span>
                )}
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
                  Read: {formatDate(coverage.dateRead)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href={`/coverage/${coverage.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-md"
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
                <div className="pt-3 border-t border-amber-200/50">
                  <Link 
                    href={`/projects/${coverage.project.id}`}
                    className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
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
          {coverage.script && (
            <PinnedCard title="Script Material" colorIndex={2}>
              <a
                href={coverage.script.fileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-amber-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{coverage.script.title}</p>
                  <p className="text-xs text-slate-500">{coverage.script.filename}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
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
                      {/* Score dots */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <div
                            key={dot}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              score.value && dot <= score.value
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {dot}
                          </div>
                        ))}
                      </div>
                      {score.value !== null && (
                        <span className="text-sm font-bold text-slate-700 ml-2">{score.value}/5</span>
                      )}
                    </div>
                    {score.notes && (
                      <p className="text-xs text-slate-500 mt-1">{score.notes}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total Score */}
              <div className="pt-4 border-t border-amber-200/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Total Score</span>
                  <span className={`text-2xl font-bold ${
                    (coverage.scoreTotal || 0) >= 20 ? 'text-green-600' :
                    (coverage.scoreTotal || 0) >= 15 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {coverage.scoreTotal !== null ? `${coverage.scoreTotal}/25` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </PinnedCard>

          {/* Mandate Checklist */}
          <PinnedCard title="Mandate Checklist" colorIndex={5}>
            <div className="grid grid-cols-2 gap-4">
              <MandateItem checked={coverage.mandateCanadian} label="Canadian Content" />
              <MandateItem checked={coverage.mandateStarRole} label="Star Role" />
              <MandateItem checked={coverage.mandateIntlCoPro} label="Int'l Co-Pro Friendly" />
              <MandateItem checked={coverage.mandateBudget} label="Budget Feasible" />
            </div>
          </PinnedCard>

          {/* Verdict */}
          <PinnedCard title="Verdict" colorIndex={0}>
            <div className={`text-center py-6 rounded-xl font-bold text-2xl border-2 ${verdictColors[coverage.verdict]}`}>
              {verdictLabels[coverage.verdict]}
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
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
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

function MandateItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      checked 
        ? 'bg-green-50 border-green-200' 
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        checked ? 'bg-green-500 text-white' : 'bg-slate-300'
      }`}>
        {checked && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`font-medium ${checked ? 'text-green-800' : 'text-slate-600'}`}>
        {label}
      </span>
    </div>
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
      rounded-xl p-5 shadow-sm 
      border-2
      relative
      transition-all duration-200
      hover:shadow-md
      ${className}
    `}>
      {/* Pin effect */}
      <div className="absolute -top-1.5 left-6 w-3 h-3 rounded-full bg-red-700/40 shadow-sm" />
      
      {/* Header */}
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
        {title}
      </h3>
      
      {/* Content */}
      {children}
    </div>
  )
}
