'use client'

import { useState, useEffect, useRef } from 'react'
interface Show {
  id: string
  network: string
  title: string
  genre: string | null
  prodCompany: string | null
  distributor: string | null
  status: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ResearchDocument {
  id: string
  title: string
  description: string | null
  fileName: string
  fileUrl: string
  fileSize: number | null
  tags: string | null
  createdAt: string
}

interface BuyerNote {
  id: string
  buyer: string
  notes: string
  createdAt: string
  updatedAt: string
}

const networkColors: Record<string, { bg: string; text: string; border: string; light: string }> = {
  CBC: {
    bg: 'bg-red-600',
    text: 'text-red-600',
    border: 'border-red-600',
    light: 'bg-red-50',
  },
  Crave: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    light: 'bg-blue-50',
  },
  CTV: {
    bg: 'bg-indigo-600',
    text: 'text-indigo-600',
    border: 'border-indigo-600',
    light: 'bg-indigo-50',
  },
  Global: {
    bg: 'bg-emerald-600',
    text: 'text-emerald-600',
    border: 'border-emerald-600',
    light: 'bg-emerald-50',
  },
  'Citytv': {
    bg: 'bg-yellow-600',
    text: 'text-yellow-600',
    border: 'border-yellow-600',
    light: 'bg-yellow-50',
  },
  'W Network': {
    bg: 'bg-pink-600',
    text: 'text-pink-600',
    border: 'border-pink-600',
    light: 'bg-pink-50',
  },
  default: {
    bg: 'bg-slate-600',
    text: 'text-slate-600',
    border: 'border-slate-600',
    light: 'bg-[#F2F4F7]',
  },
}

