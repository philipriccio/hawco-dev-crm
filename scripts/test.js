const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { mapGoogleEventToSyncedEvent } = require('../src/lib/calendar-mapper.js')

function testLogMeetingRoute() {
  const contactPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/[id]/page.tsx'), 'utf8')
  assert(contactPage.includes('getLogMeetingHref(contact.id)'), 'Contact detail must link Log Meeting via helper')
  assert(fs.existsSync(path.join(__dirname, '../src/app/meetings/new/page.tsx')), 'Meetings new page route must exist')
}

function testCalendarConnectRouteAndFeedback() {
  const connectRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/calendar/connect/route.ts'), 'utf8')
  assert(connectRoute.includes('missing_oauth_config'), 'Connect route should expose explicit missing-config code')
  assert(connectRoute.includes('guidance'), 'Connect route should return setup guidance for missing OAuth config')

  const meetingsPage = fs.readFileSync(path.join(__dirname, '../src/app/meetings/page.tsx'), 'utf8')
  assert(meetingsPage.includes("fetch('/api/calendar/connect')"), 'Meetings page should trigger calendar connect endpoint')
  assert(meetingsPage.includes('setupGuidance'), 'Meetings page should render config guidance on auth setup failures')
  assert(meetingsPage.includes('missing_refresh_token'), 'Meetings page should show refresh-token failure guidance')
}

function testCoverageAddNewFlow() {
  const newCoveragePage = fs.readFileSync(path.join(__dirname, '../src/app/coverage/new/page.tsx'), 'utf8')
  assert(newCoveragePage.includes('ADD_NEW'), 'Coverage form should support explicit add-new option')
  assert(newCoveragePage.includes('ensureWriter'), 'Coverage form should support inline writer creation')
  assert(newCoveragePage.includes('ensureProject'), 'Coverage form should support inline project creation')
  assert(newCoveragePage.includes('ensureSource'), 'Coverage form should support inline source creation')
  assert(newCoveragePage.includes('projectId: finalProjectId'), 'Newly created project should be immediately selected for submit')
  assert(newCoveragePage.includes('writer: finalWriter'), 'Newly created writer should be immediately selected for submit')

  const optionsRoutePath = path.join(__dirname, '../src/app/api/coverage/options/route.ts')
  assert(fs.existsSync(optionsRoutePath), 'Coverage options endpoint should exist for reusable writer/source dropdown data')
}

function testPrimaryNavRoutes() {
  const routes = [
    '/', '/contacts', '/contacts/new', '/projects', '/projects/new', '/meetings', '/meetings/new', '/activity', '/materials', '/coverage', '/coverage/new', '/settings', '/research', '/whiteboard', '/intake',
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
run('Calendar connect route + failure feedback', testCalendarConnectRouteAndFeedback)
run('Coverage add-new options + persistence flow wiring', testCoverageAddNewFlow)
run('Primary nav route integrity', testPrimaryNavRoutes)
run('Calendar sync mapping logic', testCalendarMapper)

console.log('\nAll tests passed.')
