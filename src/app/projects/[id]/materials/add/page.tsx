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

export default function AddMaterialPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [writers, setWriters] = useState<Writer[]>([])

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
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load project data')
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
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/projects/${projectId}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add Material</h1>
          <p className="text-slate-500 mt-1">Upload a new script, bible, or pitch deck</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Material Type */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Material Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MATERIAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setMaterialType(type.value as MaterialType)}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  materialType === type.value
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className={`text-sm font-medium ${materialType === type.value ? 'text-amber-700' : 'text-slate-700'}`}>
                  {type.label}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Basic Info */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="my-script-v2.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Any notes about this material..."
              />
            </div>
          </div>
        </section>

        {/* Writer */}
        <section className="bg-white rounded-xl shadow-sm p-6">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
            className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Adding...' : 'Add Material'}
          </button>
        </div>
      </form>
    </div>
  )
}