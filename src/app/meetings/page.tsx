'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start: string
  end: string
  location: string | null
  attendees: string[]
  htmlLink: string | null
}

interface ConnectionInfo {
  googleEmail: string | null
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
}

export default function MeetingsPage() {
  const [oauthState, setOauthState] = useState<string | null>(null)
  const [oauthReason, setOauthReason] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupGuidance, setSetupGuidance] = useState<string | null>(null)
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [connection, setConnection] = useState<ConnectionInfo | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [view])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar?view=${view}`)
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 503 && data.requiresAuth) {
          setRequiresAuth(true)
          setEvents([])
          setConnection(null)
          return
        }

        setError(data.error || 'Failed to load calendar events')
        return
      }

      setRequiresAuth(false)
      setConnection(data.connection || null)
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

  const connectCalendar = async () => {
    setError(null)
    setSetupGuidance(null)

    try {
      const res = await fetch('/api/calendar/connect')
      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start Google connection flow')
        if (data.code === 'missing_oauth_config' && data.guidance) {
          setSetupGuidance(data.guidance)
        }
        return
      }

      window.location.href = data.url
    } catch {
      setError('Could not start Google connection flow')
    }
  }

  const syncCalendar = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Sync failed')
      }
      await fetchEvents()
    } catch {
      setError('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setOauthState(params.get('calendar'))
      setOauthReason(params.get('reason'))
    }
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDateTime = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    const isAllDay =
      startDate.getHours() === 0 &&
      startDate.getMinutes() === 0 &&
      endDate.getHours() === 0 &&
      endDate.getMinutes() === 0

    if (isAllDay) {
      return formatDate(start) + ' (All day)'
    }

    return `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`
  }

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {}

    events.forEach((event) => {
      const dateKey = new Date(event.start).toDateString()
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(event)
    })

    return Object.entries(groups).map(([date, grouped]) => ({ date, events: grouped }))
  }

  const groupedEvents = groupEventsByDate(events)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500 mt-1">Google Calendar sync + CRM meeting logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/meetings/new" className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium">
            Log CRM Meeting
          </Link>
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'upcoming' ? 'bg-[#2563EB] text-white' : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setView('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'past' ? 'bg-[#2563EB] text-white' : 'bg-[#F2F4F7] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Past
          </button>
          <button onClick={syncCalendar} disabled={syncing || requiresAuth} className="px-4 py-2 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] disabled:opacity-50">
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {oauthState === 'connected' && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm">Google Calendar connected successfully. Run sync to pull events.</div>
      )}
      {oauthState === 'missing_refresh_token' && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">Google did not provide a refresh token. Remove app access in Google account permissions, then reconnect.</div>
      )}
      {oauthState === 'oauth_error' && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          Google OAuth failed{oauthReason ? ` (${oauthReason.replaceAll('_', ' ')})` : ''}. Please try again.
        </div>
      )}

      {requiresAuth ? (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
          <p className="text-slate-700 font-medium mb-4">Calendar not connected yet.</p>
          <button onClick={connectCalendar} className="px-4 py-2 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8]">Connect Google Calendar</button>
          <p className="text-sm text-slate-500 mt-3">You will be redirected to Google OAuth consent screen.</p>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          {setupGuidance && <p className="text-sm text-slate-600 mt-2">{setupGuidance}</p>}
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading calendar events...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
          <p className="text-slate-700 font-medium mb-2">{error}</p>
          {connection?.lastSyncError && <p className="text-sm text-red-600">Last sync error: {connection.lastSyncError}</p>}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-12 text-center">
          <p className="text-slate-700 font-medium mb-2">No events in this view</p>
        </div>
      ) : (
        <div className="space-y-6">
          {connection && (
            <div className="text-xs text-slate-500">
              {connection.googleEmail ? `Connected as ${connection.googleEmail} · ` : ''}
              Last sync: {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'Never'}
            </div>
          )}
          {groupedEvents.map(({ date, events }) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] divide-y divide-slate-100">
                {events.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-[#F2F4F7]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">{event.title}</h3>
                          {event.htmlLink && (
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#2563EB]" title="Open in Google Calendar">
                              ↗
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{formatDateTime(event.start, event.end)}</p>
                        {event.location && <p className="text-sm text-slate-500 mt-1">{event.location}</p>}
                        {event.description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{event.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
