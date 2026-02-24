'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ProjectContactRole } from '@prisma/client'

const CONTACT_ROLES: { value: ProjectContactRole; label: string; description: string }[] = [
  { value: 'WRITER', label: 'Writer', description: 'Writer or creator' },
  { value: 'PRODUCER', label: 'Producer', description: 'Executive producer, co-producer' },
  { value: 'ATTACHED_TALENT', label: 'Attached Talent', description: 'Actor or director attached' },
  { value: 'SOURCE', label: 'Source', description: 'Original source material author' },
]

export default function AddTeamMemberPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState<any | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProjectContactRole>('WRITER')
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'WRITER',
    company: '',
    agentName: '',
    agentCompany: '',
    managerName: '',
    managerCompany: '',
  })

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchContacts()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchContacts = async () => {
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.contacts || data || [])
      }
    } catch (err) {
      console.error('Error searching contacts:', err)
    }
  }

  const handleSelectContact = (contact: any) => {
    setSelectedContact(contact)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // If creating a new contact, first create it
      let contactId = selectedContact?.id

      if (showNewContact && !selectedContact) {
        const createRes = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newContact.name,
            email: newContact.email || null,
            phone: newContact.phone || null,
            type: newContact.type,
            company: newContact.company || null,
            agentName: newContact.agentName || null,
            agentCompany: newContact.agentCompany || null,
            managerName: newContact.managerName || null,
            managerCompany: newContact.managerCompany || null,
          }),
        })

        if (!createRes.ok) {
          const err = await createRes.json()
          throw new Error(err.error || 'Failed to create contact')
        }

        const newContactData = await createRes.json()
        contactId = newContactData.id
      }

      if (!contactId) {
        throw new Error('Please select or create a contact')
      }

      // Now add the contact to the project
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          role: selectedRole,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add team member')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/projects/${projectId}`)
      }, 1000)
    } catch (err: any) {
      console.error('Error adding team member:', err)
      setError(err.message || 'Failed to add team member')
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

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/projects/${projectId}`} className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Team Member</h1>
          <p className="text-slate-500">Attach a contact to this project</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">✓ Team member added successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle between search and create new */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => { setShowNewContact(false); setSelectedContact(null); }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              !showNewContact 
                ? 'bg-amber-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Search Existing
          </button>
          <button
            type="button"
            onClick={() => { setShowNewContact(true); setSelectedContact(null); setSearchQuery(''); }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              showNewContact 
                ? 'bg-amber-500 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Create New
          </button>
        </div>

        {!showNewContact ? (
          /* Search for existing contact */
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search Contacts</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {searchResults.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                  >
                    <p className="font-medium text-slate-900">{contact.name}</p>
                    <p className="text-sm text-slate-500">
                      {contact.type} {contact.company && `· ${contact.company}`}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Contact */}
            {selectedContact && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{selectedContact.name}</p>
                    <p className="text-sm text-slate-500">
                      {selectedContact.type} {selectedContact.company && `· ${selectedContact.company}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Create new contact form */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Type</label>
              <select
                value={newContact.type}
                onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="WRITER">Writer</option>
                <option value="AGENT">Agent</option>
                <option value="MANAGER">Manager</option>
                <option value="BUYER">Buyer</option>
                <option value="NETWORK_EXECUTIVE">Network Executive</option>
                <option value="PRODUCER">Producer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={newContact.company}
                onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Company name"
              />
            </div>

            {/* Agent fields for writers */}
            {newContact.type === 'WRITER' && (
              <>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Agent (optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={newContact.agentName}
                      onChange={(e) => setNewContact({ ...newContact, agentName: e.target.value })}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Agent name"
                    />
                    <input
                      type="text"
                      value={newContact.agentCompany}
                      onChange={(e) => setNewContact({ ...newContact, agentCompany: e.target.value })}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Agency"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-3">Manager (optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={newContact.managerName}
                      onChange={(e) => setNewContact({ ...newContact, managerName: e.target.value })}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Manager name"
                    />
                    <input
                      type="text"
                      value={newContact.managerCompany}
                      onChange={(e) => setNewContact({ ...newContact, managerCompany: e.target.value })}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Management company"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Role on Project *</label>
          <div className="grid grid-cols-2 gap-3">
            {CONTACT_ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  selectedRole === role.value
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-medium text-slate-900">{role.label}</p>
                <p className="text-xs text-slate-500">{role.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || (!selectedContact && !showNewContact)}
          className="w-full py-3 px-4 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? 'Adding...' : 'Add Team Member'}
        </button>
      </form>
    </div>
  )
}
