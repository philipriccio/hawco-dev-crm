'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

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
  readAt: string | null
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
  PITCH_DECK: 'bg-[#EFF6FF] text-[#1D4ED8]',
  TREATMENT: 'bg-teal-100 text-teal-700',
  FEATURE_SCRIPT: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-[#F2F4F7] text-slate-700',
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

function MaterialsPageContent() {
  const searchParams = useSearchParams()
  
  const [materials, setMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Edit modal state
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editProjectId, setEditProjectId] = useState('')
  const [editType, setEditType] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const createdMaterial = await response.json()
        
        // Link writer to project as team member if we created a new project
        const writerIdToLink = createdMaterial.writerId || selectedWriter?.id
        if (writerIdToLink && (!formProjectId || formProjectId === 'CREATE_NEW')) {
          try {
            await fetch(`/api/projects/${finalProjectId}/contacts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contactId: writerIdToLink,
                role: 'WRITER',
              }),
            })
          } catch (err) {
            console.error('Failed to link writer to project:', err)
            // Don't block the flow - material was created successfully
          }
        }
        
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

  function openEditModal(material: Material) {
    setEditingMaterial(material)
    setEditTitle(material.title)
    setEditProjectId(material.project?.id || '')
    setEditType(material.type)
    setEditNotes(material.notes || '')
  }

  async function handleEditSave() {
    if (!editingMaterial) return
    setEditSaving(true)
    
    try {
      const response = await fetch(`/api/materials/${editingMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          type: editType,
          notes: editNotes,
          projectId: editProjectId || null,
        }),
      })
      
      if (response.ok) {
        setEditingMaterial(null)
        fetchMaterials()
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      console.error('Error updating material:', error)
      alert('Failed to update material')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleToggleRead(material: Material, markAsRead: boolean) {
    const previous = materials
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === material.id
          ? { ...m, readAt: markAsRead ? new Date().toISOString() : null }
          : m
      )
    )

    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsRead }),
      })

      if (!response.ok) {
        throw new Error('Failed to update read state')
      }
    } catch (error) {
      console.error('Error updating read state:', error)
      setMaterials(previous)
      alert('Failed to update read state')
    }
  }

  async function handleDelete(material: Material) {
    const confirmMessage = `Are you sure you want to delete "${material.title}"?`
    if (!confirm(confirmMessage)) return
    
    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchMaterials()
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('Failed to delete material')
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Material
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-6">
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
              className="px-3 py-1.5 rounded-lg border border-[#E4E7EC] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
              className="pl-9 pr-3 py-1.5 rounded-lg border border-[#E4E7EC] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-64"
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
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E4E7EC]">
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
                Read
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMaterials.map((material) => (
              <tr key={material.id} className="hover:bg-[#F2F4F7]">
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
                      typeColors[material.type] || 'bg-[#F2F4F7] text-slate-700'
                    }`}
                  >
                    {typeLabels[material.type] || material.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {material.project ? (
                    <Link
                      href={`/projects/${material.project.id}`}
                      className="text-[#2563EB] hover:underline"
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
                      className="text-[#2563EB] hover:underline"
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
                <td className="px-6 py-4 text-sm">
                  {material.readAt ? (
                    <span className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      {formatDate(material.readAt)}
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-xs font-medium">Unread</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRead(material, !material.readAt)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        material.readAt
                          ? 'text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-[#F8F9FB]'
                          : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={material.readAt ? 'M10 14L21 3m0 0l-7 0m7 0l0 7M3 10l0 11 11 0' : 'M5 13l4 4L19 7'} />
                      </svg>
                      {material.readAt ? 'Mark Unread' : 'Mark Read'}
                    </button>
                    <button
                      onClick={() => openEditModal(material)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-[#F2F4F7] rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(material)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                    <a
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#F8F9FB] rounded-lg transition-colors"
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
                  </div>
                </td>
              </tr>
            ))}
            {filteredMaterials.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  No materials found.
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-[#2563EB] hover:underline ml-1"
                  >
                    Add your first material
                  </button>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
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
            <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
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
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  required
                >
                  <option value="READING">📖 To Be Read</option>
                  <option value="READ">✓ Already Read</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Sets the project status. Choose &quot;Already Read&quot; if you&apos;ve already reviewed this script.
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
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] pr-10"
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
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#E4E7EC] rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredWriters.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">No writers found</div>
                    )}
                    {filteredWriters.map((writer) => (
                      <button
                        key={writer.id}
                        type="button"
                        onClick={() => handleSelectWriter(writer)}
                        className="w-full px-4 py-2 text-left hover:bg-[#F2F4F7] text-sm"
                      >
                        <div className="font-medium text-slate-900">{writer.name}</div>
                        {writer.email && <div className="text-xs text-slate-500">{writer.email}</div>}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowNewWriterForm(true); setShowWriterDropdown(false); }}
                      className="w-full px-4 py-2 text-left hover:bg-[#F2F4F7] border-t text-[#2563EB] font-medium text-sm flex items-center gap-1"
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
                <div className="bg-[#F2F4F7] rounded-lg p-4 space-y-3">
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
                      className="px-3 py-2 rounded-lg border border-[#E4E7EC] text-sm"
                      required={showNewWriterForm}
                    />
                    <input
                      type="email"
                      value={newWriter.email}
                      onChange={(e) => setNewWriter({ ...newWriter, email: e.target.value })}
                      placeholder="Email (optional)"
                      className="px-3 py-2 rounded-lg border border-[#E4E7EC] text-sm"
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
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#F8F9FB] file:text-[#1D4ED8] hover:file:bg-[#EFF6FF]"
                  required={!formFileUrl}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Accepted: PDF, DOC, DOCX, TXT. Max 10MB.
                </p>
                {uploadingFile && (
                  <p className="text-xs text-[#2563EB] mt-1 flex items-center gap-1">
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
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-[#F2F4F7] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || uploadingFile || !formFileUrl}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? 'Adding...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Edit Material</h2>
              <button
                onClick={() => setEditingMaterial(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  {Object.entries(typeLabels).map(([type, label]) => (
                    <option key={type} value={type}>
                      {typeIcons[type]} {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="">— No project —</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                {!editProjectId && (
                  <p className="text-xs text-[#2563EB] mt-1">
                    ⚠️ This material is not linked to a project
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-[#F2F4F7] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
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
          ? 'bg-[#2563EB] text-white'
          : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-blue-200' : 'text-slate-400'}`}>
        {count}
      </span>
    </button>
  )
}

function MaterialsLoadingFallback() {
  return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-72 mb-6"></div>
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-6">
          <div className="h-10 bg-[#F2F4F7] rounded"></div>
        </div>
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#F2F4F7] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<MaterialsLoadingFallback />}>
      <MaterialsPageContent />
    </Suspense>
  )
}
