'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Tag {
  id: string
  name: string
  color: string | null
  category: string | null
  _count: {
    projects: number
  }
}

const CATEGORIES = [
  { value: 'genre', label: 'Genre', description: 'Project genres (Comedy, Drama, etc.)' },
  { value: 'tone', label: 'Tone', description: 'Tonal descriptors (Dark, Light, etc.)' },
  { value: 'status', label: 'Status', description: 'Custom status labels' },
  { value: 'source', label: 'Source', description: 'Material sources' },
  { value: 'other', label: 'Other', description: 'General tags' },
]

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(COLORS[0])
  const [formCategory, setFormCategory] = useState('genre')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        setTags(data)
      }
    } catch (err) {
      console.error('Error fetching tags:', err)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setFormName('')
    setFormColor(COLORS[0])
    setFormCategory('genre')
    setError('')
    setEditingTag(null)
    setShowAddModal(true)
  }

  function openEditModal(tag: Tag) {
    setFormName(tag.name)
    setFormColor(tag.color || COLORS[0])
    setFormCategory(tag.category || 'other')
    setError('')
    setEditingTag(tag)
    setShowAddModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) {
      setError('Name is required')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags'
      const method = editingTag ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          color: formColor,
          category: formCategory,
        }),
      })
      
      if (res.ok) {
        setShowAddModal(false)
        fetchTags()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save tag')
      }
    } catch (err) {
      setError('Failed to save tag')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tag: Tag) {
    if (!confirm(`Delete "${tag.name}"? This will remove it from ${tag._count.projects} projects.`)) {
      return
    }
    
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTags()
      }
    } catch (err) {
      console.error('Error deleting tag:', err)
    }
  }

  const filteredTags = categoryFilter
    ? tags.filter(t => t.category === categoryFilter)
    : tags

  const tagsByCategory = filteredTags.reduce((acc, tag) => {
    const cat = tag.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {} as Record<string, Tag[]>)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Tags</h1>
            <p className="text-slate-500">Add, edit, and delete tags for projects</p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Tag
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !categoryFilter ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat.value ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tags List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(tagsByCategory).map(([category, categoryTags]) => {
            const catInfo = CATEGORIES.find(c => c.value === category) || { label: category, description: '' }
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">{catInfo.label}</h2>
                  {catInfo.description && (
                    <p className="text-sm text-slate-500">{catInfo.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryTags.map(tag => (
                    <div
                      key={tag.id}
                      className="group flex items-center gap-2 px-3 py-1.5 rounded-full border"
                      style={{ 
                        backgroundColor: tag.color ? `${tag.color}20` : '#f1f5f9',
                        borderColor: tag.color || '#e2e8f0',
                      }}
                    >
                      {tag.color && (
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span className="text-sm font-medium text-slate-700">{tag.name}</span>
                      <span className="text-xs text-slate-400">({tag._count.projects})</span>
                      <button
                        onClick={() => openEditModal(tag)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {categoryTags.length === 0 && (
                    <p className="text-slate-400 italic text-sm">No tags in this category</p>
                  )}
                </div>
              </div>
            )
          })}
          {Object.keys(tagsByCategory).length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>No tags yet.</p>
              <button onClick={openAddModal} className="text-amber-600 hover:underline mt-2">
                Create your first tag
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingTag ? 'Edit Tag' : 'Add Tag'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Comedy, Drama, Thriller..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formColor === color ? 'ring-2 ring-offset-2 ring-amber-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preview</label>
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ 
                    backgroundColor: `${formColor}20`,
                    border: `1px solid ${formColor}`,
                  }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formColor }} />
                  <span className="text-sm font-medium text-slate-700">
                    {formName || 'Tag Name'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingTag ? 'Save Changes' : 'Add Tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
