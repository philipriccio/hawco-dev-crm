'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ProjectStatus, ProjectOrigin } from '@prisma/client'

const PROJECT_STATUSES = [
  { value: 'SUBMITTED', label: 'Submitted', description: 'Just came in' },
  { value: 'READING', label: 'To be Read', description: 'Being reviewed' },
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

interface Project {
  id: string
  title: string
  logline: string | null
  synopsis: string | null
  format: string | null
  genre: string | null
  comps: string | null
  status: ProjectStatus
  origin: ProjectOrigin
  verdict: string | null
  currentStage: string | null
  packagingNeeds: string | null
  nextAction: string | null
  targetNetwork: string | null
  intlPotential: boolean
  notes: string | null
  dateReceived: string | null
  optionExpiryDate: string | null
  companies?: Array<{ company: { id: string; name: string } }>
  tags?: Array<{ tag: { id: string; name: string } }>
}

interface CompanyOption {
  id: string
  name: string
}

interface GenreTag {
  id: string
  name: string
}

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<Project | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [logline, setLogline] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [format, setFormat] = useState('')
  const [genre, setGenre] = useState('')
  const [comps, setComps] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('SUBMITTED')
  const [origin, setOrigin] = useState<ProjectOrigin>('EXTERNAL')
  const [dateReceived, setDateReceived] = useState('')
  const [optionExpiryDate, setOptionExpiryDate] = useState('')
  const [currentStage, setCurrentStage] = useState('')
  const [packagingNeeds, setPackagingNeeds] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [targetNetwork, setTargetNetwork] = useState('')
  const [intlPotential, setIntlPotential] = useState(false)
  const [notes, setNotes] = useState('')
  const [verdict, setVerdict] = useState('')
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [genreTags, setGenreTags] = useState<GenreTag[]>([])
  const [selectedGenreTagIds, setSelectedGenreTagIds] = useState<string[]>([])
  const [newGenreName, setNewGenreName] = useState('')

  useEffect(() => {
    fetchProject()
  }, [projectId])

  useEffect(() => {
    const fetchMeta = async () => {
      const [companiesRes, tagsRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/tags?category=genre'),
      ])
      if (companiesRes.ok) setCompanies(await companiesRes.json())
      if (tagsRes.ok) setGenreTags(await tagsRes.json())
    }
    fetchMeta()
  }, [])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch project')
      const data = await response.json()
      setProject(data)

      // Populate form
      setTitle(data.title || '')
      setLogline(data.logline || '')
      setSynopsis(data.synopsis || '')
      setFormat(data.format || '')
      setGenre(data.genre || '')
      setComps(data.comps || '')
      setStatus(data.status || 'SUBMITTED')
      setOrigin(data.origin || 'EXTERNAL')
      setDateReceived(data.dateReceived ? data.dateReceived.split('T')[0] : '')
      setOptionExpiryDate(data.optionExpiryDate ? data.optionExpiryDate.split('T')[0] : '')
      setCurrentStage(data.currentStage || '')
      setPackagingNeeds(data.packagingNeeds || '')
      setNextAction(data.nextAction || '')
      setTargetNetwork(data.targetNetwork || '')
      setIntlPotential(data.intlPotential || false)
      setNotes(data.notes || '')
      setVerdict(data.verdict || '')
      setSelectedCompanyId(data.companies?.[0]?.company?.id || '')
      setSelectedGenreTagIds((data.tags || []).map((t: { tag: { id: string } }) => t.tag.id))
    } catch (err) {
      console.error('Error fetching project:', err)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

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
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          logline,
          synopsis,
          format,
          genre,
          genreTagIds: selectedGenreTagIds,
          companyId: selectedCompanyId || null,
          comps,
          status,
          origin,
          dateReceived: dateReceived || null,
          optionExpiryDate: optionExpiryDate || null,
          currentStage,
          packagingNeeds,
          nextAction,
          targetNetwork,
          intlPotential,
          notes,
          verdict: verdict || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      router.push(`/projects/${projectId}`)
    } catch (err) {
      console.error('Error updating project:', err)
      setError('Failed to update project. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return
    const response = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCompanyName.trim(), type: 'OTHER' }),
    })

    if (response.ok) {
      const company = await response.json()
      setCompanies((prev) => [...prev, company].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedCompanyId(company.id)
      setNewCompanyName('')
    }
  }

  const handleCreateGenreTag = async () => {
    if (!newGenreName.trim()) return
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGenreName.trim(), category: 'genre' }),
    })

    if (response.ok) {
      const tag = await response.json()
      setGenreTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedGenreTagIds((prev) => [...new Set([...prev, tag.id])])
      setNewGenreName('')
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-red-600">Project not found</p>
          <Link href="/projects" className="text-amber-600 hover:underline mt-2 inline-block">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/projects/${projectId}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Project</h1>
          <p className="text-slate-500 mt-1">Update project details</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Add Company Inline</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="New company name"
                />
                <button type="button" onClick={handleCreateCompany} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">Add</button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Genres (multi-select tags)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {genreTags.map((tag) => {
                  const selected = selectedGenreTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedGenreTagIds((prev) => selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                      className={`px-2.5 py-1 rounded-full text-xs border ${selected ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-300 text-slate-600'}`}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Create new genre tag"
                />
                <button type="button" onClick={handleCreateGenreTag} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">Add Tag</button>
              </div>
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
                onChange={(e) => setOrigin(e.target.value as ProjectOrigin)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {PROJECT_ORIGINS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verdict</label>
              <select
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">No verdict</option>
                <option value="Pass">Pass</option>
                <option value="Consider">Consider</option>
                <option value="Develop">Develop</option>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Option Expiry</label>
              <input
                type="date"
                value={optionExpiryDate}
                onChange={(e) => setOptionExpiryDate(e.target.value)}
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
                    onClick={() => setStatus(s.value as ProjectStatus)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      status === s.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-sm font-medium ${status === s.value ? 'text-amber-700' : 'text-slate-700'}`}>
                      {s.label}
                    </div>
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
            href={`/projects/${projectId}`}
            className="px-6 py-2 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}