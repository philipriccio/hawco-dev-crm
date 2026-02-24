'use client'

import { useState, useEffect, useRef } from 'react'
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
  writer: { id: string; name: string } | null
}

interface Project {
  id: string
  title: string
}

interface Writer {
  id: string
  name: string
  email?: string | null
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
  const [formReadStatus, setFormReadStatus] = useState<'READING' | 'READ'>('READING')
  const [formFileUrl, setFormFileUrl] = useState('')
  const [formFilename, setFormFilename] = useState('')
  const [formFileSize, setFormFileSize] = useState<number | null>(null)
  const [formMimeType, setFormMimeType] = useState<string | null>(null)
  const [formNotes, setFormNotes] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Writer dropdown state
  const [writers, setWriters] = useState<Writer[]>([])
  const [writerSearch, setWriterSearch] = useState('')
  const [showWriterDropdown, setShowWriterDropdown] = useState(false)
  const [selectedWriter, setSelectedWriter] = useState<Writer | null>(null)
  const [showNewWriterForm, setShowNewWriterForm] = useState(false)
  const writerDropdownRef = useRef<HTMLDivElement>(null)
  const [newWriter, setNewWriter] = useState({ name: '', email: '' })

  useEffect(() => {
    fetchMaterials()
    fetchProjects()
    fetchWriters()
  }, [typeFilter, projectFilter])
  
  // Close writer dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (writerDropdownRef.current && !writerDropdownRef.current.contains(event.target as Node)) {
        setShowWriterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  async function fetchWriters() {
    try {
      const response = await fetch('/api/contacts?type=WRITER')
      if (response.ok) {
        const data = await response.json()
        setWriters(data)
      }
    } catch (error) {
      console.error('Error fetching writers:', error)
    }
  }

  const filteredWriters = writers.filter(writer =>
    writer.name.toLowerCase().includes(writerSearch.toLowerCase())
  )

  function handleSelectWriter(writer: Writer) {
    setSelectedWriter(writer)
    setWriterSearch(writer.name)
    setShowWriterDropdown(false)
    setShowNewWriterForm(false)
  }

  function handleWriterSearchChange(value: string) {
    setWriterSearch(value)
    setShowWriterDropdown(true)
    if (selectedWriter && selectedWriter.name !== value) {
      setSelectedWriter(null)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt']
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      setUploadError('File type not allowed. Allowed types: PDF, DOC, DOCX, TXT')
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size: 10MB')
      return
    }

    setUploadingFile(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setFormFileUrl(data.url)
        setFormFilename(data.filename)
        setFormFileSize(data.fileSize)
        setFormMimeType(data.mimeType)
      } else {
        const error = await response.json()
        setUploadError(error.error || 'Failed to upload file')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadError('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormSubmitting(true)

    try {
      // Handle project creation if "Create new project" is selected or no project selected
      let finalProjectId = formProjectId
      
      if (!formProjectId || formProjectId === 'CREATE_NEW') {
        // Auto-create a new project using the script title
        const projectResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            status: formReadStatus, // Set READ or READING based on read status
            dateReceived: new Date().toISOString(),
          }),
        })

        if (!projectResponse.ok) {
          throw new Error('Failed to create project')
        }

        const newProject = await projectResponse.json()
        finalProjectId = newProject.id
        
        // Refresh projects list
        fetchProjects()
      } else if (formReadStatus === 'READ') {
        // Update existing project status to READ
        await fetch(`/api/projects/${formProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'READ' }),
        })
      }

      const submitData: Record<string, unknown> = {
        type: formType,
        title: formTitle,
        filename: formFilename || formTitle,
        fileUrl: formFileUrl,
        fileSize: formFileSize,
        mimeType: formMimeType,
        notes: formNotes || null,
        projectId: finalProjectId,
      }
      
      // Add writer information
      if (selectedWriter) {
        submitData.writerId = selectedWriter.id
      } else if (showNewWriterForm && newWriter.name) {
        submitData.newWriter = newWriter
      }
      
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
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
    setFormReadStatus('READING')
    setFormFileUrl('')
    setFormFilename('')
    setFormFileSize(null)
    setFormMimeType(null)
    setFormNotes('')
    setUploadError(null)
    setSelectedWriter(null)
    setWriterSearch('')
    setShowNewWriterForm(false)
    setNewWriter({ name: '', email: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
                  <option value="CREATE_NEW">— Create new project —</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Read Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Read Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formReadStatus}
                  onChange={(e) => setFormReadStatus(e.target.value as 'READING' | 'READ')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="READING">📖 To Be Read</option>
                  <option value="READ">✓ Already Read</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Sets the project status. Choose "Already Read" if you've already reviewed this script.
                </p>
              </div>

              {/* Writer */}
              <div className="relative" ref={writerDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Writer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={writerSearch}
                    onChange={(e) => handleWriterSearchChange(e.target.value)}
                    onFocus={() => setShowWriterDropdown(true)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                    placeholder="Search for a writer..."
                  />
                  <svg 
                    className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {showWriterDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredWriters.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">No writers found</div>
                    )}
                    {filteredWriters.map((writer) => (
                      <button
                        key={writer.id}
                        type="button"
                        onClick={() => handleSelectWriter(writer)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm"
                      >
                        <div className="font-medium text-slate-900">{writer.name}</div>
                        {writer.email && <div className="text-xs text-slate-500">{writer.email}</div>}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowNewWriterForm(true); setShowWriterDropdown(false); }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 border-t text-amber-600 font-medium text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add new writer
                    </button>
                  </div>
                )}
              </div>

              {/* New Writer Form */}
              {showNewWriterForm && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">New Writer</span>
                    <button type="button" onClick={() => { setShowNewWriterForm(false); setNewWriter({ name: '', email: '' }); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newWriter.name}
                      onChange={(e) => setNewWriter({ ...newWriter, name: e.target.value })}
                      placeholder="Writer name *"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                      required={showNewWriterForm}
                    />
                    <input
                      type="email"
                      value={newWriter.email}
                      onChange={(e) => setNewWriter({ ...newWriter, email: e.target.value })}
                      placeholder="Email (optional)"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  required={!formFileUrl}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Accepted: PDF, DOC, DOCX, TXT. Max 10MB.
                </p>
                {uploadingFile && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </p>
                )}
                {uploadError && (
                  <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                )}
                {formFilename && !uploadingFile && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Uploaded: {formFilename} ({formatFileSize(formFileSize)})
                  </p>
                )}
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
                  disabled={formSubmitting || uploadingFile || !formFileUrl}
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
