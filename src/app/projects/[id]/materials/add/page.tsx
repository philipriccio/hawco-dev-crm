'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MaterialType } from '@prisma/client'

const MATERIAL_TYPES = [
  { value: 'PILOT_SCRIPT', label: 'Pilot Script', icon: '📄' },
  { value: 'SERIES_BIBLE', label: 'Series Bible', icon: '📚' },
  { value: 'PITCH_DECK', label: 'Pitch Deck', icon: '📊' },
  { value: 'TREATMENT', label: 'Treatment', icon: '📝' },
  { value: 'FEATURE_SCRIPT', label: 'Feature Script', icon: '🎬' },
  { value: 'OTHER', label: 'Other', icon: '📎' },
]

interface Project {
  id: string
  title: string
}

interface Writer {
  id: string
  name: string
}

interface ExistingMaterial {
  id: string
  title: string
  type: MaterialType
  filename: string
  projectId: string | null
}

export default function AddMaterialPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [writers, setWriters] = useState<Writer[]>([])
  
  // Mode: 'upload' or 'link'
  const [mode, setMode] = useState<'upload' | 'link'>('upload')
  const [existingMaterials, setExistingMaterials] = useState<ExistingMaterial[]>([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('')

  // Form state
  const [materialType, setMaterialType] = useState<MaterialType>('PILOT_SCRIPT')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [writerId, setWriterId] = useState('')
  const [showNewWriter, setShowNewWriter] = useState(false)
  const [newWriter, setNewWriter] = useState({ name: '', email: '' })

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/projects/${projectId}`)
      if (!projectRes.ok) throw new Error('Failed to fetch project')
      const projectData = await projectRes.json()
      setProject(projectData)
      setTitle(projectData.title) // Default title to project title

      // Fetch writers for this project
      const contactsRes = await fetch(`/api/projects/${projectId}`)
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        const projectWriters = (contactsData.contacts || [])
          .filter((c: { role: string }) => c.role === 'WRITER')
          .map((c: { contact: Writer }) => c.contact)
        setWriters(projectWriters)
      }
      
      // Fetch orphan materials (not linked to any project)
      const materialsRes = await fetch('/api/materials?orphans=true')
      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setExistingMaterials(materialsData.filter((m: ExistingMaterial) => !m.projectId))
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load project data')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleLinkMaterial = async () => {
    if (!selectedMaterialId) {
      setError('Please select a material')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const res = await fetch(`/api/materials/${selectedMaterialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      
      if (!res.ok) throw new Error('Failed to link material')
      
      router.push(`/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      console.error('Error linking material:', err)
      setError('Failed to link material')
    } finally {
      setIsSubmitting(false)
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

    if (!fileUrl.trim()) {
      setError('File URL is required')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: materialType,
          title: title.trim(),
          notes,
          fileUrl: fileUrl.trim(),
          filename: filename.trim() || title.trim(),
          projectId,
          writerId: writerId || null,
          newWriter: showNewWriter && newWriter.name ? newWriter : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create material')
      }

      router.push(`/projects/${projectId}`)
    } catch (err) {
      console.error('Error creating material:', err)
      setError('Failed to add material. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-red-600">Project not found</p>
          <Link href="/projects" className="text-[#2563EB] hover:underline mt-2 inline-block">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/projects/${projectId}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add Material</h1>
          <p className="text-slate-500 mt-1">to {project.title}</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            mode === 'upload'
              ? 'bg-[#2563EB] text-white'
              : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload New
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            mode === 'link'
              ? 'bg-[#2563EB] text-white'
              : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Link Existing ({existingMaterials.length})
          </span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Link Existing Material */}
      {mode === 'link' && (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Material to Link</h2>
          {existingMaterials.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              No unlinked materials available. All materials are already attached to projects.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {existingMaterials.map((material) => {
                  const typeInfo = MATERIAL_TYPES.find(t => t.value === material.type)
                  return (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(material.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                        selectedMaterialId === material.id
                          ? 'border-[#2563EB] bg-[#F8F9FB]'
                          : 'border-[#E4E7EC] hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl">{typeInfo?.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{material.title}</p>
                        <p className="text-xs text-slate-500 truncate">{material.filename}</p>
                      </div>
                      {selectedMaterialId === material.id && (
                        <svg className="w-5 h-5 text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={handleLinkMaterial}
                disabled={!selectedMaterialId || isSubmitting}
                className="w-full py-3 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Linking...' : 'Link to Project'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Upload New Material Form */}
      {mode === 'upload' && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Material Type */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Material Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MATERIAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setMaterialType(type.value as MaterialType)}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  materialType === type.value
                    ? 'border-[#2563EB] bg-[#F8F9FB]'
                    : 'border-[#E4E7EC] hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className={`text-sm font-medium ${materialType === type.value ? 'text-[#1D4ED8]' : 'text-slate-700'}`}>
                  {type.label}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Basic Info */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Material title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File URL *</label>
              <input
                type="url"
                required
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="https://... (link to file)"
              />
              <p className="text-xs text-slate-500 mt-1">
                Paste a link to the file (e.g., Google Drive, Dropbox, or your hosting)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filename (optional)</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="my-script-v2.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Any notes about this material..."
              />
            </div>
          </div>
        </section>

        {/* Writer */}
        <section className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Writer (Optional)</h2>
          
          {!showNewWriter ? (
            <div className="space-y-3">
              <select
                value={writerId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewWriter(true)
                  } else {
                    setWriterId(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                <option value="">Select a writer...</option>
                {writers.map((writer) => (
                  <option key={writer.id} value={writer.id}>{writer.name}</option>
                ))}
                <option value="__new__">+ Add new writer</option>
              </select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">New Writer</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewWriter(false)
                    setNewWriter({ name: '', email: '' })
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Writer Name *</label>
                  <input
                    type="text"
                    value={newWriter.name}
                    onChange={(e) => setNewWriter({ ...newWriter, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="Writer name"
                    required={showNewWriter}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={newWriter.email}
                    onChange={(e) => setNewWriter({ ...newWriter, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="writer@example.com"
                  />
                </div>
              </div>
            </div>
          )}
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
            className="px-8 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Adding...' : 'Add Material'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}