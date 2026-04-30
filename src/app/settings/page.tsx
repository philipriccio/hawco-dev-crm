'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
}

interface Tag {
  id: string
  name: string
  color: string | null
  category: string | null
  _count: { projects: number }
}

interface Company {
  id: string
  name: string
  type: string
  website: string | null
  _count: { contacts: number; projects: number }
}

const colorOptions = [
  { value: '#64748b', label: 'Slate' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#d946ef', label: 'Fuchsia' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
]

const companyTypes = [
  { value: 'AGENCY', label: 'Agency' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'PRODUCTION_COMPANY', label: 'Production Company' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'OTHER', label: 'Other' },
]

const tagCategories = [
  { value: 'project', label: 'Project Tags' },
  { value: 'coverage', label: 'Coverage Tags' },
  { value: 'contact', label: 'Contact Tags' },
  { value: 'material', label: 'Material Tags' },
  { value: 'other', label: 'Other Tags' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'tags' | 'companies' | 'about'>('profile')
  
  // Profile state
  const [user, setUser] = useState<User | null>(null)
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  
  // Tags state
  const [tags, setTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState({ name: '', color: '#64748b', category: 'project' })
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  
  // Companies state
  const [companies, setCompanies] = useState<Company[]>([])
  const [newCompany, setNewCompany] = useState({ name: '', type: 'OTHER', website: '' })
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchProfile()
    fetchTags()
    fetchCompanies()
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // Profile APIs
  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings/profile')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setProfileForm({ name: data.name, email: data.email })
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        showMessage('success', 'Profile updated successfully')
      } else {
        const err = await res.json()
        showMessage('error', err.error || 'Failed to update profile')
      }
    } catch {
      showMessage('error', 'Failed to update profile')
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'New passwords do not match')
      return
    }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })
      if (res.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        showMessage('success', 'Password changed successfully')
      } else {
        const err = await res.json()
        showMessage('error', err.error || 'Failed to change password')
      }
    } catch {
      showMessage('error', 'Failed to change password')
    }
  }

  // Tags APIs
  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        setTags(data)
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err)
    }
  }

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag)
      })
      if (res.ok) {
        const tag = await res.json()
        const normalizedTag = {
          ...tag,
          _count: { projects: 0 },
        }
        setTags([...tags, normalizedTag])
        setNewTag({ name: '', color: '#64748b', category: 'project' })
        showMessage('success', 'Tag created successfully')
      } else {
        const err = await res.json()
        showMessage('error', err.error || 'Failed to create tag')
      }
    } catch {
      showMessage('error', 'Failed to create tag')
    }
  }

  const updateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTag) return
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTag.name,
          color: editingTag.color,
          category: editingTag.category || 'other'
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setTags(tags.map((t) => (
          t.id === updated.id
            ? {
                ...t,
                ...updated,
                _count: t._count || { projects: 0 },
              }
            : t
        )))
        setEditingTag(null)
        showMessage('success', 'Tag updated successfully')
      } else {
        const err = await res.json()
        showMessage('error', err.error || 'Failed to update tag')
      }
    } catch {
      showMessage('error', 'Failed to update tag')
    }
  }

  const deleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTags(tags.filter(t => t.id !== id))
        showMessage('success', 'Tag deleted successfully')
      } else {
        showMessage('error', 'Failed to delete tag')
      }
    } catch {
      showMessage('error', 'Failed to delete tag')
    }
  }

  // Companies APIs
  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err)
    }
  }

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany)
      })
      if (res.ok) {
        const company = await res.json()
        setCompanies([...companies, company])
        setNewCompany({ name: '', type: 'OTHER', website: '' })
        showMessage('success', 'Company created successfully')
      } else {
        const err = await res.json()
        showMessage('error', err.error || 'Failed to create company')
      }
    } catch {
      showMessage('error', 'Failed to create company')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and application preferences</p>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E4E7EC] mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`pb-4 px-2 text-sm font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tags
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`pb-4 px-2 text-sm font-medium transition-colors ${
              activeTab === 'companies'
                ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-4 px-2 text-sm font-medium transition-colors ${
              activeTab === 'about'
                ? 'text-[#2563EB] border-b-2 border-[#2563EB]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            About
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
            <form onSubmit={updateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#E4E7EC]">
                <span className="text-slate-500">Role</span>
                <span className="font-medium text-slate-900 capitalize">{user?.role.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Member Since</span>
                <span className="font-medium text-slate-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="space-y-6">
          {/* Create Tag */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Tag Manager</h2>
            <p className="text-sm text-slate-500 mb-4">
              Manage Project, Coverage, Contact, Material, and Other tags in one place.
            </p>
            <form onSubmit={createTag} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  placeholder="e.g., Drama, Priority, Submitted"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={newTag.category}
                  onChange={(e) => setNewTag({ ...newTag, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {tagCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                <select
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {colorOptions.map((color) => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                >
                  Create Tag
                </button>
              </div>
            </form>
          </div>

          {/* Tags List */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">All Tags</h2>
            {tags.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No tags found.</p>
            ) : (
              <div className="space-y-6">
                {tagCategories.map((category) => {
                  const categoryTags = tags.filter((t) => (t.category || 'other') === category.value)
                  if (categoryTags.length === 0) return null

                  return (
                    <div key={category.value}>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">{category.label}</h3>
                      <div className="space-y-2">
                        {categoryTags.map((tag) => (
                          <div key={tag.id} className="flex items-center justify-between p-3 bg-[#F2F4F7] rounded-lg">
                            {editingTag?.id === tag.id ? (
                              <form onSubmit={updateTag} className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                                <input
                                  type="text"
                                  value={editingTag.name}
                                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                  className="md:col-span-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                                  autoFocus
                                />
                                <select
                                  value={editingTag.category || 'other'}
                                  onChange={(e) => setEditingTag({ ...editingTag, category: e.target.value })}
                                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                >
                                  {tagCategories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                  ))}
                                </select>
                                <select
                                  value={editingTag.color || '#64748b'}
                                  onChange={(e) => setEditingTag({ ...editingTag, color: e.target.value })}
                                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                                >
                                  {colorOptions.map((color) => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                  ))}
                                </select>
                                <div className="flex gap-2">
                                  <button type="submit" className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Save</button>
                                  <button type="button" onClick={() => setEditingTag(null)} className="px-3 py-1.5 bg-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-400">Cancel</button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-center gap-3">
                                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color || '#64748b' }} />
                                  <span className="font-medium text-slate-900">{tag.name}</span>
                                  <span className="text-xs text-slate-500">used in {tag._count.projects} project{tag._count.projects !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingTag(tag)} className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-[#F8F9FB] rounded-lg transition-colors" title="Edit">
                                    <EditIcon className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteTag(tag.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          {/* Create Company */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Company</h2>
            <form onSubmit={createCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  placeholder="Company name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newCompany.type}
                  onChange={(e) => setNewCompany({ ...newCompany, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                >
                  {companyTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website (optional)</label>
                <input
                  type="url"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                  placeholder="https://example.com"
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                >
                  Add Company
                </button>
              </div>
            </form>
          </div>

          {/* Companies List */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Companies</h2>
            {companies.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No companies added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E4E7EC]">
                      <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Name</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 uppercase">Contacts</th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 uppercase">Projects</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Website</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id} className="border-b border-[#E4E7EC] last:border-0">
                        <td className="py-3 px-2 font-medium text-slate-900">{company.name}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getCompanyTypeColor(company.type)}`}>
                            {companyTypes.find(t => t.value === company.type)?.label || company.type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-600">{company._count.contacts}</td>
                        <td className="py-3 px-2 text-center text-slate-600">{company._count.projects}</td>
                        <td className="py-3 px-2">
                          {company.website ? (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#2563EB] hover:underline text-sm"
                            >
                              Visit
                            </a>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
          <div className="text-center py-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Hawco Dev CRM</h2>
              <p className="text-slate-500 mt-1">Development tracking for Hawco Productions</p>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <p>Version 0.1.0</p>
              <div className="flex justify-center gap-4">
                <a
                  href="#"
                  className="text-[#2563EB] hover:underline"
                  onClick={(e) => { e.preventDefault(); alert('Documentation coming soon!') }}
                >
                  Documentation
                </a>
                <span className="text-slate-300">|</span>
                <a
                  href="#"
                  className="text-[#2563EB] hover:underline"
                  onClick={(e) => { e.preventDefault(); alert('Support coming soon!') }}
                >
                  Support
                </a>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-[#E4E7EC]">
              <p className="text-xs text-slate-400">
                © 2026 Hawco Productions. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getCompanyTypeColor(type: string): string {
  const colors: Record<string, string> = {
    AGENCY: 'bg-blue-100 text-blue-700',
    NETWORK: 'bg-green-100 text-green-700',
    PRODUCTION_COMPANY: 'bg-purple-100 text-purple-700',
    DISTRIBUTOR: 'bg-orange-100 text-orange-700',
    OTHER: 'bg-[#F2F4F7] text-slate-700',
  }
  return colors[type] || colors.OTHER
}

// Icons
function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}