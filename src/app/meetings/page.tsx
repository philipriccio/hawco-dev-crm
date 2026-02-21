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

export default function MeetingsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    fetchEvents()
  }, [view])

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar?view=${view}`)
      const data = await res.json()
      
      if (data.error && res.status === 503) {
        setError('Calendar not connected. Please check configuration.')
        setEvents([])
      } else if (data.events) {
        setEvents(data.events)
      }
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

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
    
    // Check if it's an all-day event (no time component or midnight)
    const isAllDay = startDate.getHours() === 0 && startDate.getMinutes() === 0 &&
                     endDate.getHours() === 0 && endDate.getMinutes() === 0

    if (isAllDay) {
      return formatDate(start) + ' (All day)'
    }

    return `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`
  }

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {}
    
    events.forEach((event) => {
      const dateKey = new Date(event.start).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(event)
    })

    return Object.entries(groups).map(([date, events]) => ({
      date,
      events,
    }))
  }

  const groupedEvents = groupEventsByDate(events)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500 mt-1">
            Synced from your Hawco Productions calendar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'upcoming'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setView('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'past'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Past 30 Days
          </button>
          <button
            onClick={fetchEvents}
            className="p-2 text-slate-400 hover:text-slate-600"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading calendar events...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium mb-2">{error}</p>
          <p className="text-slate-500 text-sm">
            Make sure you&apos;ve shared your calendar with the service account.
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium mb-2">
            {view === 'upcoming' ? 'No upcoming meetings' : 'No past meetings found'}
          </p>
          <p className="text-slate-500 text-sm">
            {view === 'upcoming' 
              ? 'Your calendar is clear! Add meetings in Google Calendar and they\'ll appear here.'
              : 'No meetings in the past 30 days.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEvents.map(({ date, events }) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
                {events.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {event.title}
                          </h3>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-amber-500"
                              title="Open in Google Calendar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {formatDateTime(event.start, event.end)}
                        </p>
                        {event.location && (
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      {event.attendees.length > 0 && (
                        <div className="flex -space-x-2">
                          {event.attendees.slice(0, 3).map((email, i) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-xs font-medium text-amber-700"
                              title={email}
                            >
                              {email.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {event.attendees.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                              +{event.attendees.length - 3}
                            </div>
                          )}
                        </div>
                      )}
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
