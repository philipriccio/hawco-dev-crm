function mapGoogleEventToSyncedEvent(event) {
  const start = event?.start?.dateTime || event?.start?.date
  const end = event?.end?.dateTime || event?.end?.date
  if (!event?.id || !start || !end) return null

  return {
    googleEventId: event.id,
    title: event.summary || 'Untitled',
    description: event.description || null,
    location: event.location || null,
    htmlLink: event.htmlLink || null,
    status: event.status || null,
    startAt: new Date(start),
    endAt: new Date(end),
    attendees: (event.attendees || []).map((a) => a.email).filter(Boolean),
    rawJson: event,
  }
}

module.exports = { mapGoogleEventToSyncedEvent }
