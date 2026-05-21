const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { mapGoogleEventToSyncedEvent } = require('../src/lib/calendar-mapper.js')
const { execFileSync } = require('child_process')

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
    '/', '/contacts', '/contacts/new', '/projects', '/projects/new', '/meetings', '/meetings/new', '/activity', '/materials', '/coverage', '/coverage/new', '/settings', '/buyers', '/whiteboard', '/intake',
  ]

  for (const route of routes) {
    const pagePath = route === '/'
      ? path.join(__dirname, '../src/app/page.tsx')
      : path.join(__dirname, '../src/app', route.slice(1), 'page.tsx')
    assert(fs.existsSync(pagePath), `Missing route page: ${route}`)
  }
}


function testDashboardRedesignContracts() {
  const helperModule = fs.readFileSync(path.join(__dirname, '../src/lib/dashboard-helpers.ts'), 'utf8')
  const dashboardPage = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8')

  const readableTypesBlock = helperModule.slice(helperModule.indexOf('READABLE_MATERIAL_TYPES'), helperModule.indexOf('export type AgeTone'))
  assert(readableTypesBlock.includes("'OTHER'"), 'Readable dashboard material types should include OTHER')
  assert(!readableTypesBlock.includes('PITCH_DECK'), 'Readable dashboard material types must exclude pitch decks')
  assert(helperModule.includes("type !== 'PITCH_DECK'"), 'Dashboard helper should explicitly exclude pitch decks')
  assert(helperModule.includes("ageDays >= 30") && helperModule.includes("ageDays >= 14"), 'Dashboard priority helper should preserve 30/14 day thresholds')
  assert(dashboardPage.includes('READABLE_MATERIAL_TYPES'), 'Dashboard queries should use shared readable material types')
  assert(dashboardPage.includes('No unread scripts. Clean.'), 'Dashboard should render clean unread empty state')
  assert(dashboardPage.includes('Relationship risk'), 'Dashboard should include source/agency rollup')
  assert(dashboardPage.includes('projectCoverages'), 'Dashboard read rows should prefer project-linked coverage')
  assert(dashboardPage.includes('coverageMap.set(coverage.id'), 'Dashboard should dedupe direct/project coverage by id')
  assert(!dashboardPage.includes('!coverage.scriptId && coverage.projectId'), 'Dashboard coverage matching must not depend on null scriptId')
}

function testMaterialReadSyncContracts() {
  const materialsPatchRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/materials/[id]/route.ts'), 'utf8')
  const projectsPatchRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/projects/[id]/route.ts'), 'utf8')

  assert(materialsPatchRoute.includes("'TREATMENT'"), 'Material read sync should treat treatments as script/readable materials')
  assert(materialsPatchRoute.includes('readTransitionAt'), 'Material read sync should detect null -> readAt transitions')
  assert(materialsPatchRoute.includes('firstReadAt'), 'Marking a script-type material read should sync project.firstReadAt')
  assert(materialsPatchRoute.includes('!updatedMaterial.project?.firstReadAt'), 'Material read sync should only set firstReadAt when missing')
  assert(projectsPatchRoute.includes("'TREATMENT'"), 'Project read toggles should keep treatments in script-type read sync')
}

function testCoverageScriptLinkCleanupContract() {
  const cleanupScriptPath = path.join(__dirname, 'cleanup-coverage-script-links.ts')
  assert(fs.existsSync(cleanupScriptPath), 'Coverage script-link cleanup script should exist')
  const cleanupScript = fs.readFileSync(cleanupScriptPath, 'utf8')
  assert(cleanupScript.includes('projectId: { not: null }'), 'Cleanup should only repair project-linked coverage')
  assert(cleanupScript.includes('scriptId: null'), 'Cleanup should be able to drop stale scriptId links')
  assert(cleanupScript.includes('projectId is authoritative'), 'Cleanup should document projectId as authoritative fallback')
}

function testUsabilityFiltersAndSearch() {
  const projectsPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/page.tsx'), 'utf8')
  assert(projectsPage.includes("countMap['READ']"), 'Projects page should expose Read status filter/count')
  assert(projectsPage.includes("countMap['RELEASED']"), 'Projects page should expose Released status filter/count')
  assert(projectsPage.includes('contacts: { some: { contact: { name:'), 'Project search should include writer/contact names')

  const materialsRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/materials/route.ts'), 'utf8')
  assert(materialsRoute.includes("read === 'unread'"), 'Materials API should support unread filtering')
  assert(materialsRoute.includes("read === 'read'"), 'Materials API should support read filtering')

  const materialsPage = fs.readFileSync(path.join(__dirname, '../src/app/materials/page.tsx'), 'utf8')
  assert(materialsPage.includes('All Read States'), 'Materials page should expose a read-state filter')

  const dashboardPage = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8')
  assert(dashboardPage.includes('read=unread'), 'Dashboard unread script card should link to unread materials')
  assert(dashboardPage.includes('read=read'), 'Dashboard read script card should link to read materials')
}