const statusColors: Record<string, string> = {
  'Airing': 'bg-green-100 text-green-700 border-green-200',
  'Airing S2': 'bg-green-100 text-green-700 border-green-200',
  'Renewed': 'bg-[#EFF6FF] text-[#1D4ED8] border-[#E4E7EC]',
  'Renewed S2': 'bg-[#EFF6FF] text-[#1D4ED8] border-[#E4E7EC]',
  'Renewed S3': 'bg-[#EFF6FF] text-[#1D4ED8] border-[#E4E7EC]',
  'Greenlit': 'bg-blue-100 text-blue-700 border-blue-200',
  'In Production': 'bg-purple-100 text-purple-700 border-purple-200',
  'Pilot': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Development': 'bg-[#F2F4F7] text-slate-700 border-[#E4E7EC]',
}

const networks = ['All', 'CBC', 'Crave', 'CTV', 'Global', 'Citytv', 'W Network']
const statuses = ['All', 'Airing', 'Renewed', 'Greenlit', 'In Production', 'Pilot', 'Development']

type ResearchTab = 'shows' | 'documents' | 'buyers'

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<ResearchTab>('shows')
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNetwork, setSelectedNetwork] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Document state
  const [documents, setDocuments] = useState<ResearchDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Buyer notes state
  const [buyerNotes, setBuyerNotes] = useState<BuyerNote[]>([])
  const [buyersLoading, setBuyersLoading] = useState(false)
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null)
  const [editingBuyerNotes, setEditingBuyerNotes] = useState<Record<string, string>>({})
  const [savingBuyer, setSavingBuyer] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    network: 'CBC',
    title: '',
    genre: '',
    prodCompany: '',
    distributor: '',
    status: 'Airing',
    notes: '',
  })

  useEffect(() => {
    fetchShows()
  }, [selectedNetwork, selectedStatus, searchQuery])

  useEffect(() => {
    if (activeTab === 'documents') fetchDocuments()
    if (activeTab === 'buyers') fetchBuyerNotes()
  }, [activeTab])

  async function fetchShows() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedNetwork !== 'All') params.append('network', selectedNetwork)
      if (selectedStatus !== 'All') params.append('status', selectedStatus)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/research?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch shows')
      const data = await response.json()
      setShows(data)
    } catch (error) {
      console.error('Error fetching shows:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Failed to create show')
      
      // Reset form and close modal
      setFormData({
        network: 'CBC',
        title: '',
        genre: '',
        prodCompany: '',
        distributor: '',
        status: 'Airing',
        notes: '',
      })
      setIsAddModalOpen(false)
      fetchShows()
    } catch (error) {
      console.error('Error creating show:', error)
      alert('Failed to create show. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Document functions
  async function fetchDocuments() {
    setDocsLoading(true)
    try {
      const response = await fetch('/api/research/documents')
      if (response.ok) setDocuments(await response.json())
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setDocsLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile || !uploadTitle) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadTitle)
      if (uploadDescription) formData.append('description', uploadDescription)
      if (uploadTags) formData.append('tags', uploadTags)

      const response = await fetch('/api/research/documents', {
        method: 'POST',
        body: formData,
      })
      if (response.ok) {
        setUploadTitle('')
        setUploadDescription('')
        setUploadTags('')
        setUploadFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setIsUploadModalOpen(false)
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteDocument(id: string) {
    if (!confirm('Delete this document?')) return
    try {
      await fetch(`/api/research/documents?id=${id}`, { method: 'DELETE' })
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  // Buyer note functions
  async function fetchBuyerNotes() {
    setBuyersLoading(true)
    try {
      const response = await fetch('/api/research/buyer-notes')
      if (response.ok) {
        const data = await response.json()
        setBuyerNotes(data)
        const notesMap: Record<string, string> = {}
        data.forEach((bn: BuyerNote) => { notesMap[bn.buyer] = bn.notes })
        setEditingBuyerNotes(notesMap)
      }
    } catch (error) {
      console.error('Error fetching buyer notes:', error)
    } finally {
      setBuyersLoading(false)
    }
  }

  async function saveBuyerNote(buyer: string) {
    setSavingBuyer(buyer)
    try {
      await fetch('/api/research/buyer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer, notes: editingBuyerNotes[buyer] || '' }),
      })
    } catch (error) {
      console.error('Error saving buyer note:', error)
    } finally {
      setSavingBuyer(null)
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const defaultBuyers = ['CBC Comedy', 'CBC Drama', 'Netflix Canada', 'Disney+ Canada', 'CTV/Crave', 'Amazon Canada']

  function toggleNotes(showId: string) {
    setExpandedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(showId)) {
        newSet.delete(showId)
      } else {
        newSet.add(showId)
      }
      return newSet
    })
  }

  function getNetworkColor(network: string) {
    return networkColors[network] || networkColors.default
  }

  function getStatusColor(status: string | null) {
    if (!status) return 'bg-[#F2F4F7] text-slate-700 border-[#E4E7EC]'
    return statusColors[status] || 'bg-[#F2F4F7] text-slate-700 border-[#E4E7EC]'
  }

  // Group shows by network
  const groupedShows = shows.reduce((acc, show) => {
    if (!acc[show.network]) acc[show.network] = []
    acc[show.network].push(show)
    return acc
  }, {} as Record<string, Show[]>)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Research</h1>
          <p className="text-slate-500 mt-1">Market intelligence, documents, and buyer notes</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'shows' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Show
            </button>
          )}
          {activeTab === 'documents' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Document
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F2F4F7] rounded-lg p-1 mb-6">
        {([
          { key: 'shows' as const, label: 'Shows' },
          { key: 'documents' as const, label: 'Documents' },
          { key: 'buyers' as const, label: 'Buyer Notes' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shows Tab */}
      {activeTab === 'shows' && (<>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search shows, genres, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>

        {/* Network Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 py-1.5">Network:</span>
          {networks.map(network => (
            <button
              key={network}
              onClick={() => setSelectedNetwork(network)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedNetwork === network
                  ? getNetworkColor(network).bg + ' text-white'
                  : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
              }`}
            >
              {network}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 py-1.5">Status:</span>
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-slate-500">
        Showing {shows.length} show{shows.length !== 1 ? 's' : ''}
      </div>

      {/* Shows Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        </div>
      ) : shows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-500 mb-2">No shows found</p>
          <button
            onClick={() => {
              setSelectedNetwork('All')
              setSelectedStatus('All')
              setSearchQuery('')
            }}
            className="text-[#2563EB] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {selectedNetwork === 'All' ? (
            // Grouped by network view
            Object.entries(groupedShows).map(([network, networkShows]) => (
              <div key={network} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
                <div className={`px-6 py-4 border-b ${getNetworkColor(network).light} border-[#E4E7EC]`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${getNetworkColor(network).bg}`}></span>
                    <h2 className="text-lg font-semibold text-slate-900">{network}</h2>
                    <span className="text-sm text-slate-500">({networkShows.length} shows)</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {networkShows.map(show => renderShowRow(show))}
                </div>
              </div>
            ))
          ) : (
            // Single network view - flat list
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden divide-y divide-slate-100">
              {shows.map(show => renderShowRow(show))}
            </div>
          )}
        </div>
      )}

      </>)}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {docsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 mb-2">No research documents yet</p>
              <button onClick={() => setIsUploadModalOpen(true)} className="text-[#2563EB] hover:underline">
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                    {doc.description && <p className="text-sm text-slate-500 mt-1">{doc.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>{doc.fileName}</span>
                      {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                    {doc.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.split(',').map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#F2F4F7] text-slate-600 rounded-full text-xs">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm hover:bg-[#1D4ED8] transition-colors"
                    >
                      View
                    </a>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buyer Notes Tab */}
      {activeTab === 'buyers' && (
        <div>
          {buyersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {defaultBuyers.map(buyer => {
                const isExpanded = expandedBuyer === buyer
                const existingNote = buyerNotes.find(bn => bn.buyer === buyer)
                const noteText = editingBuyerNotes[buyer] ?? existingNote?.notes ?? ''
                const hasContent = noteText.trim().length > 0

                return (
                  <div key={buyer} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
                    <button
                      onClick={() => setExpandedBuyer(isExpanded ? null : buyer)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F2F4F7] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${hasContent ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="font-semibold text-slate-900">{buyer}</span>
                      </div>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4">
                        <textarea
                          value={noteText}
                          onChange={(e) => setEditingBuyerNotes(prev => ({ ...prev, [buyer]: e.target.value }))}
                          onBlur={() => saveBuyerNote(buyer)}
                          rows={6}
                          placeholder="Add notes about this buyer's preferences, mandates, recent acquisitions..."
                          className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-sm"
                        />
                        {savingBuyer === buyer && (
                          <p className="text-xs text-slate-400 mt-1">Saving...</p>
                        )}
                        {existingNote && (
                          <p className="text-xs text-slate-400 mt-1">Last updated: {new Date(existingNote.updatedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-[#E4E7EC]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Upload Research Document</h2>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Document title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Comma-separated tags, e.g. CBC, market report"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-[#F2F4F7] rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !uploadFile || !uploadTitle}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Show Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-[#E4E7EC]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Add New Show</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Network *</label>
                  <select
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    required
                  >
                    {networks.filter(n => n !== 'All').map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    {statuses.filter(s => s !== 'All').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Show title"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="e.g. Drama, Comedy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Production Company</label>
                  <input
                    type="text"
                    value={formData.prodCompany}
                    onChange={(e) => setFormData({ ...formData, prodCompany: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="e.g. Hawco Productions"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Distributor</label>
                <input
                  type="text"
                  value={formData.distributor}
                  onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="e.g. Fifth Season, Lionsgate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Strategic insights, competitive intel..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-[#F2F4F7] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  Add Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  function renderShowRow(show: Show) {
    const isExpanded = expandedNotes.has(show.id)
    const hasNotes = show.notes && show.notes.trim().length > 0

    return (
      <div key={show.id} className="px-6 py-4 hover:bg-[#F2F4F7] transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-slate-900">{show.title}</h3>
              {show.status && (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(show.status)}`}>
                  {show.status}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              {show.genre && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                  {show.genre}
                </span>
              )}
              {show.prodCompany && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {show.prodCompany}
                </span>
              )}
              {show.distributor && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {show.distributor}
                </span>
              )}
            </div>
          </div>
          {hasNotes && (
            <button
              onClick={() => toggleNotes(show.id)}
              className="text-slate-400 hover:text-[#2563EB] transition-colors"
              title={isExpanded ? 'Hide notes' : 'Show notes'}
            >
              <svg 
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        {hasNotes && isExpanded && (
          <div className="mt-3 p-3 bg-[#F8F9FB] rounded-lg border border-[#E4E7EC]">
            <p className="text-sm text-slate-700 leading-relaxed">{show.notes}</p>
          </div>
        )}
      </div>
    )
  }
}
