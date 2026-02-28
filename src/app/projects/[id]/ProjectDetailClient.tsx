'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectStatus, ProjectOrigin, ProjectContactRole, MaterialType } from '@prisma/client'

// Types based on Prisma schema
interface ProjectWithRelations {
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
  dateReceived: Date | null
  optionExpiryDate: Date | null
  createdAt: Date
  updatedAt: Date
  contacts: {
    id: string
    role: ProjectContactRole
    contact: {
      id: string
      name: string
      type: string
      company: { name: string } | null
    }
  }[]
  companies: {
    id: string
    role: string | null
    company: {
      id: string
      name: string
      type: string
    }
  }[]
  materials: {
    id: string
    type: MaterialType
    title: string
    filename: string
    fileUrl: string | null
    fileSize: number | null
    mimeType: string | null
    notes: string | null
    createdAt: Date
    submittedBy: {
      id: string
      name: string
    } | null
    coverages: {
      id: string
      reader: string
      dateRead: Date
      scoreTotal: number | null
      logline: string | null
    }[]
  }[]
  tags: {
    id: string
    tag: {
      id: string
      name: string
      color: string | null
      category: string | null
    }
  }[]
  reviews: {
    id: string
    rating: string | null
    notes: string | null
    createdAt: Date
    user: {
      name: string
    }
  }[]
}

interface CompanyOption {
  id: string
  name: string
}

interface GenreTagOption {
  id: string
  name: string
  color: string | null
}

interface ProjectDetailPageProps {
  project: ProjectWithRelations
  availableCoverages?: Array<{
    id: string
    title: string
    writer: string
    reader: string
    dateRead: Date
    logline: string | null
    verdict: string
  }>
  availableCompanies?: CompanyOption[]
  availableGenreTags?: GenreTagOption[]
}

const statusColors: Record<ProjectStatus, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
  READING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  READ: 'bg-green-100 text-green-700 border-green-200',
  CONSIDERING: 'bg-purple-100 text-purple-700 border-purple-200',
  PASSED: 'bg-red-100 text-red-700 border-red-200',
  DEVELOPING: 'bg-green-100 text-green-700 border-green-200',
  PACKAGING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  PITCHED: 'bg-orange-100 text-orange-700 border-orange-200',
  GREENLIT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  IN_PRODUCTION: 'bg-teal-100 text-teal-700 border-teal-200',
  RELEASED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  ON_HOLD: 'bg-slate-100 text-slate-700 border-slate-200',
}

const statusLabels: Record<ProjectStatus, string> = {
  SUBMITTED: 'Submitted',
  READING: 'To be Read',
  READ: 'Read',
  CONSIDERING: 'Considering',
  PASSED: 'Passed',
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  GREENLIT: 'Greenlit',
  IN_PRODUCTION: 'In Production',
  RELEASED: 'Released',
  ON_HOLD: 'On Hold',
}

const materialTypeIcons: Record<MaterialType, string> = {
  PILOT_SCRIPT: '📄',
  SERIES_BIBLE: '📚',
  PITCH_DECK: '📊',
  TREATMENT: '📝',
  FEATURE_SCRIPT: '🎬',
  OTHER: '📎',
}

const materialTypeLabels: Record<MaterialType, string> = {
  PILOT_SCRIPT: 'Pilot Script',
  SERIES_BIBLE: 'Series Bible',
  PITCH_DECK: 'Pitch Deck',
  TREATMENT: 'Treatment',
  FEATURE_SCRIPT: 'Feature Script',
  OTHER: 'Other',
}

const contactRoleLabels: Record<ProjectContactRole, string> = {
  WRITER: 'Writer',
  SOURCE: 'Source',
  ATTACHED_TALENT: 'Attached Talent',
  PRODUCER: 'Producer',
}

// Corkboard paper colors for pinned cards
const pinnedCardColors = [
  'bg-amber-50 border-amber-200',
  'bg-orange-50 border-orange-200',
  'bg-yellow-50 border-yellow-200',
  'bg-stone-50 border-stone-200',
  'bg-amber-100/60 border-amber-300',
  'bg-orange-100/60 border-orange-300',
]

