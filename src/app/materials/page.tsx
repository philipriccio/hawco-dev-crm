'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Material {
  id: string
  type: string
  title: string
  filename: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  project: { id: string; title: string } | null
  submittedBy: { id: string; name: string } | null
}

interface Project {
  id: string
  title: string
}

const typeColors: Record<string, string> = {
  PILOT_SCRIPT: 'bg-indigo-100 text-indigo-700',
  SERIES_BIBLE: 'bg-purple-100 text-purple-700',
  PITCH_DECK: 'bg-amber-100 text-amber-700',
  TREATMENT: 'bg-teal-100 text-teal-700',
  FEATURE_SCRIPT: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-slate-100 text-slate-700',
}

const typeLabels: Record<string, string> = {
  PILOT_SCRIPT: 'Pilot Script',
  SERIES_BIBLE: 'Series Bible',
  PITCH_DECK: 'Pitch Deck',
  TREATMENT: 'Treatment',
  FEATURE_SCRIPT: 'Feature Script',
  OTHER: 'Other',
}

const typeIcons: Record<string, string> = {
  PILOT_SCRIPT: '📺',
  SERIES_BIBLE: '📚',
  PITCH_DECK: '📊',
  TREATMENT: '📝',
  FEATURE_SCRIPT: '🎬',
  OTHER: '📄',
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state
  const [formType, setFormType] = useState('PILOT_SCRIPT')
  const [formTitle, setFormTitle] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formFileUrl, setFormFileUrl] = useState('')
  const [formFilename, setFormFilename] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    fetchMaterials()
    fetchProjects()
  }, [typeFilter, projectFilter])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMaterials()
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  async function fetchMaterials() {
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.append('type', typeFilter)
      if (projectFilter) params.append('projectId', projectFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/materials?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProjects() {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormSubmitting(true)

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          title: formTitle,
          filename: formFilename || formTitle,
          fileUrl: formFileUrl,
          notes: formNotes || null,
          projectId: formProjectId || null,
        }),
      })

      if (response.ok) {
        setShowAddModal(false)
        resetForm()
        fetchMaterials()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create material')
      }
    } catch (error) {
      console.error('Error creating material:', error)
      alert('Failed to create material')
    } finally {
      setFormSubmitting(false)
    }
  }

  function resetForm() {
    setFormType('PILOT_SCRIPT')
    setFormTitle('')
    setFormProjectId('')
    setFormFileUrl('')
    setFormFilename('')
    setFormNotes('')
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '—'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredMaterials = materials

  const typeCounts = materials.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Materials</h1>
          <p className="text-slate-500 mt-1">Scripts, pitch decks, treatments, and other documents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Material
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={!typeFilter}
              onClick={() => setTypeFilter('')}
              count={materials.length}
            >
              All
            </FilterPill>
            {Object.entries(typeLabels).map(([type, label]) => (
              <FilterPill
                key={type}
                active={typeFilter === type}
                onClick={() => setTypeFilter(type === typeFilter ? '' : type)}
                count={typeCounts[type] || 0}
              >
                {typeIcons[type]} {label}
              </FilterPill>
            ))}
          </div>

          {/* Project Filter */}
          <div className="md:ml-auto">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-64"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Material
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Project
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Submitted By
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Size
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Added
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMaterials.map((material) => (
              <tr key={material.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeIcons[material.type]}</span>
                    <div>
                      <p className="font-medium text-slate-900">{material.title}</p>
                      <p className="text-xs text-slate-400">{material.filename}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      typeColors[material.type] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {typeLabels[material.type] || material.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {material.project ? (
                    <Link
                      href={`/projects/${material.project.id}`}
                      className="text-amber-600 hover:underline"
                    >
                      {material.project.title}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {material.submittedBy ? (
                    <Link
                      href={`/contacts/${material.submittedBy.id}`}
                      className="text-amber-600 hover:underline"
                    >
                      {material.submittedBy.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {formatFileSize(material.fileSize)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {formatDate(material.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View
                  </a>
                </td>
              </tr>
            ))}
            {filteredMaterials.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No materials found.
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-amber-600 hover:underline ml-1"
                  >
                    Add your first material
                  </button>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  Loading materials...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add New Material</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Material Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {Object.entries(typeLabels).map(([type, label]) => (
                    <option key={type} value={type}>
                      {typeIcons[type]} {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Pilot Script - The Last Light"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Associated Project
                </label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">— No project —</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* File URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  File URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Link to the file (S3, Google Drive, Dropbox, etc.)
                </p>
              </div>

              {/* Filename */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  value={formFilename}
                  onChange={(e) => setFormFilename(e.target.value)}
                  placeholder="e.g., pilot-script.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional notes about this material..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? 'Adding...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-amber-500 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-amber-200' : 'text-slate-400'}`}>
        {count}
      </span>
    </button>
  )
}
