'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type ContactType = 'WRITER' | 'AGENT' | 'MANAGER' | 'BUYER' | 'NETWORK_EXEC' | 'PRODUCER' | 'OTHER'

const typeLabels: Record<string, string> = {
  WRITER: 'Writer',
  AGENT: 'Agent',
  MANAGER: 'Manager',
  BUYER: 'Buyer',
  NETWORK_EXEC: 'Network Executive',
  PRODUCER: 'Producer',
  OTHER: 'Other',
}
type WriterLevel = 'EMERGING' | 'MID_LEVEL' | 'EXPERIENCED' | 'SHOWRUNNER'

interface Rep {
  id: string
  name: string
  email?: string | null
}

interface Company {
  id: string
  name: string
}

interface Contact {
  id: string
  type: ContactType
  name: string
  email: string | null
  phone: string | null
  imdbUrl: string | null
  notes: string | null
  writerLevel: WriterLevel | null
  writerGenres: string | null
  writerVoice: string | null
  citizenship: string | null
  isCanadian: boolean
  unionMembership: string | null
  agentVibe: string | null
  execTitle: string | null
  execRole: string | null
  lookingFor: string | null
  agentId: string | null
  managerId: string | null
  companyId: string | null
  agent: Rep | null
  manager: Rep | null
  company: Company | null
}

