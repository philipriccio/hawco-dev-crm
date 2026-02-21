'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Verdict } from '@prisma/client'

interface ScoreField {
  value: number | ''
  notes: string
}

export default function NewCoveragePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [writer, setWriter] = useState('')
  const [format, setFormat] = useState('')
  const [source, setSource] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [logline, setLogline] = useState('')
  const [dateRead, setDateRead] = useState(new Date().toISOString().split('T')[0])
  const [reader, setReader] = useState('Phil')

  // Scores
  const [scores, setScores] = useState<Record<string, ScoreField>>({
    scoreConcept: { value: '', notes: '' },
    scoreCharacters: { value: '', notes: '' },
    scoreStructure: { value: '', notes: '' },
    scoreDialogue: { value: '', notes: '' },
    scoreMarketFit: { value: '', notes: '' },
  })

  // Mandate checklist
  const [mandates, setMandates] = useState({
    mandateCanadian: false,
    mandateStarRole: false,
    mandateIntlCoPro: false,
    mandateBudget: false,
  })

  // Comments
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [summary, setSummary] = useState('')
  const [verdict, setVerdict] = useState<Verdict>('PASS')

  const handleScoreChange = (key: string, field: 'value' | 'notes', value: string | number) => {
    setScores((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  const calculateTotal = () => {
    const values = Object.values(scores)
      .map((s) => (typeof s.value === 'number' ? s.value : 0))
      .filter((v) => v > 0)
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) : 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const total = calculateTotal()
      const scoreCount = Object.values(scores).filter((s) => typeof s.value === 'number' && s.value > 0).length

      const response = await fetch('/api/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          writer,
          format,
          source,
          draftDate,
          logline,
          dateRead,
          reader,
          scoreConcept: scores.scoreConcept.value || null,
          scoreCharacters: scores.scoreCharacters.value || null,
          scoreStructure: scores.scoreStructure.value || null,
          scoreDialogue: scores.scoreDialogue.value || null,
          scoreMarketFit: scores.scoreMarketFit.value || null,
          scoreTotal: scoreCount > 0 ? total : null,
          notesConcept: scores.scoreConcept.notes || null,
          notesCharacters: scores.scoreCharacters.notes || null,
          notesStructure: scores.scoreStructure.notes || null,
          notesDialogue: scores.scoreDialogue.notes || null,
          notesMarketFit: scores.scoreMarketFit.notes || null,
          ...mandates,
          strengths: strengths || null,
          weaknesses: weaknesses || null,
          summary: summary || null,
          verdict,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create coverage')
      }

      const coverage = await response.json()
      router.push(`/coverage/${coverage.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const scoreLabels: Record<string, string> = {
    scoreConcept: 'Concept',
    scoreCharacters: 'Characters',
    scoreStructure: 'Structure',
    scoreDialogue: 'Dialogue',
    scoreMarketFit: 'Market Fit',
  }

  const formatOptions = [
    '',
    '½ Hour Comedy',
    '½ Hour Drama',
    '1 Hour Drama',
    '1 Hour Comedy',
    'Feature',
    'Limited Series',
    'Other',
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/coverage" 
          className="text-amber-700 hover:text-amber-800 flex items-center gap-1 text-sm font-medium mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Coverage
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">New Coverage</h1>
        <p className="text-slate-500 mt-1">Create a new script assessment</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Details */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Script title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Writer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Writer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {formatOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt || 'Select format...'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Agent, referral, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Draft Date</label>
              <input
                type="text"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="e.g., January 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Read</label>
              <input
                type="date"
                required
                value={dateRead}
                onChange={(e) => setDateRead(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Logline</label>
              <textarea
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="One-sentence summary of the script..."
              />
            </div>
          </div>
        </section>

        {/* Scorecard */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Scorecard</h2>
            <div className="text-lg font-bold text-slate-700">
              Total: <span className={calculateTotal() >= 20 ? 'text-green-600' : calculateTotal() >= 15 ? 'text-yellow-600' : 'text-red-600'}>{calculateTotal()}</span>/25
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(scoreLabels).map(([key, label]) => (
              <div key={key} className="flex items-start gap-4">
                <div className="w-28 flex-shrink-0 pt-2">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleScoreChange(key, 'value', score)}
                        className={`w-10 h-10 rounded-full font-bold transition-colors ${
                          scores[key].value === score
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleScoreChange(key, 'value', '')}
                      className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                  <input
                    type="text"
                    value={scores[key].notes}
                    onChange={(e) => handleScoreChange(key, 'notes', e.target.value)}
                    placeholder={`Notes on ${label.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mandate Checklist */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Mandate Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={mandates.mandateCanadian}
                onChange={(e) => setMandates((prev) => ({ ...prev, mandateCanadian: e.target.checked }))}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">Canadian Content</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={mandates.mandateStarRole}
                onChange={(e) => setMandates((prev) => ({ ...prev, mandateStarRole: e.target.checked }))}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">Star Role</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={mandates.mandateIntlCoPro}
                onChange={(e) => setMandates((prev) => ({ ...prev, mandateIntlCoPro: e.target.checked }))}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">Int&apos;l Co-Pro Friendly</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={mandates.mandateBudget}
                onChange={(e) => setMandates((prev) => ({ ...prev, mandateBudget: e.target.checked }))}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
              />
              <span className="font-medium text-slate-700">Budget Feasible</span>
            </label>
          </div>
        </section>

        {/* Analyst Comments */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Analyst Comments</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Strengths</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="What works well in this script..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weaknesses</label>
              <textarea
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Areas that need improvement..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Overall assessment..."
              />
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Verdict</h2>
          <div className="flex gap-4">
            {(['PASS', 'CONSIDER', 'RECOMMEND'] as Verdict[]).map((v) => (
              <label
                key={v}
                className={`flex-1 cursor-pointer ${
                  v === 'PASS' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                  v === 'CONSIDER' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' :
                  'bg-green-50 border-green-200 hover:bg-green-100'
                } border-2 rounded-xl p-4 text-center transition-colors ${
                  verdict === v ? 'ring-2 ring-offset-2 ' + (v === 'PASS' ? 'ring-red-500' : v === 'CONSIDER' ? 'ring-yellow-500' : 'ring-green-500') : ''
                }`}
              >
                <input
                  type="radio"
                  name="verdict"
                  value={v}
                  checked={verdict === v}
                  onChange={(e) => setVerdict(e.target.value as Verdict)}
                  className="sr-only"
                />
                <span className={`font-bold text-lg ${
                  v === 'PASS' ? 'text-red-700' :
                  v === 'CONSIDER' ? 'text-yellow-700' :
                  'text-green-700'
                }`}>
                  {v}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/coverage"
            className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Coverage'}
          </button>
        </div>
      </form>
    </div>
  )
}
