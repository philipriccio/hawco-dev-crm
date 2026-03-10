const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { mapGoogleEventToSyncedEvent } = require('../src/lib/calendar-mapper.js')

function testLogMeetingRoute() {
  const contactPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/[id]/page.tsx'), 'utf8')
  assert(contactPage.includes('getLogMeetingHref(contact.id)'), 'Contact detail must link Log Meeting via helper')
  assert(fs.existsSync(path.join(__dirname, '../src/app/meetings/new/page.tsx')), 'Meetings new page route must exist')
}

function testPrimaryNavRoutes() {
  const routes = [
    '/', '/contacts', '/contacts/new', '/projects', '/projects/new', '/meetings', '/meetings/new', '/activity', '/materials', '/coverage', '/coverage/new', '/settings', '/market-intel', '/whiteboard', '/intake',
  ]

  for (const route of routes) {
    const pagePath = route === '/'
      ? path.join(__dirname, '../src/app/page.tsx')
      : path.join(__dirname, '../src/app', route.slice(1), 'page.tsx')
    assert(fs.existsSync(pagePath), `Missing route page: ${route}`)
  }
}

function testCalendarMapper() {
  const input = {
    id: 'evt_1',
    summary: 'Coffee with writer',
    description: 'Discuss pilot rewrite',
    start: { dateTime: '2026-03-10T14:00:00Z' },
    end: { dateTime: '2026-03-10T15:00:00Z' },
    attendees: [{ email: 'a@example.com' }, { email: 'b@example.com' }],
    htmlLink: 'https://calendar.google.com/event?eid=abc',
  }
  const mapped = mapGoogleEventToSyncedEvent(input)
  assert(mapped, 'Expected mapped event')
  assert.equal(mapped.googleEventId, 'evt_1')
  assert.equal(mapped.attendees.length, 2)

  const invalid = mapGoogleEventToSyncedEvent({ summary: 'missing id' })
  assert.equal(invalid, null)
}

function run(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    throw error
  }
}

run('Log Meeting route/action wiring', testLogMeetingRoute)
run('Primary nav route integrity', testPrimaryNavRoutes)
run('Calendar sync mapping logic', testCalendarMapper)

console.log('\nAll tests passed.')