export default function ProjectDetailPage({
  project,
  availableCoverages = [],
  availableCompanies = [],
  availableGenreTags = [],
}: ProjectDetailPageProps) {
  const router = useRouter()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState(project.status)
  const [showLinkCoverage, setShowLinkCoverage] = useState(false)
  const [linkingCoverage, setLinkingCoverage] = useState<string | null>(null)
  const [editableLogline, setEditableLogline] = useState(project.logline || '')
  const [editableNextAction, setEditableNextAction] = useState(project.nextAction || '')
  const [selectedCompanyId, setSelectedCompanyId] = useState(project.companies[0]?.company.id || '')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [selectedGenreTagIds, setSelectedGenreTagIds] = useState(project.tags.map((t) => t.tag.id))
  const [newGenreName, setNewGenreName] = useState('')
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [isSavingGenres, setIsSavingGenres] = useState(false)

  const isHawcoOriginal = project.origin === 'HAWCO_ORIGINAL'

  // Group contacts by role
  const contactsByRole = project.contacts.reduce((acc, pc) => {
    if (!acc[pc.role]) acc[pc.role] = []
    acc[pc.role].push(pc)
    return acc
  }, {} as Record<ProjectContactRole, typeof project.contacts>)

  // Group companies by role
  const companiesByRole = project.companies.reduce((acc, pc) => {
    const role = pc.role || 'Other'
    if (!acc[role]) acc[role] = []
    acc[role].push(pc)
    return acc
  }, {} as Record<string, typeof project.companies>)

  const handleTitleSave = async () => {
    if (title.trim() === project.title) {
      setIsEditingTitle(false)
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })

      if (!response.ok) throw new Error('Failed to update title')
      setIsEditingTitle(false)
      router.refresh()
    } catch {
      setTitle(project.title)
      setIsEditingTitle(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setStatus(newStatus)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')
      router.refresh()
    } catch {
      setStatus(project.status)
    }
  }

  const saveProjectFields = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Failed to update project')
    }

    router.refresh()
  }

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim()
    if (!name) return

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: 'OTHER' }),
      })
      if (!response.ok) throw new Error('Failed to create company')
      const created = await response.json()
      setNewCompanyName('')
      setSelectedCompanyId(created.id)
      await saveProjectFields({ companyId: created.id })
    } catch (error) {
      console.error('Error creating company:', error)
      alert('Failed to create company')
    }
  }

  const handleCreateGenreTag = async () => {
    const name = newGenreName.trim()
    if (!name) return

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: 'genre' }),
      })
      if (!response.ok) throw new Error('Failed to create tag')
      const created = await response.json()
      const updatedTagIds = [...new Set([...selectedGenreTagIds, created.id])]
      setSelectedGenreTagIds(updatedTagIds)
      setNewGenreName('')
      await saveProjectFields({ genreTagIds: updatedTagIds })
      setShowGenreDropdown(false)
    } catch (error) {
      console.error('Error creating genre tag:', error)
      alert('Failed to create genre tag')
    }
  }

  const handleUpdateGenreTags = async (nextIds: string[]) => {
    const previousIds = selectedGenreTagIds
    setSelectedGenreTagIds(nextIds)
    setIsSavingGenres(true)
    try {
      await saveProjectFields({ genreTagIds: nextIds })
    } catch (error) {
      console.error('Error updating genre tags:', error)
      setSelectedGenreTagIds(previousIds)
      alert('Failed to update genre tags')
    } finally {
      setIsSavingGenres(false)
    }
  }

  const selectedGenreTags = selectedGenreTagIds
    .map((id) => availableGenreTags.find((tag) => tag.id === id) || project.tags.find((tag) => tag.tag.id === id)?.tag)
    .filter((tag): tag is GenreTagOption => Boolean(tag))

  const unselectedGenreTags = availableGenreTags.filter((tag) => !selectedGenreTagIds.includes(tag.id))

  const handleDelete = async () => {
    const confirmMessage = `Are you sure you want to delete "${project.title}"?`
    if (!confirm(confirmMessage)) return
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete project')
      window.location.href = '/projects'
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  const handleLinkCoverage = async (coverageId: string) => {
    setLinkingCoverage(coverageId)
    try {
      const response = await fetch(`/api/coverage/${coverageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
      
      if (!response.ok) throw new Error('Failed to link coverage')
      
      setShowLinkCoverage(false)
      router.refresh()
    } catch (error) {
      console.error('Error linking coverage:', error)
      alert('Failed to link coverage')
    } finally {
      setLinkingCoverage(null)
    }
  }

  return (
    <div 
      className="min-h-screen bg-amber-50/80 p-6"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(139, 69, 19, 0.03) 1px, transparent 1px),
          radial-gradient(circle at 80% 80%, rgba(139, 69, 19, 0.03) 1px, transparent 1px),
          linear-gradient(45deg, transparent 49%, rgba(139, 69, 19, 0.02) 50%, transparent 51%),
          linear-gradient(-45deg, transparent 49%, rgba(139, 69, 19, 0.02) 50%, transparent 51%)
        `,
        backgroundSize: '20px 20px, 20px 20px, 40px 40px, 40px 40px',
      }}
    >
      {/* Back Navigation */}
      <div className="mb-6">
        <Link 
          href={project.status === 'DEVELOPING' || project.status === 'PACKAGING' || project.status === 'PITCHED' || project.status === 'GREENLIT' ? '/whiteboard' : '/projects'} 
          className="text-amber-700 hover:text-amber-800 flex items-center gap-1 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {project.status === 'DEVELOPING' || project.status === 'PACKAGING' || project.status === 'PITCHED' || project.status === 'GREENLIT' ? 'Development Board' : 'Projects'}
        </Link>
      </div>

      {/* Header Zone */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6 relative overflow-hidden">
          {/* Corkboard edge effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700" />
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Editable Title */}
              <div className="flex items-center gap-3 mb-3">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-3xl font-bold text-slate-900 bg-amber-50 border-2 border-amber-300 rounded-lg px-3 py-1 focus:outline-none focus:border-amber-500 w-full max-w-2xl"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave()
                        if (e.key === 'Escape') {
                          setTitle(project.title)
                          setIsEditingTitle(false)
                        }
                      }}
                    />
                    <button
                      onClick={handleTitleSave}
                      disabled={isSaving}
                      className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setTitle(project.title)
                        setIsEditingTitle(false)
                      }}
                      className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-slate-900">{project.title}</h1>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                      title="Edit title"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Status Badge with Dropdown */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative group">
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                    className={`${statusColors[status]} border-2 px-4 py-1.5 rounded-full text-sm font-semibold cursor-pointer hover:shadow-md transition-all appearance-none pr-10`}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Origin Indicator - Clickable Toggle */}
                <button
                  onClick={async () => {
                    const newOrigin = isHawcoOriginal ? 'EXTERNAL' : 'HAWCO_ORIGINAL'
                    try {
                      const response = await fetch(`/api/projects/${project.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ origin: newOrigin }),
                      })
                      if (response.ok) router.refresh()
                    } catch (error) {
                      console.error('Failed to update origin:', error)
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all hover:shadow-md ${
                    isHawcoOriginal 
                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isHawcoOriginal ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  {isHawcoOriginal ? 'Hawco Original' : 'External'}
                  <svg className="w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                {/* Format */}
                {project.format && (
                  <span className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium border border-stone-200">
                    {project.format}
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {selectedGenreTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleUpdateGenreTags(selectedGenreTagIds.filter((id) => id !== tag.id))}
                      disabled={isSavingGenres}
                      className="text-amber-700 hover:text-amber-900 disabled:opacity-50"
                      title={`Remove ${tag.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <div className="relative">
                  <button
                    onClick={() => setShowGenreDropdown((prev) => !prev)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 text-sm"
                    title="Add genre"
                  >
                    +
                  </button>

                  {showGenreDropdown && (
                    <div className="absolute left-0 mt-2 w-64 rounded-lg border border-amber-200 bg-white shadow-lg z-20 p-2">
                      <div className="max-h-44 overflow-y-auto">
                        {unselectedGenreTags.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs text-slate-500">No more existing genres</p>
                        ) : (
                          unselectedGenreTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleUpdateGenreTags([...selectedGenreTagIds, tag.id])}
                              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-amber-50"
                            >
                              {tag.name}
                            </button>
                          ))
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-amber-100 space-y-2">
                        <input
                          type="text"
                          value={newGenreName}
                          onChange={(e) => setNewGenreName(e.target.value)}
                          placeholder="Create new genre"
                          className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                        />
                        <button
                          onClick={handleCreateGenreTag}
                          className="w-full px-2 py-1.5 rounded bg-amber-500 text-white text-xs hover:bg-amber-600"
                        >
                          Create & Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedGenreTags.length === 0 && (
                  <span className="text-xs text-slate-500">No genre tags</span>
                )}
              </div>

              {/* Comps */}
              {project.comps && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400">Comp:</span>
                  <span className="font-medium">{project.comps}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                href={`/projects/${project.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Project
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Whiteboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Notes/Activity Zone (wider) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Logline & Synopsis Card */}
          <PinnedCard title="Logline & Synopsis" colorIndex={0}>
            <div className="mb-4">
              <p className="text-sm text-slate-500 mb-1 uppercase tracking-wide text-[10px] font-semibold">Logline</p>
              <textarea
                value={editableLogline}
                onChange={(e) => setEditableLogline(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white/80 text-sm"
                placeholder="Add logline..."
              />
              <button
                onClick={() => saveProjectFields({ logline: editableLogline.trim() || null })}
                className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600"
              >
                Save Logline
              </button>
            </div>

            {project.synopsis ? (
              <div>
                <p className="text-sm text-slate-500 mb-1 uppercase tracking-wide text-[10px] font-semibold">Synopsis</p>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{project.synopsis}</p>
              </div>
            ) : (
              <p className="text-slate-400 italic text-sm">No synopsis set</p>
            )}
          </PinnedCard>

          {/* Next Action Card - Prominent */}
          <PinnedCard title="Next Action" colorIndex={1} className="border-2 border-amber-400/50">
            <textarea
              value={editableNextAction}
              onChange={(e) => setEditableNextAction(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white/80 text-sm"
              placeholder="Add next action..."
            />
            <button
              onClick={() => saveProjectFields({ nextAction: editableNextAction.trim() || null })}
              className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600"
            >
              Save Next Action
            </button>
          </PinnedCard>

          {/* Current Stage & Packaging */}
          {(project.currentStage || project.packagingNeeds) && (
            <PinnedCard title="Development Status" colorIndex={2}>
              {project.currentStage && (
                <div className="mb-3">
                  <p className="text-sm text-slate-500 mb-1 uppercase tracking-wide text-[10px] font-semibold">Current Stage</p>
                  <p className="text-slate-800">{project.currentStage}</p>
                </div>
              )}
              {project.packagingNeeds && (
                <div>
                  <p className="text-sm text-slate-500 mb-1 uppercase tracking-wide text-[10px] font-semibold">Packaging Needs</p>
                  <p className="text-slate-600 text-sm">{project.packagingNeeds}</p>
                </div>
              )}
            </PinnedCard>
          )}

          {/* General Notes */}
          {project.notes && (
            <PinnedCard title="Notes" colorIndex={3}>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{project.notes}</p>
            </PinnedCard>
          )}

          {/* Target Network */}
          {project.targetNetwork && (
            <PinnedCard title="Target" colorIndex={4}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-slate-800 font-medium">{project.targetNetwork}</span>
              </div>
            </PinnedCard>
          )}
        </div>

        {/* Middle Column - Team & Materials */}
        <div className="lg:col-span-4 space-y-6">
          {/* Team/Contacts Zone */}
          <PinnedCard title="Team & Contacts" colorIndex={2}>
            {Object.keys(contactsByRole).length === 0 ? (
              <p className="text-slate-400 italic">No contacts attached</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(contactsByRole).map(([role, contacts]) => (
                  <div key={role}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {contactRoleLabels[role as ProjectContactRole]}
                    </p>
                    <div className="space-y-2">
                      {contacts.map((pc) => (
                        <Link
                          key={pc.id}
                          href={`/contacts/${pc.contact.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-amber-200"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-white font-bold text-sm">
                            {pc.contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{pc.contact.name}</p>
                            {pc.contact.company && (
                              <p className="text-xs text-slate-500 truncate">{pc.contact.company.name}</p>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-amber-200/50">
              <Link
                href={`/projects/${project.id}/contacts/add`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Contact
              </Link>
            </div>
          </PinnedCard>

          {/* Materials Zone */}
          <PinnedCard title="Materials" colorIndex={0}>
            {project.materials.length === 0 ? (
              <p className="text-slate-400 italic">No materials uploaded</p>
            ) : (
              <div className="space-y-3">
                {project.materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-2"
                  >
                    <a
                      href={material.fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-amber-200 group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl">
                        {materialTypeIcons[material.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate group-hover:text-amber-700">{material.title}</p>
                        <p className="text-xs text-slate-500">{materialTypeLabels[material.type]}</p>
                        <p className="text-[10px] text-slate-400 truncate">{material.filename}</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    {/* Start Coverage Button */}
                    <Link
                      href={`/coverage/new?scriptId=${material.id}&projectId=${project.id}`}
                      className="p-3 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex-shrink-0"
                      title="Start Coverage"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-amber-200/50">
              <Link
                href={`/projects/${project.id}/materials/add`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Material
              </Link>
            </div>
          </PinnedCard>

          {/* Coverage Zone */}
          {(() => {
            const allCoverages = project.materials.flatMap(m => 
              m.coverages.map(c => ({ ...c, materialTitle: m.title, materialId: m.id }))
            )
            const firstMaterial = project.materials[0]
            return (
              <PinnedCard title="Coverage" colorIndex={3}>
                {allCoverages.length === 0 ? (
                  <p className="text-slate-400 italic mb-4">No coverage reports yet</p>
                ) : (
                  <div className="space-y-3 mb-4">
                    {allCoverages.map((coverage) => (
                      <Link
                        key={coverage.id}
                        href={`/coverage/${coverage.id}`}
                        className="block p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-amber-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{coverage.materialTitle}</p>
                            <p className="text-xs text-slate-500">
                              {coverage.reader} • {new Date(coverage.dateRead).toLocaleDateString()}
                            </p>
                          </div>
                          {coverage.scoreTotal && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-amber-600">{coverage.scoreTotal}/25</p>
                            </div>
                          )}
                        </div>
                        {coverage.logline && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{coverage.logline}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
                
                {/* Add Coverage / Link Coverage Buttons */}
                <div className="pt-4 border-t border-amber-200/50 space-y-2">
                  {firstMaterial ? (
                    <>
                      {/* Link Coverage Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowLinkCoverage(!showLinkCoverage)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Link Coverage
                        </button>
                        
                        {/* Dropdown */}
                        {showLinkCoverage && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-amber-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                            {availableCoverages.length === 0 ? (
                              <p className="p-3 text-sm text-slate-500 text-center">No coverages available to link</p>
                            ) : (
                              <>
                                {availableCoverages.map((coverage) => (
                                  <button
                                    key={coverage.id}
                                    onClick={() => handleLinkCoverage(coverage.id)}
                                    disabled={linkingCoverage === coverage.id}
                                    className="w-full p-3 text-left hover:bg-amber-50 border-b border-amber-100 last:border-b-0 transition-colors disabled:opacity-50"
                                  >
                                    <p className="font-medium text-slate-900 text-sm">{coverage.title}</p>
                                    <p className="text-xs text-slate-500">{coverage.writer} • {coverage.reader}</p>
                                  </button>
                                ))}
                              </>
                            )}
                            {/* Add New Option */}
                            <Link
                              href={`/coverage/new?scriptId=${firstMaterial.id}&projectId=${project.id}`}
                              onClick={() => setShowLinkCoverage(false)}
                              className="block p-3 text-center text-amber-600 hover:bg-amber-50 border-t border-amber-200 text-sm font-medium"
                            >
                              + Add New Coverage
                            </Link>
                          </div>
                        )}
                      </div>
                      
                      {/* Add Coverage Button (for creating new) */}
                      <Link
                        href={`/coverage/new?scriptId=${firstMaterial.id}&projectId=${project.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Coverage
                      </Link>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 text-center">Add a material first to create coverage</p>
                  )}
                </div>
              </PinnedCard>
            )
          })()}

          {/* Submitted By Zone */}
          {(() => {
            const submitters = project.materials
              .filter(m => m.submittedBy)
              .map(m => ({ contact: m.submittedBy!, materialTitle: m.title }))
            const uniqueSubmitters = submitters.reduce((acc, s) => {
              if (!acc.find(x => x.contact.id === s.contact.id)) {
                acc.push(s)
              }
              return acc
            }, [] as typeof submitters)
            
            if (uniqueSubmitters.length === 0) return null
            
            return (
              <PinnedCard title="Submitted By" colorIndex={4}>
                <div className="space-y-2">
                  {uniqueSubmitters.map((sub, i) => (
                    <Link
                      key={i}
                      href={`/contacts/${sub.contact.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm">
                        {sub.contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{sub.contact.name}</p>
                        <p className="text-xs text-slate-500">Submitted {sub.materialTitle}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </PinnedCard>
            )
          })()}
        </div>

        {/* Right Column - Companies & Reviews */}
        <div className="lg:col-span-3 space-y-6">
          {/* Companies Zone */}
          <PinnedCard title="Companies" colorIndex={5}>
            <div className="space-y-3 mb-4">
              <select
                value={selectedCompanyId}
                onChange={async (e) => {
                  const companyId = e.target.value
                  setSelectedCompanyId(companyId)
                  await saveProjectFields({ companyId: companyId || null })
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
              >
                <option value="">No company</option>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Add new company"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <button
                  onClick={handleCreateCompany}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600"
                >
                  Add
                </button>
              </div>
            </div>

            {project.companies.length === 0 ? (
              <p className="text-slate-400 italic">No companies attached</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(companiesByRole).map(([role, companies]) => (
                  <div key={role}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{role}</p>
                    <div className="space-y-2">
                      {companies.map((pc) => (
                        <Link
                          key={pc.id}
                          href={`/companies/${pc.company.id}`}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white hover:shadow-sm transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-xs">
                            {pc.company.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">{pc.company.name}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PinnedCard>

          {/* Reviews Zone */}
          {project.reviews.length > 0 && (
            <PinnedCard title="Reviews" colorIndex={1}>
              <div className="space-y-4">
                {project.reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-white/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900 text-sm">{review.user.name}</span>
                      {review.rating && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          review.rating === 'Recommend' ? 'bg-green-100 text-green-700' :
                          review.rating === 'Consider' ? 'bg-yellow-100 text-yellow-700' :
                          review.rating === 'Pass' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {review.rating}
                        </span>
                      )}
                    </div>
                    {review.notes && (
                      <p className="text-sm text-slate-600 line-clamp-3">{review.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </PinnedCard>
          )}

          {/* Project Meta */}
          <PinnedCard title="Project Info" colorIndex={3}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Received</span>
                <span className="text-slate-700">{project.dateReceived ? new Date(project.dateReceived).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Updated</span>
                <span className="text-slate-700">{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
              {project.optionExpiryDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Option Expires</span>
                  <span className="text-slate-700">{new Date(project.optionExpiryDate).toLocaleDateString()}</span>
                </div>
              )}
              {project.intlPotential && (
                <div className="flex items-center gap-2 text-amber-700 mt-2 pt-2 border-t border-amber-200/50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  <span className="font-medium">Intl. Potential</span>
                </div>
              )}
            </div>
          </PinnedCard>

          {/* Verdict */}
          {project.verdict && (
            <PinnedCard title="Verdict" colorIndex={4}>
              <div className={`text-center py-3 rounded-lg font-bold text-lg ${
                project.verdict === 'Recommend' ? 'bg-green-100 text-green-700' :
                project.verdict === 'Consider' ? 'bg-yellow-100 text-yellow-700' :
                project.verdict === 'Pass' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {project.verdict}
              </div>
            </PinnedCard>
          )}
        </div>
      </div>
    </div>
  )
}

// Pinned Card Component
function PinnedCard({ 
  children, 
  title, 
  colorIndex = 0,
  className = ''
}: { 
  children: React.ReactNode
  title: string
  colorIndex?: number
  className?: string
}) {
  const colorClass = pinnedCardColors[colorIndex % pinnedCardColors.length]
  
  return (
    <div className={`
      ${colorClass} 
      rounded-xl p-5 shadow-sm 
      border-2
      relative
      transition-all duration-200
      hover:shadow-md
      ${className}
    `}>
      {/* Pin effect */}
      <div className="absolute -top-1.5 left-6 w-3 h-3 rounded-full bg-red-700/40 shadow-sm" />
      
      {/* Header */}
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
        {title}
      </h3>
      
      {/* Content */}
      {children}
    </div>
  )
}