function testConnectedProjectFlows() {
  const addMaterialPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/materials/add/page.tsx'), 'utf8')
  assert(addMaterialPage.includes("fetch('/api/upload'"), 'Project Add Material upload tab should use the upload API')
  assert(addMaterialPage.includes('type="file"'), 'Project Add Material upload tab should expose a real file input')

  const whiteboardAdd = fs.readFileSync(path.join(__dirname, '../src/app/whiteboard/AddProjectButton.tsx'), 'utf8')
  assert(whiteboardAdd.includes('Array.isArray(data)'), 'Whiteboard Add from Submissions should handle bare array API responses')

  const coverageNew = fs.readFileSync(path.join(__dirname, '../src/app/coverage/new/page.tsx'), 'utf8')
  assert(coverageNew.includes('new URLSearchParams(window.location.search)'), 'New Coverage should read project/material query params')
  assert(coverageNew.includes('scriptId: prefillScriptId'), 'New Coverage should persist prefilled script id')

  const projectDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/page.tsx'), 'utf8')
  assert(projectDetailPage.includes('coverages: {'), 'Project detail should fetch directly linked coverages')
  assert(projectDetailPage.includes('...(project?.coverages.map'), 'Project detail should exclude directly linked coverages from link dropdown')

  const projectDetailClient = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/ProjectDetailClient.tsx'), 'utf8')
  assert(projectDetailClient.includes('directCoverages'), 'Project detail should display directly linked coverages')

  const addContactPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/contacts/add/page.tsx'), 'utf8')
  assert(!addContactPage.includes('NETWORK_EXECUTIVE'), 'Project Add Contact should use the valid NETWORK_EXEC enum')

  const materialsRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/materials/route.ts'), 'utf8')
  assert(materialsRoute.includes("orphans === 'true'"), 'Materials API should support orphan filtering for Link Existing')
  assert(materialsRoute.includes('materialId'), 'Materials API should support materialId lookup for coverage prefill')

  const coveragePage = fs.readFileSync(path.join(__dirname, '../src/app/coverage/page.tsx'), 'utf8')
  assert(coveragePage.includes('params.projectId'), 'Coverage page should honor projectId filter links')
  assert(coveragePage.includes('/50'), 'Coverage score display should use the canonical /50 scale')
}


function testBuyersFeatureContracts() {
  const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8')
  const sidebar = fs.readFileSync(path.join(__dirname, '../src/components/Sidebar.tsx'), 'utf8')
  const buyersPage = fs.readFileSync(path.join(__dirname, '../src/app/buyers/page.tsx'), 'utf8')
  const buyerDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/buyers/[id]/BuyerDetailClient.tsx'), 'utf8')
  const migration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/202605212215_buyers_feature/migration.sql'), 'utf8')

  assert(sidebar.includes("name: 'Buyers'") && sidebar.includes("href: '/buyers'"), 'Sidebar should expose Buyers nav')
  assert(schema.includes('isBuyer') && schema.includes('model BuyerSlateItem'), 'Company-backed buyers and slate model should exist')
  assert(schema.includes('BuyerSlateStatus'), 'Slate status enum should exist')
  assert(migration.includes('Disney+ Canada'), 'Migration should create/flag Disney+ Canada buyer')
  assert(migration.includes('TARGET_BUYER'), 'Migration should backfill target buyer project links')
  assert(buyersPage.includes('Research docs'), 'Buyers area should preserve access to research documents')
  assert(buyerDetailPage.includes('What they’re looking for'), 'Buyer detail should include mandate notes section')
  assert(buyerDetailPage.includes('Their slate'), 'Buyer detail should include slate section')
  assert(buyerDetailPage.includes('Our contacts there'), 'Buyer detail should include contacts section')
  assert(buyerDetailPage.includes('Our projects targeting them'), 'Buyer detail should include targeted projects section')
  assert(buyerDetailPage.includes('Pending review'), 'Slate items should show pending-review state')
}

function testMcpIntegrationContracts() {
  execFileSync(process.execPath, [path.join(__dirname, 'test-mcp-contracts.js')], { stdio: 'inherit' })
  execFileSync(process.execPath, [path.join(__dirname, 'test-mcp-intake.js')], { stdio: 'inherit' })
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
run('Buyers feature contracts', testBuyersFeatureContracts)
run('Dashboard redesign contracts', testDashboardRedesignContracts)
run('Material read sync contracts', testMaterialReadSyncContracts)
run('Coverage script-link cleanup contract', testCoverageScriptLinkCleanupContract)
run('Usability filters and project search', testUsabilityFiltersAndSearch)
run('Connected project/material/coverage flows', testConnectedProjectFlows)
run('Calendar sync mapping logic', testCalendarMapper)
run('MCP integration contract wiring', testMcpIntegrationContracts)

console.log('\nAll tests passed.')
