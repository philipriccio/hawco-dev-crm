'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Verdict } from '@prisma/client'

interface ScoreField {
  value: number | ''
  notes: string
}

interface Project {
  id: string
  title: string
}

interface WriterOption {
  id: string
  name: string
}

const ADD_NEW = '__add_new__'

export default function NewCoverageForm({ initialProjectId = '', initialScriptId = '' }: { initialProjectId?: string; initialScriptId?: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [writerOptions, setWriterOptions] = useState<WriterOption[]>([])
  const [sourceOptions, setSourceOptions] = useState<string[]>([])
  const [showNewWriter, setShowNewWriter] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewSource, setShowNewSource] = useState(false)
  const [newWriterName, setNewWriterName] = useState('')
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newSourceName, setNewSourceName] = useState('')

  // Form state
  const [projectId, setProjectId] = useState(initialProjectId)
  const [prefillScriptId, setPrefillScriptId] = useState(initialScriptId)
  const [title, setTitle] = useState('')
  const [writer, setWriter] = useState('')
  const [genre, setGenre] = useState('')
  const [materials, setMaterials] = useState<{ id: string; title: string; type: string }[]>([])
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [prefillError, setPrefillError] = useState('')
  const [prefillWarning, setPrefillWarning] = useState('')
  const [preservedEdits, setPreservedEdits] = useState(false)
  const [prefillProjectTitle, setPrefillProjectTitle] = useState('')
  const [prefillRetry, setPrefillRetry] = useState(0)
  const dirty = useRef(new Set<string>())
  const prefillRequest = useRef<AbortController | null>(null)
  const [format, setFormat] = useState('')
  const [source, setSource] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [logline, setLogline] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [seriesEngine, setSeriesEngine] = useState('')
  const [targetNetwork, setTargetNetwork] = useState('')
  const [comps, setComps] = useState('')
  const [dateRead, setDateRead] = useState(new Date().toISOString().split('T')[0])
  const reader = 'Phil'

  // Fetch projects and apply project/material prefill on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) throw new Error('Could not load projects')
        const data = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Error fetching projects:', error)
        setError('Could not load projects. Reload the page to retry.')
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()

    async function fetchCoverageOptions() {
      try {
        const response = await fetch('/api/coverage/options')
        if (response.ok) {
          const data = await response.json()
          setWriterOptions(previous => [...previous, ...(data.writers || []).filter((w: WriterOption) => !previous.some(old => old.name === w.name))])
          setSourceOptions(data.sources || [])
        }
      } catch (error) {
        console.error('Error fetching coverage options:', error)
      }
    }

    fetchCoverageOptions()
  }, [])

  useEffect(() => {
    if (!projectId && !prefillScriptId) return
    const controller = new AbortController()
    prefillRequest.current = controller
    // Request lifecycle state, reset for each externally fetched project.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefillLoading(true)
    setPrefillError('')
    const query = new URLSearchParams({ projectId, scriptId: prefillScriptId })
    fetch(`/api/coverage/prefill?${query}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load coverage details')
        if (controller.signal.aborted) return
        if (!projectId) setProjectId(data.id)
        setMaterials(data.materials)
        setPrefillWarning(data.warning || '')
        setPrefillProjectTitle(data.projectTitle || '')
        for (const [field, setter] of Object.entries({ title: setTitle, writer: setWriter, format: setFormat, genre: setGenre, logline: setLogline, synopsis: setSynopsis })) {
          if (!dirty.current.has(field)) setter(data[field] || '')
        }
        if (data.writer) setWriterOptions(previous => previous.some(w => w.name === data.writer) ? previous : [...previous, { id: data.writer, name: data.writer }])
      })
      .catch(error => { if (!controller.signal.aborted) setPrefillError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setPrefillLoading(false) })
    return () => controller.abort()
  }, [projectId, prefillScriptId, prefillRetry])

  const changeProject = (id: string) => {
    prefillRequest.current?.abort()
    setPreservedEdits(dirty.current.size > 0)
    setPrefillWarning('')
    setPrefillProjectTitle('')
    setProjectId(id)
    setPrefillScriptId('')
    setMaterials([])
    setPrefillLoading(false)
    setPrefillError('')
    for (const [field, setter] of Object.entries({ title: setTitle, writer: setWriter, format: setFormat, genre: setGenre, logline: setLogline, synopsis: setSynopsis })) {
      if (!dirty.current.has(field)) setter('')
    }
  }

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

  const ensureWriter = async () => {
    if (!showNewWriter || !newWriterName.trim()) return writer

    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'WRITER', name: newWriterName.trim() }),
    })

    if (!response.ok) throw new Error('Failed to create writer')

    const created = await response.json()
    setWriterOptions((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)))
    setWriter(created.name)
    setShowNewWriter(false)
    setNewWriterName('')
    return created.name as string
  }

  const ensureProject = async () => {
    if (!showNewProject || !newProjectTitle.trim()) return projectId

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newProjectTitle.trim() }),
    })

    if (!response.ok) throw new Error('Failed to create project')

    const created = await response.json()
    setProjects((prev) => [...prev, { id: created.id, title: created.title }].sort((a, b) => a.title.localeCompare(b.title)))
    setProjectId(created.id)
    setShowNewProject(false)
    setNewProjectTitle('')
    return created.id as string
  }

  const ensureSource = async () => {
    if (!showNewSource || !newSourceName.trim()) return source

    const value = newSourceName.trim()
    setSourceOptions((prev) => [...new Set([...prev, value])].sort())
    setSource(value)
    setShowNewSource(false)
    setNewSourceName('')
    return value
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const total = calculateTotal()
      const scoreCount = Object.values(scores).filter((s) => typeof s.value === 'number' && s.value > 0).length
      const finalWriter = await ensureWriter()
      const finalProjectId = await ensureProject()
      const finalSource = await ensureSource()

      const response = await fetch('/api/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: finalProjectId,
          title,
          writer: finalWriter,
          format,
          genre,
          source: finalSource,
          draftDate,
          logline,
          synopsis: synopsis || null,
          seriesEngine: seriesEngine || null,
          targetNetwork: targetNetwork || null,
          comps: comps || null,
          dateRead,
          reader,
          scriptId: prefillScriptId || null,
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
          className="text-[#1D4ED8] hover:text-[#1E40AF] flex items-center gap-1 text-sm font-medium mb-4"
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
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              {loadingProjects ? (
                <div className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg bg-[#F2F4F7] text-slate-500">
                  Loading projects...
                </div>
              ) : (
                <select
                  required={!showNewProject}
                  value={showNewProject ? ADD_NEW : projectId}
                  onChange={(e) => {
                    if (e.target.value === ADD_NEW) {
                      setShowNewProject(true)
                      changeProject('')
                      return
                    }
                    setShowNewProject(false)
                    setNewProjectTitle('')
                    changeProject(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                  <option value={ADD_NEW}>+ Add New Project</option>
                </select>
              )}
              {showNewProject && (
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="New project title"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => { dirty.current.add('title'); setTitle(e.target.value) }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Script title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Writer <span className="text-red-500">*</span>
              </label>
              <select
                required={!showNewWriter}
                value={showNewWriter ? ADD_NEW : writer}
                onChange={(e) => {
                  if (e.target.value === ADD_NEW) {
                    dirty.current.add('writer')
                    setShowNewWriter(true)
                    setWriter('')
                    return
                  }
                  dirty.current.add('writer')
                  setShowNewWriter(false)
                  setNewWriterName('')
                  setWriter(e.target.value)
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                <option value="">Select a writer...</option>
                {writerOptions.map((w) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
                <option value={ADD_NEW}>+ Add New Writer</option>
              </select>
              {showNewWriter && (
                <input
                  type="text"
                  required
                  value={newWriterName}
                  onChange={(e) => setNewWriterName(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="New writer name"
                />
              )}
            </div>
            <div>
              <label htmlFor="coverage-genre" className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
              <input id="coverage-genre" value={genre} onChange={e => { dirty.current.add('genre'); setGenre(e.target.value) }} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Comedy, Thriller" />
            </div>
            <div>
              <label htmlFor="coverage-material" className="block text-sm font-medium text-slate-700 mb-1">Material read</label>
              <select id="coverage-material" value={prefillScriptId} onChange={e => { prefillRequest.current?.abort(); setPrefillScriptId(e.target.value) }} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                <option value="">{materials.filter(m => ['PILOT_SCRIPT', 'FEATURE_SCRIPT'].includes(m.type)).length > 1 ? 'Select the script or material you read...' : 'Use the project’s only script, if available'}</option>
                {materials.map(material => <option key={material.id} value={material.id}>{material.title}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Saving marks the project and this material as read. Other attachments and revisions stay unchanged.</p>
            </div>
            <div className="md:col-span-2" aria-live="polite">
              {preservedEdits && <p role="alert" className="text-sm text-amber-800">Your manually edited details were kept after changing projects. Check that they describe the newly selected project before saving.</p>}
              {prefillWarning && <p role="alert" className="text-sm text-amber-800">{prefillWarning}</p>}
              {prefillProjectTitle && <p className="text-sm text-slate-600">Saved details from “{prefillProjectTitle}”. Check these match your material.</p>}
              {prefillLoading && <p className="text-sm text-slate-500">Loading saved project details…</p>}
              {prefillError && <p role="alert" className="text-sm text-red-700">{prefillError} <button type="button" onClick={() => setPrefillRetry(n => n + 1)} className="underline">Retry</button></p>}
              <p className="text-xs text-slate-500">Missing details stay blank. You can edit all fields.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => { dirty.current.add('format'); setFormat(e.target.value) }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                {format && !formatOptions.includes(format) && <option value={format}>{format}</option>}
                {formatOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt || 'Select format...'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select
                value={showNewSource ? ADD_NEW : source}
                onChange={(e) => {
                  if (e.target.value === ADD_NEW) {
                    setShowNewSource(true)
                    setSource('')
                    return
                  }
                  setShowNewSource(false)
                  setNewSourceName('')
                  setSource(e.target.value)
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                <option value="">Select source...</option>
                {sourceOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value={ADD_NEW}>+ Add New Source</option>
              </select>
              {showNewSource && (
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="New source"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Draft Date</label>
              <input
                type="text"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="coverage-logline" className="block text-sm font-medium text-slate-700 mb-1">Logline</label>
              <textarea
                id="coverage-logline"
                value={logline}
                onChange={(e) => { dirty.current.add('logline'); setLogline(e.target.value) }}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="One short sentence describing the central story..."
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="coverage-synopsis" className="block text-sm font-medium text-slate-700 mb-1">Synopsis</label>
              <textarea
                id="coverage-synopsis"
                value={synopsis}
                onChange={(e) => { dirty.current.add('synopsis'); setSynopsis(e.target.value) }}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="1–2 short sentences covering the central story..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comparable Shows</label>
              <input
                type="text"
                value={comps}
                onChange={(e) => setComps(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="e.g. Schitt's Creek, Burden of Truth"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Network / Platform</label>
              <input
                type="text"
                value={targetNetwork}
                onChange={(e) => setTargetNetwork(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="CBC, Crave, Netflix Canada, CTV..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Series Engine</label>
              <textarea
                value={seriesEngine}
                onChange={(e) => setSeriesEngine(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="What recurring conflict/dynamic generates 50+ episodes?"
              />
            </div>
          </div>
        </section>

        {/* Scorecard */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Scorecard</h2>
            <div className="text-lg font-bold text-slate-700">
              Total: <span className={calculateTotal() >= 40 ? 'text-green-600' : calculateTotal() >= 30 ? 'text-yellow-600' : 'text-red-600'}>{calculateTotal()}</span>/50
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(scoreLabels).map(([key, label]) => (
              <div key={key} className="flex flex-col sm:flex-row items-start gap-3">
                <div className="w-28 flex-shrink-0 pt-2">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => handleScoreChange(key, 'value', score)}
                        className={`w-8 h-8 rounded-full font-bold text-sm transition-colors ${
                          scores[key].value === score
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleScoreChange(key, 'value', '')}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 ml-1"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={scores[key].notes}
                    onChange={(e) => handleScoreChange(key, 'notes', e.target.value)}
                    placeholder={`Notes on ${label.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mandate Checklist */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Mandate Checklist</h2>
          <p className="text-sm text-slate-500 mb-4">Click to toggle ✓ (yes) or ✗ (no)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMandates((prev) => ({ ...prev, mandateCanadian: !prev.mandateCanadian }))}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                mandates.mandateCanadian 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                mandates.mandateCanadian ? 'bg-green-500' : 'bg-red-400'
              }`}>
                {mandates.mandateCanadian ? '✓' : '✗'}
              </span>
              <span className={`font-medium ${mandates.mandateCanadian ? 'text-green-800' : 'text-red-700'}`}>Canadian Content</span>
            </button>
            <button
              type="button"
              onClick={() => setMandates((prev) => ({ ...prev, mandateStarRole: !prev.mandateStarRole }))}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                mandates.mandateStarRole 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                mandates.mandateStarRole ? 'bg-green-500' : 'bg-red-400'
              }`}>
                {mandates.mandateStarRole ? '✓' : '✗'}
              </span>
              <span className={`font-medium ${mandates.mandateStarRole ? 'text-green-800' : 'text-red-700'}`}>Star Role</span>
            </button>
            <button
              type="button"
              onClick={() => setMandates((prev) => ({ ...prev, mandateIntlCoPro: !prev.mandateIntlCoPro }))}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                mandates.mandateIntlCoPro 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                mandates.mandateIntlCoPro ? 'bg-green-500' : 'bg-red-400'
              }`}>
                {mandates.mandateIntlCoPro ? '✓' : '✗'}
              </span>
              <span className={`font-medium ${mandates.mandateIntlCoPro ? 'text-green-800' : 'text-red-700'}`}>Int&apos;l Co-Pro Friendly</span>
            </button>
            <button
              type="button"
              onClick={() => setMandates((prev) => ({ ...prev, mandateBudget: !prev.mandateBudget }))}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                mandates.mandateBudget 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                mandates.mandateBudget ? 'bg-green-500' : 'bg-red-400'
              }`}>
                {mandates.mandateBudget ? '✓' : '✗'}
              </span>
              <span className={`font-medium ${mandates.mandateBudget ? 'text-green-800' : 'text-red-700'}`}>Budget Feasible</span>
            </button>
          </div>
        </section>

        {/* Analyst Comments */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Analyst Comments</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Strengths</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="What works well in this script..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weaknesses</label>
              <textarea
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Areas that need improvement..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Overall assessment..."
              />
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Verdict</h2>
          <div className="flex flex-wrap gap-2">
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
                <span className={`font-bold text-sm sm:text-lg ${
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
            disabled={isSubmitting || prefillLoading}
            className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Coverage'}
          </button>
        </div>
      </form>
    </div>
  )
}
