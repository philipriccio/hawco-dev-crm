'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ProjectStatus, ProjectOrigin, ProjectContactRole, MaterialType } from '@prisma/client'
import RewriteCycleTracker from './RewriteCycleTracker'

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
  firstReadAt: Date | null
  optionExpiryDate: Date | null
  readPriority: number | null
  considerRelationship: boolean
  rewriteStatus: string | null
  pitchReady: boolean | null
  pitchChecklist: unknown | null
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
  coverages: {
    id: string
    reader: string
    dateRead: Date
    scoreTotal: number | null
    logline: string | null
    title: string
    scriptId: string | null
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
    readAt: Date | null
    createdAt: Date
    submittedBy: {
      id: string
      name: string
    } | null
    writer: {
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
  rewriteCycles: {
    id: string
    cycleNumber: number
    notesSentAt: Date | null
    dueAt: Date | null
    rewriteReceivedAt: Date | null
    rereadAt: Date | null
    outcomeNote: string | null
    createdAt: Date
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
  CONSIDER_RELATIONSHIP: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  PASSED: 'bg-red-100 text-red-700 border-red-200',
  DEVELOPING: 'bg-green-100 text-green-700 border-green-200',
  REWRITE_IN_PROGRESS: 'bg-rose-100 text-rose-700 border-rose-200',
  PACKAGING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  PITCHED: 'bg-orange-100 text-orange-700 border-orange-200',
  GREENLIT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  IN_PRODUCTION: 'bg-teal-100 text-teal-700 border-teal-200',
  RELEASED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  ON_HOLD: 'bg-[#F2F4F7] text-slate-700 border-[#E4E7EC]',
}

const statusLabels: Record<ProjectStatus, string> = {
  SUBMITTED: 'Submitted',
  READING: 'To be Read',
  READ: 'Read',
  CONSIDERING: 'Considering',
  CONSIDER_RELATIONSHIP: 'Consider Relationship',
  PASSED: 'Passed',
  DEVELOPING: 'Developing',
  REWRITE_IN_PROGRESS: 'Rewrite in Progress',
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

// Card color variants — neutral/subtle for professional tool feel
const pinnedCardColors = [
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
  'bg-white border-[#E4E7EC]',
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
  const [showAiCoverageModal, setShowAiCoverageModal] = useState(false)
  const [savingAiCoverage, setSavingAiCoverage] = useState(false)
  const [editableLogline, setEditableLogline] = useState(project.logline || '')
  const [editableNextAction, setEditableNextAction] = useState(project.nextAction || '')
  const [selectedCompanyId, setSelectedCompanyId] = useState(project.companies[0]?.company.id || '')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [selectedGenreTagIds, setSelectedGenreTagIds] = useState(project.tags.map((t) => t.tag.id))
  const [newGenreName, setNewGenreName] = useState('')
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)
  const [isSavingGenres, setIsSavingGenres] = useState(false)
  const [genreDropdownPosition, setGenreDropdownPosition] = useState({ top: 0, left: 0 })
  const genreDropdownButtonRef = useRef<HTMLButtonElement | null>(null)
  const genreDropdownRef = useRef<HTMLDivElement | null>(null)

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

  const handleProjectReadToggle = async (markAsRead: boolean) => {
    const fallbackStatus = status
    setStatus(markAsRead ? 'READ' : 'READING')
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsRead }),
      })

      if (!response.ok) throw new Error('Failed to update read state')
      router.refresh()
    } catch {
      setStatus(fallbackStatus)
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

  const allGenreTagOptions: GenreTagOption[] = [
    ...availableGenreTags,
    ...project.tags
      .map((entry) => entry.tag)
      .map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
  ].filter((tag, index, array) => array.findIndex((candidate) => candidate.id === tag.id) === index)

  const selectedGenreTags = selectedGenreTagIds
    .map((id) => allGenreTagOptions.find((tag) => tag.id === id))
    .filter((tag): tag is GenreTagOption => Boolean(tag))

  const unselectedGenreTags = allGenreTagOptions.filter((tag) => !selectedGenreTagIds.includes(tag.id))

  const updateGenreDropdownPosition = useCallback(() => {
    const buttonRect = genreDropdownButtonRef.current?.getBoundingClientRect()
    if (!buttonRect) return

    const dropdownWidth = 288
    const viewportPadding = 12
    const maxLeft = window.innerWidth - dropdownWidth - viewportPadding

    setGenreDropdownPosition({
      top: buttonRect.bottom + 8,
      left: Math.max(viewportPadding, Math.min(buttonRect.left, maxLeft)),
    })
  }, [])

  const toggleGenreDropdown = () => {
    setShowGenreDropdown((prev) => {
      const next = !prev
      if (next) {
        updateGenreDropdownPosition()
      }
      return next
    })
  }

  useEffect(() => {
    if (!showGenreDropdown) return

    updateGenreDropdownPosition()

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (
        genreDropdownRef.current?.contains(target) ||
        genreDropdownButtonRef.current?.contains(target)
      ) {
        return
      }

      setShowGenreDropdown(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowGenreDropdown(false)
        genreDropdownButtonRef.current?.focus()
      }
    }

    const handlePositionChange = () => updateGenreDropdownPosition()

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handlePositionChange)
    window.addEventListener('scroll', handlePositionChange, true)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handlePositionChange)
      window.removeEventListener('scroll', handlePositionChange, true)
    }
  }, [showGenreDropdown, updateGenreDropdownPosition])

  // Listen for CoverageIQ save messages from the iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'COVERAGEIQ_SAVE') return
      const payload = event.data.payload
      if (!payload) return

      setSavingAiCoverage(true)
      try {
        const res = await fetch(`/api/projects/${project.id}/ai-coverage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setShowAiCoverageModal(false)
          // Reload page to show new coverage
          window.location.reload()
        } else {
          alert('Failed to save AI coverage. Please try again.')
        }
      } catch {
        alert('Failed to save AI coverage. Please try again.')
      } finally {
        setSavingAiCoverage(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [project.id])

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
      className="min-h-screen bg-[#F2F4F7] p-6"
    >
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href={project.status === 'DEVELOPING' || project.status === 'PACKAGING' || project.status === 'PITCHED' || project.status === 'GREENLIT' ? '/whiteboard' : '/projects'}
          className="text-[#1D4ED8] hover:text-[#1E40AF] flex items-center gap-1 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {project.status === 'DEVELOPING' || project.status === 'PACKAGING' || project.status === 'PITCHED' || project.status === 'GREENLIT' ? 'Development Board' : 'Projects'}
        </Link>
      </div>

      {/* Header Zone */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#E4E7EC]/50 p-6 relative overflow-visible">
          {/* Header accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1D4ED8]" />

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
                      className="text-3xl font-bold text-slate-900 bg-[#F8F9FB] border-2 border-[#E4E7EC] rounded-lg px-3 py-1 focus:outline-none focus:border-[#2563EB] w-full max-w-2xl"
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
                      className="px-3 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] text-sm font-medium"
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
                      className="p-1.5 text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-lg transition-colors"
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

                <button
                  onClick={() => handleProjectReadToggle(status !== 'READ')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    status === 'READ'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#E4E7EC] hover:bg-[#DBEAFE]'
                      : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                  }`}
                >
                  {status === 'READ' ? 'Mark Unread' : 'Mark Read'}
                </button>

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
                      ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#E4E7EC] hover:bg-[#DBEAFE]'
                      : 'bg-[#F2F4F7] text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isHawcoOriginal ? 'bg-[#2563EB]' : 'bg-slate-400'}`} />
                  {isHawcoOriginal ? 'Hawco Original' : 'External'}
                  <svg className="w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                {/* Verdict */}
                {project.verdict && (
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                    project.verdict === 'Recommend' ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]' :
                    project.verdict === 'Consider' ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' :
                    project.verdict === 'Pass' ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]' :
                    'bg-[#F2F4F7] text-slate-700 border-[#E4E7EC]'
                  }`}>
                    {project.verdict}
                  </span>
                )}

                <button
                  onClick={() => saveProjectFields({ considerRelationship: !project.considerRelationship })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border ${project.considerRelationship ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' : 'bg-[#F2F4F7] text-slate-700 border-[#E4E7EC]'}`}
                >
                  {project.considerRelationship ? 'Relationship Priority' : 'Consider Relationship'}
                </button>

                {/* Format */}
                {project.format && (
                  <span className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full text-sm font-medium border border-stone-200">
                    {project.format}
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mr-1">Genres</span>
                {selectedGenreTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1E40AF] border border-[#E4E7EC]"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleUpdateGenreTags(selectedGenreTagIds.filter((id) => id !== tag.id))}
                      disabled={isSavingGenres}
                      className="text-[#1D4ED8] hover:text-[#1E40AF] disabled:opacity-50"
                      title={`Remove ${tag.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <div className="relative">
                  <button
                    ref={genreDropdownButtonRef}
                    onClick={toggleGenreDropdown}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' && !showGenreDropdown) {
                        e.preventDefault()
                        updateGenreDropdownPosition()
                        setShowGenreDropdown(true)
                      }
                    }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#E4E7EC] bg-white text-[#1D4ED8] hover:bg-[#F8F9FB] text-base leading-none shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-[#EFF6FF] transition-colors"
                    title="Add genre"
                    aria-label="Add genre"
                    aria-haspopup="dialog"
                    aria-expanded={showGenreDropdown}
                  >
                    +
                  </button>

                  {showGenreDropdown && createPortal(
                    <div
                      ref={genreDropdownRef}
                      className="fixed w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[#E4E7EC] bg-white/95 backdrop-blur-sm shadow-2xl ring-1 ring-black/5 z-[1000] p-2"
                      style={{
                        top: genreDropdownPosition.top,
                        left: genreDropdownPosition.left,
                      }}
                      role="dialog"
                      aria-label="Add project genres"
                    >
                      <div className="max-h-52 overflow-y-auto rounded-lg border border-[#E4E7EC] bg-[#F8F9FB]/30 p-1">
                        {unselectedGenreTags.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-slate-500">No more existing genres</p>
                        ) : (
                          unselectedGenreTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleUpdateGenreTags([...selectedGenreTagIds, tag.id])}
                              className="w-full text-left px-2.5 py-2 text-sm rounded-md text-slate-700 hover:bg-[#EFF6FF] transition-colors"
                            >
                              {tag.name}
                            </button>
                          ))
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#E4E7EC] space-y-2">
                        <input
                          type="text"
                          value={newGenreName}
                          onChange={(e) => setNewGenreName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleCreateGenreTag()
                            }
                          }}
                          placeholder="Create new genre"
                          className="w-full px-2.5 py-2 rounded-md border border-[#D0D5DD] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        <button
                          onClick={handleCreateGenreTag}
                          className="w-full px-2.5 py-2 rounded-md bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
                        >
                          Create & Add
                        </button>
                      </div>
                    </div>,
                    document.body,
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm font-medium shadow-md"
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
                className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] bg-white/80 text-sm"
                placeholder="Add logline..."
              />
              <button
                onClick={() => saveProjectFields({ logline: editableLogline.trim() || null })}
                className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
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
          <PinnedCard title="Next Action" colorIndex={1} className="ring-1 ring-[#2563EB]/20">
            <textarea
              value={editableNextAction}
              onChange={(e) => setEditableNextAction(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E7EC] bg-white/80 text-sm"
              placeholder="Add next action..."
            />
            <button
              onClick={() => saveProjectFields({ nextAction: editableNextAction.trim() || null })}
              className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
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
                <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-all border border-transparent hover:border-[#E4E7EC]"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
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

            <div className="mt-4 pt-4 border-t border-[#E4E7EC]/50">
              <Link
                href={`/projects/${project.id}/contacts/add`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
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
                    className="flex items-stretch gap-2 min-w-0"
                  >
                    <a
                      href={material.fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 flex items-center gap-3 p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-all border border-transparent hover:border-[#E4E7EC] group overflow-hidden"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-2xl shrink-0">
                        {materialTypeIcons[material.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate group-hover:text-[#1D4ED8]">{material.title}</p>
                        <p className="text-xs text-slate-500">{materialTypeLabels[material.type]}</p>
                        <p className="text-[10px] text-slate-400 truncate">{material.filename}</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/materials/${material.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ markAsRead: !material.readAt }),
                          })
                          if (!response.ok) throw new Error('Failed to update read state')
                          router.refresh()
                        } catch (error) {
                          console.error('Failed to toggle material read state:', error)
                        }
                      }}
                      className={`p-3 rounded-lg transition-colors flex-shrink-0 self-stretch flex items-center ${
                        material.readAt
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      title={material.readAt ? 'Mark as unread' : 'Mark as read'}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={material.readAt ? 'M10 14L21 3m0 0l-7 0m7 0l0 7M3 10l0 11 11 0' : 'M5 13l4 4L19 7'} />
                      </svg>
                    </button>
                    {/* Start Coverage Button */}
                    <Link
                      href={`/coverage/new?scriptId=${material.id}&projectId=${project.id}`}
                      className="p-3 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors flex-shrink-0 self-stretch flex items-center"
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

            <div className="mt-4 pt-4 border-t border-[#E4E7EC]/50">
              <Link
                href={`/projects/${project.id}/materials/add`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
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
            const materialCoverages = project.materials.flatMap(m =>
              m.coverages.map(c => ({ ...c, materialTitle: m.title, materialId: m.id }))
            )
            const materialCoverageIds = new Set(materialCoverages.map(c => c.id))
            const directCoverages = project.coverages
              .filter(c => !materialCoverageIds.has(c.id))
              .map(c => ({
                ...c,
                materialTitle: c.title || project.title,
                materialId: c.scriptId || '',
              }))
            const allCoverages = [...materialCoverages, ...directCoverages]
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
                        className="block p-3 rounded-lg bg-white/50 hover:bg-white hover:shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-all border border-transparent hover:border-[#E4E7EC]"
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
                              <p className="text-lg font-bold text-[#2563EB]">{coverage.scoreTotal}/25</p>
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
                <div className="pt-4 border-t border-[#E4E7EC]/50 space-y-2">
                  {firstMaterial ? (
                    <>
                      {/* Link Coverage Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowLinkCoverage(!showLinkCoverage)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Link Coverage
                        </button>

                        {/* Dropdown */}
                        {showLinkCoverage && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#E4E7EC] rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                            {availableCoverages.length === 0 ? (
                              <p className="p-3 text-sm text-slate-500 text-center">No coverages available to link</p>
                            ) : (
                              <>
                                {availableCoverages.map((coverage) => (
                                  <button
                                    key={coverage.id}
                                    onClick={() => handleLinkCoverage(coverage.id)}
                                    disabled={linkingCoverage === coverage.id}
                                    className="w-full p-3 text-left hover:bg-[#F8F9FB] border-b border-[#E4E7EC] last:border-b-0 transition-colors disabled:opacity-50"
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
                              className="block p-3 text-center text-[#2563EB] hover:bg-[#F8F9FB] border-t border-[#E4E7EC] text-sm font-medium"
                            >
                              + Add New Coverage
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Add Coverage Button (for creating new) */}
                      <Link
                        href={`/coverage/new?scriptId=${firstMaterial.id}&projectId=${project.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Coverage
                      </Link>

                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400 text-center mb-2">Add a material first to create manual coverage</p>
                    </>
                  )}
                </div>
              </PinnedCard>
            )
          })()}

          {/* CoverageIQ Zone */}
          <PinnedCard title="CoverageIQ" colorIndex={6}>
            <p className="text-xs text-slate-500 mb-3">Generate AI-powered script coverage via CoverageIQ</p>
            <button
              onClick={() => setShowAiCoverageModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 rounded-lg transition-colors text-sm font-medium w-full justify-center"
            >
              <span>🤖</span>
              Generate AI Coverage
            </button>
          </PinnedCard>

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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white font-medium text-sm">
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
                  className="px-3 py-2 rounded-lg bg-[#2563EB] text-white text-sm hover:bg-[#1D4ED8]"
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
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/50 hover:bg-white hover:shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-all"
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
                          review.rating === 'Recommend' ? 'bg-[#DCFCE7] text-[#166534]' :
                          review.rating === 'Consider' ? 'bg-[#FEF3C7] text-[#92400E]' :
                          review.rating === 'Pass' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                          'bg-[#F2F4F7] text-slate-600'
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

          {/* Rewrite Collaboration Tracker */}
          <PinnedCard title="Rewrite Cycles" colorIndex={0}>
            <RewriteCycleTracker
              projectId={project.id}
              initialCycles={project.rewriteCycles.map((cycle) => ({
                ...cycle,
                notesSentAt: cycle.notesSentAt ? cycle.notesSentAt.toISOString() : null,
                dueAt: cycle.dueAt ? cycle.dueAt.toISOString() : null,
                rewriteReceivedAt: cycle.rewriteReceivedAt ? cycle.rewriteReceivedAt.toISOString() : null,
                rereadAt: cycle.rereadAt ? cycle.rereadAt.toISOString() : null,
                createdAt: cycle.createdAt.toISOString(),
              }))}
            />
          </PinnedCard>

          {/* Pitch Readiness Gate */}
          {(project.status === 'REWRITE_IN_PROGRESS' || project.status === 'PITCHED' || project.status === 'PACKAGING' || project.status === 'GREENLIT') && (
            <PinnedCard title="Pitch Readiness Gate" colorIndex={5}>
              <div className="space-y-2">
                <button
                  onClick={() => saveProjectFields({ pitchReady: !project.pitchReady })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${project.pitchReady ? 'bg-emerald-100 text-emerald-700' : 'bg-[#F2F4F7] text-slate-700'}`}
                >
                  {project.pitchReady ? 'Pitch Ready ✓' : 'Mark Pitch Ready'}
                </button>
                <textarea
                  defaultValue={project.pitchChecklist ? JSON.stringify(project.pitchChecklist, null, 2) : ''}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  placeholder='{"elements": ["logline", "deck", "talent"]}'
                  onBlur={(e) => {
                    try {
                      const text = e.target.value.trim()
                      const parsed = text ? JSON.parse(text) : null
                      saveProjectFields({ pitchChecklist: parsed })
                    } catch {
                      alert('Pitch checklist must be valid JSON')
                    }
                  }}
                />
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
                <span className="text-slate-500">First Read</span>
                <span className="text-slate-700">{project.firstReadAt ? new Date(project.firstReadAt).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Read Priority</span>
                <span className="text-slate-700">{project.readPriority ?? '—'}</span>
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
                <div className="flex items-center gap-2 text-[#1D4ED8] mt-2 pt-2 border-t border-[#E4E7EC]/50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  <span className="font-medium">Intl. Potential</span>
                </div>
              )}
            </div>
          </PinnedCard>
        </div>
      </div>

      {/* CoverageIQ Modal */}
      {showAiCoverageModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E7EC]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="font-semibold text-slate-800">CoverageIQ — AI Script Analysis</span>
              </div>
              <div className="flex items-center gap-3">
                {savingAiCoverage && (
                  <span className="text-sm text-[#2563EB] font-medium animate-pulse">Saving to project…</span>
                )}
                <button
                  onClick={() => setShowAiCoverageModal(false)}
                  className="p-2 rounded-lg hover:bg-[#F2F4F7] text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <iframe
              src={`https://coverageiq.companytheatre.ca?crm=1&projectId=${project.id}`}
              className="flex-1 w-full border-0"
              title="CoverageIQ"
            />
          </div>
        </div>,
        document.body
      )}
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
      rounded-2xl
      border
      shadow-[0_1px_4px_rgba(16,24,40,0.06)]
      overflow-hidden
      transition-all duration-200
      hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]
      hover:border-[#CDD2DB]
      ${className}
    `}>
      {/* Card Header */}
      <div className="bg-[#F8F9FB] border-b border-[#E4E7EC] px-5 py-4">
        <h3 className="text-xs font-semibold text-[#101828] uppercase tracking-wider">
          {title}
        </h3>
      </div>

      {/* Content */}
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}