export default function EditContactPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [contact, setContact] = useState<Contact | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'WRITER' as ContactType,
    name: '',
    email: '',
    phone: '',
    imdbUrl: '',
    notes: '',
    writerLevel: '' as WriterLevel | '',
    writerGenres: '',
    writerVoice: '',
    citizenship: '',
    isCanadian: false,
    unionMembership: '',
    agentVibe: '',
    execTitle: '',
    execRole: '',
    lookingFor: '',
  })

  // Agent dropdown state
  const [agents, setAgents] = useState<Rep[]>([])
  const [agentSearch, setAgentSearch] = useState('')
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Rep | null>(null)
  const agentDropdownRef = useRef<HTMLDivElement>(null)

  // Manager dropdown state
  const [managers, setManagers] = useState<Rep[]>([])
  const [managerSearch, setManagerSearch] = useState('')
  const [showManagerDropdown, setShowManagerDropdown] = useState(false)
  const [selectedManager, setSelectedManager] = useState<Rep | null>(null)
  const managerDropdownRef = useRef<HTMLDivElement>(null)

  // Company dropdown state
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  useEffect(() => {
    fetchContact()
    fetchAgents()
    fetchManagers()
    fetchCompanies()
  }, [id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false)
      }
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setShowManagerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchContact() {
    try {
      const res = await fetch(`/api/contacts/${id}`)
      if (res.ok) {
        const data = await res.json()
        setContact(data)
        setFormData({
          type: data.type,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          imdbUrl: data.imdbUrl || '',
          notes: data.notes || '',
          writerLevel: data.writerLevel || '',
          writerGenres: data.writerGenres || '',
          writerVoice: data.writerVoice || '',
          citizenship: data.citizenship || '',
          isCanadian: data.isCanadian || false,
          unionMembership: data.unionMembership || '',
          agentVibe: data.agentVibe || '',
          execTitle: data.execTitle || '',
          execRole: data.execRole || '',
          lookingFor: data.lookingFor || '',
        })
        if (data.agent) {
          setSelectedAgent(data.agent)
          setAgentSearch(data.agent.name)
        }
        if (data.manager) {
          setSelectedManager(data.manager)
          setManagerSearch(data.manager.name)
        }
        if (data.company) {
          setSelectedCompany(data.company)
        }
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAgents() {
    try {
      const res = await fetch('/api/contacts?type=AGENT')
      if (res.ok) setAgents(await res.json())
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  async function fetchManagers() {
    try {
      const res = await fetch('/api/contacts?type=MANAGER')
      if (res.ok) setManagers(await res.json())
    } catch (error) {
      console.error('Error fetching managers:', error)
    }
  }

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) setCompanies(await res.json())
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  )
  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(managerSearch.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    try {
      const submitData = {
        ...formData,
        agentId: selectedAgent?.id || null,
        managerId: selectedManager?.id || null,
        companyId: selectedCompany?.id || null,
      }
      
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })
      
      if (res.ok) {
        router.push(`/contacts/${id}`)
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      console.error('Error updating contact:', error)
      alert('Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-8">
        <p className="text-red-600">Contact not found</p>
        <Link href="/contacts" className="text-[#2563EB] hover:underline">Back to contacts</Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/contacts/${id}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Edit {contact.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6 space-y-6">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ContactType })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">IMDB URL</label>
            <input
              type="url"
              value={formData.imdbUrl}
              onChange={(e) => setFormData({ ...formData, imdbUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
          <select
            value={selectedCompany?.id || ''}
            onChange={(e) => {
              const company = companies.find(c => c.id === e.target.value)
              setSelectedCompany(company || null)
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          >
            <option value="">No company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* Writer-specific: Agent & Manager */}
        {formData.type === 'WRITER' && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Representation</h3>
            
            {/* Agent */}
            <div className="relative" ref={agentDropdownRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Agent</label>
              <div className="relative">
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(e) => {
                    setAgentSearch(e.target.value)
                    setShowAgentDropdown(true)
                    if (selectedAgent && selectedAgent.name !== e.target.value) {
                      setSelectedAgent(null)
                    }
                  }}
                  onFocus={() => setShowAgentDropdown(true)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="Search agents..."
                />
                {selectedAgent && (
                  <button
                    type="button"
                    onClick={() => { setSelectedAgent(null); setAgentSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {showAgentDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#E4E7EC] rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredAgents.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No agents found</div>
                  ) : (
                    filteredAgents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          setSelectedAgent(agent)
                          setAgentSearch(agent.name)
                          setShowAgentDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#F2F4F7] text-sm"
                      >
                        {agent.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Manager */}
            <div className="relative" ref={managerDropdownRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manager</label>
              <div className="relative">
                <input
                  type="text"
                  value={managerSearch}
                  onChange={(e) => {
                    setManagerSearch(e.target.value)
                    setShowManagerDropdown(true)
                    if (selectedManager && selectedManager.name !== e.target.value) {
                      setSelectedManager(null)
                    }
                  }}
                  onFocus={() => setShowManagerDropdown(true)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="Search managers..."
                />
                {selectedManager && (
                  <button
                    type="button"
                    onClick={() => { setSelectedManager(null); setManagerSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {showManagerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#E4E7EC] rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredManagers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No managers found</div>
                  ) : (
                    filteredManagers.map((manager) => (
                      <button
                        key={manager.id}
                        type="button"
                        onClick={() => {
                          setSelectedManager(manager)
                          setManagerSearch(manager.name)
                          setShowManagerDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#F2F4F7] text-sm"
                      >
                        {manager.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Writer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                <select
                  value={formData.writerLevel}
                  onChange={(e) => setFormData({ ...formData, writerLevel: e.target.value as WriterLevel })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                >
                  <option value="">Select level</option>
                  <option value="EMERGING">Emerging</option>
                  <option value="MID_LEVEL">Mid-Level</option>
                  <option value="EXPERIENCED">Experienced</option>
                  <option value="SHOWRUNNER">Showrunner</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Union</label>
                <input
                  type="text"
                  value={formData.unionMembership}
                  onChange={(e) => setFormData({ ...formData, unionMembership: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="WGC, WGA, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Genres</label>
                <input
                  type="text"
                  value={formData.writerGenres}
                  onChange={(e) => setFormData({ ...formData, writerGenres: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
                <input
                  type="text"
                  value={formData.writerVoice}
                  onChange={(e) => setFormData({ ...formData, writerVoice: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Citizenship</label>
                <input
                  type="text"
                  value={formData.citizenship}
                  onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCanadian}
                    onChange={(e) => setFormData({ ...formData, isCanadian: e.target.checked })}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB]"
                  />
                  <span className="text-sm font-medium text-slate-700">🇨🇦 Canadian</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Buyer-specific */}
        {formData.type === 'BUYER' && (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Buyer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.execTitle}
                  onChange={(e) => setFormData({ ...formData, execTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mandate</label>
                <input
                  type="text"
                  value={formData.execRole}
                  onChange={(e) => setFormData({ ...formData, execRole: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">What They&apos;re Looking For Now</label>
              <textarea
                value={formData.lookingFor}
                onChange={(e) => setFormData({ ...formData, lookingFor: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href={`/contacts/${id}`}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
