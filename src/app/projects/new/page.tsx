'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const PROJECT_STATUSES = [
  { value: 'SUBMITTED', label: 'Submitted', description: 'Just came in' },
  { value: 'READING', label: 'Reading', description: 'Being reviewed' },
  { value: 'CONSIDERING', label: 'Considering', description: 'Under consideration' },
  { value: 'PASSED', label: 'Passed', description: 'Not moving forward' },
  { value: 'DEVELOPING', label: 'Developing', description: 'In active development' },
  { value: 'PACKAGING', label: 'Packaging', description: 'Attaching talent/partners' },
  { value: 'PITCHED', label: 'Pitched', description: 'Pitched to networks' },
  { value: 'GREENLIT', label: 'Greenlit', description: 'Got the green light' },
  { value: 'IN_PRODUCTION', label: 'In Production', description: 'Currently filming' },
  { value: 'RELEASED', label: 'Released', description: 'Aired/released' },
  { value: 'ON_HOLD', label: 'On Hold', description: 'Paused' },
]

const PROJECT_ORIGINS = [
  { value: 'EXTERNAL', label: 'External Submission', description: 'Submitted to us' },
  { value: 'HAWCO_ORIGINAL', label: 'Hawco Original', description: 'Developed in-house' },
]

const FORMATS = [
  '½ Hour Comedy',
  '1 Hour Drama',
  '1 Hour Procedural',
  'Limited Series',
  'Feature Film',
  'Documentary',
  'Other',
]

const GENRES = [
  'Comedy',
  'Drama',
  'Thriller',
  'Action',
  'Sci-Fi',
  'Horror',
  'Romance',
  'Crime',
  'Mystery',
  'Documentary',
  'Family',
  'Animation',
]

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [logline, setLogline] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [format, setFormat] = useState('')
  const [genre, setGenre] = useState('')
  const [comps, setComps] = useState('')
  const [status, setStatus] = useState('SUBMITTED')
  const [origin, setOrigin] = useState('EXTERNAL')
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0])
  const [currentStage, setCurrentStage] = useState('')
  const [packagingNeeds, setPackagingNeeds] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [targetNetwork, setTargetNetwork] = useState('')
  const [intlPotential, setIntlPotential] = useState(false)
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          logline,
          synopsis,
          format,
          genre,
          comps,
          status,
          origin,
          dateReceived,
          currentStage,
          packagingNeeds,
          nextAction,
          targetNetwork,
          intlPotential,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const project = await response.json()
      router.push(`/projects/${project.id}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError('Failed to create project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/projects" className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Project</h1>
          <p className="text-slate-500 mt-1">Add a new project to track</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Project title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Select format...</option>
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Select genre...</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Logline</label>
              <textarea
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="One-sentence summary of the project..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Synopsis</label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Longer description of the project..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Comps</label>
              <input
                type="text"
                value={comps}
                onChange={(e) => setComps(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Comparison titles (e.g., 'Breaking Bad meets The Office')"
              />
            </div>
          </div>
        </section>

        {/* Status & Tracking */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Status & Tracking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {PROJECT_ORIGINS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PROJECT_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      status === s.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-sm font-medium ${status === s.value ? 'text-amber-700' : 'text-slate-700'}`}>
                      {s.label}
                    </div>
                    <div className="text-xs text-slate-500">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Development Info */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Development Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Stage</label>
              <input
                type="text"
                value={currentStage}
                onChange={(e) => setCurrentStage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="e.g., 'Second draft', 'Bible development'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Network</label>
              <input
                type="text"
                value={targetNetwork}
                onChange={(e) => setTargetNetwork(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="e.g., 'CBC', 'Crave', 'Netflix'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Packaging Needs</label>
              <input
                type="text"
                value={packagingNeeds}
                onChange={(e) => setPackagingNeeds(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="e.g., 'Needs showrunner', 'Seeking lead actor'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Next Action</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="e.g., 'Send notes to writer', 'Schedule pitch meeting'"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setIntlPotential(!intlPotential)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  intlPotential
                    ? 'bg-green-50 border-green-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  intlPotential ? 'bg-green-500' : 'bg-slate-400'
                }`}>
                  {intlPotential ? '✓' : '✗'}
                </span>
                <span className={`font-medium ${intlPotential ? 'text-green-800' : 'text-slate-600'}`}>
                  International Co-Production Potential
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Additional notes about this project..."
          />
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/projects"
            className="px-6 py-2 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
