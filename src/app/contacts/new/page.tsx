'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ContactType = 'WRITER' | 'AGENT' | 'MANAGER' | 'BUYER' | 'NETWORK_EXEC' | 'PRODUCER' | 'OTHER'
type WriterLevel = 'EMERGING' | 'MID_LEVEL' | 'EXPERIENCED' | 'SHOWRUNNER'

interface Agent {
  id: string
  name: string
  email?: string | null
  agentVibe?: string | null
}

interface Manager {
  id: string
  name: string
  email?: string | null
}

interface Company {
  id: string
  name: string
}

export default function NewContactPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ imported: number; errors: string[] } | null>(null)
  
  // Agent dropdown state
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentSearch, setAgentSearch] = useState('')
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showNewAgentForm, setShowNewAgentForm] = useState(false)
  const agentDropdownRef = useRef<HTMLDivElement>(null)
  
  // New agent form state
  const [newAgent, setNewAgent] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  })
  
  // Manager dropdown state
  const [managers, setManagers] = useState<Manager[]>([])
  const [managerSearch, setManagerSearch] = useState('')
  const [showManagerDropdown, setShowManagerDropdown] = useState(false)
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [showNewManagerForm, setShowNewManagerForm] = useState(false)
  const managerDropdownRef = useRef<HTMLDivElement>(null)
  
  // New manager form state
  const [newManager, setNewManager] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  })

  // Company state
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'WRITER' as ContactType,
    name: '',
    email: '',
    phone: '',
    imdbUrl: '',
    notes: '',
    // Writer fields
    writerLevel: '' as WriterLevel | '',
    writerGenres: '',
    writerVoice: '',
    citizenship: '',
    isCanadian: false,
    unionMembership: '',
    // Agent fields
    agentVibe: '',
    // Network exec fields
    execTitle: '',
    execRole: '',
    // Buyer fields
    lookingFor: '',
  })

  // Fetch agents, managers, and companies when component mounts
  useEffect(() => {
    fetchAgents()
    fetchManagers()
    fetchCompanies()
  }, [])

  // Close dropdowns when clicking outside
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

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/contacts?type=AGENT')
      if (res.ok) {
        const data = await res.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchManagers = async () => {
    try {
      const res = await fetch('/api/contacts?type=MANAGER')
      if (res.ok) {
        const data = await res.json()
        setManagers(data)
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    }
  }

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }

  const filteredManagers = managers.filter(manager => 
    manager.name.toLowerCase().includes(managerSearch.toLowerCase())
  )

  const handleSelectManager = (manager: Manager) => {
    setSelectedManager(manager)
    setManagerSearch(manager.name)
    setShowManagerDropdown(false)
    setShowNewManagerForm(false)
  }

  const handleSelectNewManager = () => {
    setSelectedManager(null)
    setShowNewManagerForm(true)
    setShowManagerDropdown(false)
  }

  const handleManagerSearchChange = (value: string) => {
    setManagerSearch(value)
    setShowManagerDropdown(true)
    if (selectedManager && selectedManager.name !== value) {
      setSelectedManager(null)
    }
    if (showNewManagerForm && value !== '+ Add new manager') {
      setShowNewManagerForm(false)
    }
  }

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    (agent.agentVibe && agent.agentVibe.toLowerCase().includes(agentSearch.toLowerCase()))
  )

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setAgentSearch(agent.name)
    setShowAgentDropdown(false)
    setShowNewAgentForm(false)
  }

  const handleSelectNewAgent = () => {
    setSelectedAgent(null)
    setShowNewAgentForm(true)
    setShowAgentDropdown(false)
  }

  const handleAgentSearchChange = (value: string) => {
    setAgentSearch(value)
    setShowAgentDropdown(true)
    if (selectedAgent && selectedAgent.name !== value) {
      setSelectedAgent(null)
    }
    if (showNewAgentForm && value !== '+ Add new agent') {
      setShowNewAgentForm(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const submitData: Record<string, unknown> = { ...formData }
      
      // Add agent and manager information if this is a writer
      if (formData.type === 'WRITER') {
        if (selectedAgent) {
          submitData.agentId = selectedAgent.id
        } else if (showNewAgentForm && newAgent.name) {
          submitData.newAgent = newAgent
        }
        if (selectedManager) {
          submitData.managerId = selectedManager.id
        } else if (showNewManagerForm && newManager.name) {
          submitData.newManager = newManager
        }
      }

      // Add company if selected
      if (selectedCompany) {
        submitData.companyId = selectedCompany.id
      }
      
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })
      
      if (!res.ok) throw new Error('Failed to create contact')
      
      const contact = await res.json()
      router.push(`/contacts/${contact.id}`)
    } catch (error) {
      console.error('Error creating contact:', error)
      alert('Failed to create contact')
    } finally {
      setSaving(false)
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResults(null)

    try {
      const text = await file.text()
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      })

      const result = await res.json()
      setImportResults(result)
      
      if (result.imported > 0) {
        setTimeout(() => router.push('/contacts'), 2000)
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResults({ imported: 0, errors: ['Failed to process CSV file'] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/contacts"
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Add Contact</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manual'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'import'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Import from CSV
        </button>
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Contact Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'WRITER', label: 'Writer' },
                { value: 'AGENT', label: 'Agent' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'BUYER', label: 'Buyer' },
                { value: 'NETWORK_EXEC', label: 'Network Exec' },
                { value: 'PRODUCER', label: 'Producer' },
                { value: 'OTHER', label: 'Other' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, type: type.value as ContactType })
                    // Reset agent/manager selection when changing type
                    if (type.value !== 'WRITER') {
                      setSelectedAgent(null)
                      setAgentSearch('')
                      setShowNewAgentForm(false)
                      setSelectedManager(null)
                      setManagerSearch('')
                      setShowNewManagerForm(false)
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.type === type.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IMDB URL</label>
              <input
                type="url"
                value={formData.imdbUrl}
                onChange={(e) => setFormData({ ...formData, imdbUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="https://imdb.com/name/..."
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">No company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Writer-specific fields */}
          {formData.type === 'WRITER' && (
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Writer Details</h3>
              
              {/* Agent Selection */}
              <div className="relative" ref={agentDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agent</label>
                <div className="relative">
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => handleAgentSearchChange(e.target.value)}
                    onFocus={() => setShowAgentDropdown(true)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
                    placeholder="Search for an agent..."
                  />
                  <svg 
                    className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Dropdown */}
                {showAgentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredAgents.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        No agents found
                      </div>
                    )}
                    {filteredAgents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleSelectAgent(agent)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <div className="font-medium text-slate-900">{agent.name}</div>
                        {agent.agentVibe && (
                          <div className="text-sm text-slate-500">{agent.agentVibe}</div>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSelectNewAgent}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 border-t border-slate-200 text-amber-600 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add new agent
                    </button>
                  </div>
                )}
              </div>

              {/* New Agent Form */}
              {showNewAgentForm && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">New Agent</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAgentForm(false)
                        setNewAgent({ name: '', company: '', email: '', phone: '' })
                        setAgentSearch('')
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name *</label>
                      <input
                        type="text"
                        value={newAgent.name}
                        onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Agent name"
                        required={showNewAgentForm}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company/Agency</label>
                      <input
                        type="text"
                        value={newAgent.company}
                        onChange={(e) => setNewAgent({ ...newAgent, company: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Agency name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Agent Email</label>
                      <input
                        type="email"
                        value={newAgent.email}
                        onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="agent@agency.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Agent Phone</label>
                      <input
                        type="tel"
                        value={newAgent.phone}
                        onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Manager Selection */}
              <div className="relative" ref={managerDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Manager</label>
                <div className="relative">
                  <input
                    type="text"
                    value={managerSearch}
                    onChange={(e) => handleManagerSearchChange(e.target.value)}
                    onFocus={() => setShowManagerDropdown(true)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-10"
                    placeholder="Search for a manager..."
                  />
                  <svg 
                    className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Dropdown */}
                {showManagerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredManagers.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        No managers found
                      </div>
                    )}
                    {filteredManagers.map((manager) => (
                      <button
                        key={manager.id}
                        type="button"
                        onClick={() => handleSelectManager(manager)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <div className="font-medium text-slate-900">{manager.name}</div>
                        {manager.email && (
                          <div className="text-sm text-slate-500">{manager.email}</div>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSelectNewManager}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 border-t border-slate-200 text-amber-600 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add new manager
                    </button>
                  </div>
                )}
              </div>

              {/* New Manager Form */}
              {showNewManagerForm && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">New Manager</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewManagerForm(false)
                        setNewManager({ name: '', company: '', email: '', phone: '' })
                        setManagerSearch('')
                      }}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Manager Name *</label>
                      <input
                        type="text"
                        value={newManager.name}
                        onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Manager name"
                        required={showNewManagerForm}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={newManager.company}
                        onChange={(e) => setNewManager({ ...newManager, company: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Management company"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Manager Email</label>
                      <input
                        type="email"
                        value={newManager.email}
                        onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="manager@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Manager Phone</label>
                      <input
                        type="tel"
                        value={newManager.phone}
                        onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                  <select
                    value={formData.writerLevel}
                    onChange={(e) => setFormData({ ...formData, writerLevel: e.target.value as WriterLevel })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select level</option>
                    <option value="EMERGING">Emerging</option>
                    <option value="MID_LEVEL">Mid-Level</option>
                    <option value="EXPERIENCED">Experienced</option>
                    <option value="SHOWRUNNER">Showrunner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Union Membership</label>
                  <input
                    type="text"
                    value={formData.unionMembership}
                    onChange={(e) => setFormData({ ...formData, unionMembership: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="WGC, WGA, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Primary Genres</label>
                  <input
                    type="text"
                    value={formData.writerGenres}
                    onChange={(e) => setFormData({ ...formData, writerGenres: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Drama, Thriller, Comedy..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voice (3 adjectives)</label>
                  <input
                    type="text"
                    value={formData.writerVoice}
                    onChange={(e) => setFormData({ ...formData, writerVoice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Witty, dark, character-driven"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Citizenship</label>
                  <input
                    type="text"
                    value={formData.citizenship}
                    onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Canadian, American, etc."
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCanadian}
                      onChange={(e) => setFormData({ ...formData, isCanadian: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-slate-700">🇨🇦 Canadian</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Agent-specific fields */}
          {formData.type === 'AGENT' && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Agent Details</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role / Vibe</label>
                <input
                  type="text"
                  value={formData.agentVibe}
                  onChange={(e) => setFormData({ ...formData, agentVibe: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Literary agent, focuses on emerging talent..."
                />
              </div>
            </div>
          )}

          {/* Network Exec-specific fields */}
          {formData.type === 'NETWORK_EXEC' && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Network Exec Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.execTitle}
                    onChange={(e) => setFormData({ ...formData, execTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="VP of Development, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Their Mandate</label>
                  <input
                    type="text"
                    value={formData.execRole}
                    onChange={(e) => setFormData({ ...formData, execRole: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Scripted drama, Canadian originals..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Manager-specific fields */}
          {formData.type === 'MANAGER' && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Manager Details</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role / Focus</label>
                <input
                  type="text"
                  value={formData.agentVibe}
                  onChange={(e) => setFormData({ ...formData, agentVibe: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Talent manager, focuses on showrunners..."
                />
              </div>
            </div>
          )}

          {/* Buyer-specific fields */}
          {formData.type === 'BUYER' && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Buyer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.execTitle}
                    onChange={(e) => setFormData({ ...formData, execTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="VP of Development, Head of Scripted..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Their Mandate</label>
                  <input
                    type="text"
                    value={formData.execRole}
                    onChange={(e) => setFormData({ ...formData, execRole: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Scripted drama, Canadian originals..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">What They&apos;re Looking For Now</label>
                <textarea
                  value={formData.lookingFor}
                  onChange={(e) => setFormData({ ...formData, lookingFor: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Currently seeking limited series with international appeal, comedies with diverse casts..."
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              href="/contacts"
              className="px-4 py-2 text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Create Contact'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Contacts from CSV</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Export your contacts from Google Contacts as a CSV file, then upload it here.
            </p>

            {/* Instructions */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
              <p className="text-sm font-medium text-slate-700 mb-2">How to export from Google Contacts:</p>
              <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://contacts.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">contacts.google.com</a></li>
                <li>Select contacts or &quot;Export all&quot;</li>
                <li>Click Export → Google CSV</li>
                <li>Upload the file below</li>
              </ol>
            </div>

            <label className={`inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 cursor-pointer font-medium ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {importing ? 'Importing...' : 'Upload CSV File'}
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                disabled={importing}
                className="hidden"
              />
            </label>

            {importResults && (
              <div className={`mt-6 p-4 rounded-lg ${importResults.imported > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                {importResults.imported > 0 ? (
                  <p className="text-green-700 font-medium">
                    ✓ Successfully imported {importResults.imported} contacts! Redirecting...
                  </p>
                ) : (
                  <div className="text-red-700">
                    <p className="font-medium mb-2">Import failed</p>
                    {importResults.errors.map((err, i) => (
                      <p key={i} className="text-sm">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4">
              Expected columns: Name, Email, Phone, Organization, Notes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}