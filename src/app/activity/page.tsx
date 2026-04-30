'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
}

interface ActivityLog {
  id: string
  userId: string
  action: 'created' | 'updated' | 'deleted'
  entityType: string
  entityId: string
  entityName: string
  changes: Record<string, { from: unknown; to: unknown }> | null
  createdAt: string
  user: User
}

interface ActivityResponse {
  activities: ActivityLog[]
  total: number
  limit: number
  offset: number
}

const actionColors = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
}

const actionIcons = {
  created: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  updated: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  deleted: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
}

const entityTypeLabels: Record<string, string> = {
  contact: 'Contact',
  company: 'Company',
  project: 'Project',
  coverage: 'Coverage',
  material: 'Material',
  meeting: 'Meeting',
  user: 'User',
}

const entityTypeLinks: Record<string, (id: string) => string> = {
  contact: (id) => `/contacts/${id}`,
  company: (id) => `/companies/${id}`,
  project: (id) => `/projects/${id}`,
  coverage: (id) => `/coverage/${id}`,
  material: () => `/materials`,
  meeting: () => `/meetings`,
  user: () => `/settings`,
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  
  // Filters
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const limit = 25

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedUser) params.append('userId', selectedUser)
      if (selectedEntityType) params.append('entityType', selectedEntityType)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('limit', limit.toString())
      params.append('offset', (page * limit).toString())

      const res = await fetch(`/api/activity?${params}`)
      const data: ActivityResponse = await res.json()
      
      setActivities(data.activities)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedUser, selectedEntityType, fromDate, toDate, page])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    fetchUsers()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-slate-500 mt-1">Track all changes made in the system</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type</label>
            <select
              value={selectedEntityType}
              onChange={(e) => { setSelectedEntityType(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">All Types</option>
              {Object.entries(entityTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0) }}
              className="w-full px-3 py-2 border border-[#E4E7EC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>
        {(selectedUser || selectedEntityType || fromDate || toDate) && (
          <div className="mt-3 pt-3 border-t border-[#E4E7EC]">
            <button
              onClick={() => {
                setSelectedUser('')
                setSelectedEntityType('')
                setFromDate('')
                setToDate('')
                setPage(0)
              }}
              className="text-sm text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No activity found.</p>
            {(selectedUser || selectedEntityType || fromDate || toDate) && (
              <p className="text-sm mt-2">Try adjusting your filters.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-[#F2F4F7] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Action Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${actionColors[activity.action]}`}>
                    {actionIcons[activity.action]}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{activity.user.name}</span>
                      {' '}
                      <span className="text-slate-500">{activity.action}</span>
                      {' '}
                      <span className="text-slate-500">{entityTypeLabels[activity.entityType]?.toLowerCase() || activity.entityType}</span>
                      {' '}
                      {activity.action !== 'deleted' ? (
                        <Link
                          href={entityTypeLinks[activity.entityType]?.(activity.entityId) || '#'}
                          className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                          {activity.entityName}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-700">{activity.entityName}</span>
                      )}
                    </p>
                    
                    {/* Changes (for updates) */}
                    {activity.changes && Object.keys(activity.changes).length > 0 && (
                      <div className="mt-2 text-xs text-slate-500 bg-[#F2F4F7] rounded p-2">
                        {Object.entries(activity.changes).slice(0, 3).map(([field, change]) => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">{field}:</span>
                            <span className="text-red-500 line-through">{String(change.from || '(empty)')}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-600">{String(change.to || '(empty)')}</span>
                          </div>
                        ))}
                        {Object.keys(activity.changes).length > 3 && (
                          <p className="text-slate-400 mt-1">+{Object.keys(activity.changes).length - 3} more changes</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-slate-500" title={formatFullDate(activity.createdAt)}>
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#E4E7EC]">
            <p className="text-sm text-slate-500">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} activities
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm rounded border border-[#E4E7EC] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F2F4F7]"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm rounded border border-[#E4E7EC] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F2F4F7]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
