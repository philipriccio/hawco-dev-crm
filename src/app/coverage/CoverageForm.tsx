'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Verdict = 'PASS' | 'CONSIDER' | 'RECOMMEND'

interface Coverage {
  id: string
  reader: string
  dateRead: Date | string
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
}

interface Material {
  id: string
  title: string
  project: { id: string; title: string } | null
}

interface Project {
  id: string
  title: string
}

interface PrefillData {
  title?: string
  writer?: string
  projectId?: string
  scriptId?: string
}

interface CoverageFormProps {
  coverage?: Coverage | null
  materials: Material[]
  projects: Project[]
  mode: 'create' | 'edit'
  prefillData?: PrefillData
}

const verdictColors: Record<Verdict, string> = {
  PASS: 'bg-red-100 text-red-700 border-red-300',
  CONSIDER: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  RECOMMEND: 'bg-green-100 text-green-700 border-green-300',
}

export default function CoverageForm({ coverage, materials, projects, mode, prefillData }: CoverageFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    reader: coverage?.reader || 'Phil',
    dateRead: coverage?.dateRead 
      ? new Date(coverage.dateRead).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    title: coverage?.title || prefillData?.title || '',
    writer: coverage?.writer || prefillData?.writer || '',
    format: coverage?.format || '',
    source: coverage?.source || '',
    draftDate: coverage?.draftDate || '',
    logline: coverage?.logline || '',
    scoreConcept: coverage?.scoreConcept ?? '',
    scoreCharacters: coverage?.scoreCharacters ?? '',
    scoreStructure: coverage?.scoreStructure ?? '',
    scoreDialogue: coverage?.scoreDialogue ?? '',
    scoreMarketFit: coverage?.scoreMarketFit ?? '',
    notesConcept: coverage?.notesConcept || '',
    notesCharacters: coverage?.notesCharacters || '',
    notesStructure: coverage?.notesStructure || '',
    notesDialogue: coverage?.notesDialogue || '',
    notesMarketFit: coverage?.notesMarketFit || '',
    mandateCanadian: coverage?.mandateCanadian ?? false,
    mandateStarRole: coverage?.mandateStarRole ?? false,
    mandateIntlCoPro: coverage?.mandateIntlCoPro ?? false,
    mandateBudget: coverage?.mandateBudget ?? false,
    strengths: coverage?.strengths || '',
    weaknesses: coverage?.weaknesses || '',
    summary: coverage?.summary || '',
    verdict: coverage?.verdict || 'PASS' as Verdict,
    scriptId: coverage?.scriptId || prefillData?.scriptId || '',
    projectId: coverage?.projectId || prefillData?.projectId || '',
  })

  const scoreTotal = [
    formData.scoreConcept,
    formData.scoreCharacters,
    formData.scoreStructure,
    formData.scoreDialogue,
    formData.scoreMarketFit,
  ]
    .filter((s): s is string | number => s !== '')
    .reduce((sum: number, s) => sum + Number(s), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = mode === 'edit' ? `/api/coverage/${coverage?.id}` : '/api/coverage'
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dateRead: new Date(formData.dateRead),
          scoreConcept: formData.scoreConcept === '' ? null : Number(formData.scoreConcept),
          scoreCharacters: formData.scoreCharacters === '' ? null : Number(formData.scoreCharacters),
          scoreStructure: formData.scoreStructure === '' ? null : Number(formData.scoreStructure),
          scoreDialogue: formData.scoreDialogue === '' ? null : Number(formData.scoreDialogue),
          scoreMarketFit: formData.scoreMarketFit === '' ? null : Number(formData.scoreMarketFit),
          scoreTotal: scoreTotal || null,
          scriptId: formData.scriptId || null,
          projectId: formData.projectId || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const saved = await res.json()
      router.push(`/coverage/${saved.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving coverage:', error)
      alert('Failed to save coverage')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this coverage? This cannot be undone.')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/coverage/${coverage?.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/coverage')
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete coverage')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/coverage" className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">
            {mode === 'edit' ? 'Edit Coverage' : 'New Coverage'}
          </h1>
        </div>
        {mode === 'edit' && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center border-b pb-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900">HAWCO PRODUCTIONS | SCRIPT ASSESSMENT</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reader</label>
              <input
                type="text"
                value={formData.reader}
                onChange={(e) => setFormData({ ...formData, reader: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.dateRead}
                onChange={(e) => setFormData({ ...formData, dateRead: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Project Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Writer *</label>
              <input
                type="text"
                required
                value={formData.writer}
                onChange={(e) => setFormData({ ...formData, writer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <input
                type="text"
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="1 Hour Drama, ½ Hour Comedy, Feature..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Who sent it (agent, producer, etc.)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Draft Date</label>
              <input
                type="text"
                value={formData.draftDate}
                onChange={(e) => setFormData({ ...formData, draftDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="April 2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link to Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Logline</label>
            <textarea
              value={formData.logline}
              onChange={(e) => setFormData({ ...formData, logline: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Scorecard */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
            The Scorecard <span className="text-slate-400 font-normal">(1 = Poor, 10 = Excellent)</span>
          </h3>
          <div className="space-y-4">
            {[
              { key: 'scoreConcept', noteKey: 'notesConcept', label: 'Concept' },
              { key: 'scoreCharacters', noteKey: 'notesCharacters', label: 'Characters' },
              { key: 'scoreStructure', noteKey: 'notesStructure', label: 'Structure' },
              { key: 'scoreDialogue', noteKey: 'notesDialogue', label: 'Dialogue' },
              { key: 'scoreMarketFit', noteKey: 'notesMarketFit', label: 'Market Fit' },
            ].map(({ key, noteKey, label }) => (
              <div key={key} className="grid grid-cols-12 gap-4 items-start">
                <label className="col-span-2 text-sm font-medium text-slate-700 pt-2">{label}</label>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={formData[key as keyof typeof formData] as string | number}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-center"
                    placeholder="1-10"
                  />
                </div>
                <div className="col-span-8">
                  <input
                    type="text"
                    value={formData[noteKey as keyof typeof formData] as string}
                    onChange={(e) => setFormData({ ...formData, [noteKey]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    placeholder="Notes..."
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-4 items-center border-t pt-4">
              <span className="col-span-2 text-sm font-bold text-slate-900">Total</span>
              <span className="col-span-2 text-center font-bold text-lg">{scoreTotal}/50</span>
            </div>
          </div>
        </div>

        {/* Mandate Checklist */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Mandate Checklist</h3>
          <p className="text-xs text-slate-500 mb-4">Click to toggle ✓ or ✗</p>
          <div className="grid grid-cols-2 gap-3">
            <MandateToggle 
              checked={formData.mandateCanadian} 
              label="Canadian Content"
              onToggle={() => setFormData(prev => ({ ...prev, mandateCanadian: !prev.mandateCanadian }))}
            />
            <MandateToggle 
              checked={formData.mandateStarRole} 
              label="Star Role"
              onToggle={() => setFormData(prev => ({ ...prev, mandateStarRole: !prev.mandateStarRole }))}
            />
            <MandateToggle 
              checked={formData.mandateIntlCoPro} 
              label="Int'l Co-Pro Friendly"
              onToggle={() => setFormData(prev => ({ ...prev, mandateIntlCoPro: !prev.mandateIntlCoPro }))}
            />
            <MandateToggle 
              checked={formData.mandateBudget} 
              label="Budget Feasible"
              onToggle={() => setFormData(prev => ({ ...prev, mandateBudget: !prev.mandateBudget }))}
            />
          </div>
        </div>

        {/* Analyst Comments */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Analyst Comments</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Strengths</label>
              <textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="- Strong teaser&#10;- Well-paced act structure&#10;- Great lead character"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weaknesses</label>
              <textarea
                value={formData.weaknesses}
                onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="- Generic dialogue&#10;- Plot holes in Act 3&#10;- Weak antagonist"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Verdict</h3>
          <div className="flex gap-3">
            {(['PASS', 'CONSIDER', 'RECOMMEND'] as Verdict[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFormData({ ...formData, verdict: v })}
                className={`px-6 py-3 rounded-lg border-2 font-bold text-lg transition-all ${
                  formData.verdict === v
                    ? verdictColors[v]
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/coverage"
            className="px-6 py-2 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Coverage'}
          </button>
        </div>
      </form>
    </div>
  )
}

function MandateToggle({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
        checked 
          ? 'bg-green-50 border-green-300 hover:bg-green-100' 
          : 'bg-red-50 border-red-200 hover:bg-red-100'
      }`}
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm ${
        checked ? 'bg-green-500' : 'bg-red-400'
      }`}>
        {checked ? '✓' : '✗'}
      </span>
      <span className={`text-sm font-medium ${checked ? 'text-green-800' : 'text-red-700'}`}>{label}</span>
    </button>
  )
}
