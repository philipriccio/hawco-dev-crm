'use client'

import { useState } from 'react'

interface Material {
  id: string
  type: string
  title: string
  filename: string
  fileUrl: string
  notes: string | null
  project: { id: string; title: string } | null
  writer?: { id: string; name: string } | null
}

interface ContactMaterialsProps {
  contactId: string
  initialMaterials: Material[]
  isWriter?: boolean
}

const materialTypeLabels: Record<string, string> = {
  PILOT_SCRIPT: 'Pilot Script',
  SERIES_BIBLE: 'Series Bible',
  PITCH_DECK: 'Pitch Deck',
  TREATMENT: 'Treatment',
  FEATURE: 'Feature',
  SPEC_SCRIPT: 'Spec Script',
  OTHER: 'Other',
}

export default function ContactMaterials({ 
  contactId, 
  initialMaterials,
  isWriter = false 
}: ContactMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'PILOT_SCRIPT',
    fileUrl: '',
    notes: '',
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        submittedById: contactId,
      }
      if (isWriter) {
        payload.writerId = contactId
      }
      
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        const newMaterial = await res.json()
        setMaterials([newMaterial, ...materials])
        setShowAddForm(false)
        setFormData({ title: '', type: 'PILOT_SCRIPT', fileUrl: '', notes: '' })
      }
    } catch (error) {
      console.error('Error adding material:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this material?')) return
    
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMaterials(materials.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  async function handleUpdate(id: string, data: { title?: string; notes?: string }) {
    setSaving(true)
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setMaterials(materials.map(m => m.id === id ? updated : m))
        setEditingId(null)
      }
    } catch (error) {
      console.error('Error updating material:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {isWriter ? '📝 Scripts & Materials' : 'Submitted Materials'} ({materials.length})
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-[#F2F4F7] rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Material title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              >
                {Object.entries(materialTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File URL *</label>
            <input
              type="url"
              required
              value={formData.fileUrl}
              onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Adding...' : 'Add Material'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Materials List */}
      {materials.length === 0 ? (
        <p className="text-slate-500 text-sm">No materials yet</p>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-[#F2F4F7]"
            >
              <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {editingId === material.id ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      defaultValue={material.title}
                      id={`edit-title-${material.id}`}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      placeholder="Title"
                    />
                    <textarea
                      defaultValue={material.notes || ''}
                      id={`edit-notes-${material.id}`}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      placeholder="Notes"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(material.id, {
                          title: (document.getElementById(`edit-title-${material.id}`) as HTMLInputElement).value,
                          notes: (document.getElementById(`edit-notes-${material.id}`) as HTMLTextAreaElement).value,
                        })}
                        disabled={saving}
                        className="px-2 py-1 bg-[#2563EB] text-white rounded text-xs hover:bg-[#1D4ED8]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-slate-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-slate-900 truncate">{material.title}</p>
                    <p className="text-sm text-slate-500">
                      {materialTypeLabels[material.type] || material.type}
                      {material.project && ` · ${material.project.title}`}
                    </p>
                  </>
                )}
              </div>
              {!editingId && (
                <div className="flex gap-2 flex-shrink-0">
                  {material.fileUrl && (
                    <a
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => setEditingId(material.id)}
                    className="px-2 py-1 text-slate-500 hover:text-slate-700"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="px-2 py-1 text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
