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
    '/', '/contacts', '/contacts/new', '/projects', '/projects/new', '/meetings', '/meetings/new', '/activity', '/materials', '/coverage', '/coverage/new', '/settings', '/buyers', '/whiteboard', '/ip',
  ]

  for (const route of routes) {
    const pagePath = route === '/'
      ? path.join(__dirname, '../src/app/page.tsx')
      : path.join(__dirname, '../src/app', route.slice(1), 'page.tsx')
    assert(fs.existsSync(pagePath), `Missing route page: ${route}`)
  }
}

function testIpFeatureContracts() {
  const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8')
  const sidebar = fs.readFileSync(path.join(__dirname, '../src/components/Sidebar.tsx'), 'utf8')
  const ipPage = fs.readFileSync(path.join(__dirname, '../src/app/ip/page.tsx'), 'utf8')
  const ipDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/ip/[id]/page.tsx'), 'utf8')
  const migration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/202606061430_ip_rights/migration.sql'), 'utf8')

  assert(sidebar.includes("name: 'IP'") && sidebar.includes("href: '/ip'"), 'Sidebar should expose IP nav')
  assert(!sidebar.includes("name: 'Intake Queue'"), 'Sidebar should hide Intake Queue nav')
  assert(schema.includes('model IpProperty'), 'IP rights model should exist')
  assert(schema.includes('IpRightsStatus'), 'IP rights status enum should exist')
  assert(schema.includes('model IpDocument'), 'IP document model should exist')
  assert(ipPage.includes('prisma.ipProperty.findMany'), 'IP hub should read IP records from the database')
  assert(ipPage.includes('optionExpiryDate'), 'IP hub should surface rights expiry timing')
  assert(ipDetailPage.includes('Chain of Title'), 'IP detail should include chain-of-title section')
  assert(ipDetailPage.includes('Meetings & Email Trail'), 'IP detail should include meetings and email trail section')
  assert(ipDetailPage.includes('Development Handoff'), 'IP detail should include development board handoff section')
  assert(migration.includes('Suburban Motel plays'), 'IP migration should seed Suburban Motel plays')
  assert(migration.includes('Come From Away'), 'IP migration should seed Come From Away')
  assert(migration.includes('Alpine Divorce'), 'IP migration should seed Alpine Divorce')
}

function testWriterTierContracts() {
  const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8')
  const migration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/202606061640_writer_tiers/migration.sql'), 'utf8')
  const contactsPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/page.tsx'), 'utf8')
  const contactDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/[id]/page.tsx'), 'utf8')
  const contactEditPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/[id]/edit/page.tsx'), 'utf8')
  const contactNewPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/new/page.tsx'), 'utf8')
  const contactsRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/contacts/route.ts'), 'utf8')
  const contactPatchRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/contacts/[id]/route.ts'), 'utf8')
  const dashboardPage = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8')

  assert(schema.includes('enum WriterTier'), 'WriterTier enum should exist')
  assert(schema.includes('writerTier') && !schema.includes('highPriority'), 'Contact should use writerTier instead of highPriority')
  assert(migration.includes('WANT_TO_WORK_WITH') && migration.includes('DROP COLUMN IF EXISTS "highPriority"'), 'Writer tier migration should map old priority and remove flag')
  assert(contactsPage.includes('Writers by Tier'), 'Contacts page should expose grouped writer-tier view')
  assert(contactsPage.includes('writerTier') && contactsPage.includes('writerTierLabels'), 'Contacts page should expose writer tier filters')
  assert(contactDetailPage.includes('WriterTierSelect'), 'Contact detail should support changing writer tier')
  assert(contactEditPage.includes('Writer Tier') && contactNewPage.includes('Writer Tier'), 'Writer create/edit forms should include tier')
  assert(contactsRoute.includes('writerTier') && contactPatchRoute.includes('writerTier'), 'Contacts APIs should persist and filter writer tier')
  assert(dashboardPage.includes("writerTier === 'WANT_TO_WORK_WITH'"), 'Dashboard priority scoring should use top writer tier')
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
  assert(dashboardPage.includes("type UnreadSort = 'priority' | 'newest' | 'oldest'"), 'Dashboard unread widget should support upload-date sorting')
  assert(dashboardPage.includes('Newest upload') && dashboardPage.includes('Oldest upload'), 'Dashboard unread widget should expose newest/oldest upload controls')
  assert(dashboardPage.includes('Uploaded {formatDate(material.createdAt)}'), 'Dashboard unread rows should show uploaded date')
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

function testMaterialDownloadContracts() {
  const downloadRoutePath = path.join(__dirname, '../src/app/api/materials/[id]/download/route.ts')
  assert(fs.existsSync(downloadRoutePath), 'Material files should have an authenticated download route')

  const downloadRoute = fs.readFileSync(downloadRoutePath, 'utf8')
  const storage = fs.readFileSync(path.join(__dirname, '../src/lib/file-storage.ts'), 'utf8')
  const projectDetailClient = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/ProjectDetailClient.tsx'), 'utf8')
  const coverageDetailClient = fs.readFileSync(path.join(__dirname, '../src/app/coverage/[id]/CoverageDetailClient.tsx'), 'utf8')
  const materialsPage = fs.readFileSync(path.join(__dirname, '../src/app/materials/page.tsx'), 'utf8')
  const contactMaterials = fs.readFileSync(path.join(__dirname, '../src/components/ContactMaterials.tsx'), 'utf8')
  const contactDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/contacts/[id]/page.tsx'), 'utf8')

  assert(downloadRoute.includes('requireApiAuth'), 'Material download route must require CRM auth')
  assert(downloadRoute.includes('getUploadedFileAccessUrl'), 'Material download route should issue an access URL')
  assert(storage.includes('@aws-sdk/s3-request-presigner'), 'Spaces objects should be opened through signed URLs')
  assert(storage.includes('GetObjectCommand'), 'Spaces access should sign GetObject requests')
  assert(projectDetailClient.includes('/api/materials/${material.id}/download'), 'Project detail material links should use the authenticated download route')
  assert(coverageDetailClient.includes('/api/materials/${coverage.script.id}/download'), 'Coverage script links should use the authenticated download route')
  assert(materialsPage.includes('/api/materials/${material.id}/download'), 'Materials list view links should use the authenticated download route')
  assert(contactMaterials.includes('/api/materials/${material.id}/download'), 'Contact material component links should use the authenticated download route')
  assert(contactDetailPage.includes('/api/materials/${material.id}/download'), 'Contact detail material links should use the authenticated download route')
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
  const newProjectPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/new/page.tsx'), 'utf8')
  assert(newProjectPage.includes('selectedWriterIds'), 'New Project should support selecting multiple writers')
  assert(newProjectPage.includes('writerIds: selectedWriterIds'), 'New Project should submit all selected writer ids')

  const projectsRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/projects/route.ts'), 'utf8')
  assert(projectsRoute.includes('writerIds') && projectsRoute.includes("role: 'WRITER'"), 'Projects API should create writer project-contact links')
  assert(!projectsRoute.includes("where: { role: 'WRITER' },\n          take: 1"), 'Projects API should not limit writer contacts to one')

  const projectsPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/page.tsx'), 'utf8')
  assert(projectsPage.includes("project.contacts.map((pc) => pc.contact.name).join(', ')"), 'Projects list should display multiple writer names')

  const addMaterialPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/materials/add/page.tsx'), 'utf8')
  assert(addMaterialPage.includes("fetch('/api/upload'"), 'Project Add Material upload tab should use the upload API')
  assert(addMaterialPage.includes('type="file"'), 'Project Add Material upload tab should expose a real file input')

  const whiteboardAdd = fs.readFileSync(path.join(__dirname, '../src/app/whiteboard/AddProjectButton.tsx'), 'utf8')
  const whiteboardClient = fs.readFileSync(path.join(__dirname, '../src/app/whiteboard/WhiteboardClient.tsx'), 'utf8')
  const whiteboardPage = fs.readFileSync(path.join(__dirname, '../src/app/whiteboard/page.tsx'), 'utf8')
  const projectDetail = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/ProjectDetailClient.tsx'), 'utf8')
  const projectContactAdd = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/contacts/add/page.tsx'), 'utf8')
  const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8')
  assert(schema.includes('CONSIDERED_WRITER'), 'ProjectContactRole should support writers being considered')
  assert(projectDetail.includes('Writers being Considered'), 'Project detail should show writers being considered separately')
  assert(projectContactAdd.includes('CONSIDERED_WRITER'), 'Project contact add form should allow writers being considered')
  assert(schema.includes('EARLY_DEVELOPMENT'), 'ProjectStatus should include Early Development')
  assert(schema.includes('DEVELOPING_WITH_NETWORK'), 'ProjectStatus should include Developing with Network')
  assert(whiteboardPage.includes("'EARLY_DEVELOPMENT'"), 'Development Board should query Early Development projects')
  assert(whiteboardPage.includes("'DEVELOPING_WITH_NETWORK'"), 'Development Board should query Developing with Network projects')
  assert(whiteboardClient.includes('collapsedSections'), 'Development Board sections should be collapsible')
  assert(whiteboardClient.includes('Early Development'), 'Development Board should render Early Development section')
  assert(whiteboardClient.includes('Developing with Network'), 'Development Board should render Developing with Network section')
  assert(whiteboardAdd.includes('Array.isArray(data)'), 'Whiteboard Add from Submissions should handle bare array API responses')
  assert(whiteboardAdd.includes('Add existing project'), 'Whiteboard should add existing CRM projects only')
  assert(!whiteboardAdd.includes('href="/projects/new"'), 'Whiteboard must not link to new project creation')
  assert(whiteboardAdd.includes('excludeStatuses'), 'Whiteboard picker should exclude projects already on the board')
  assert(whiteboardAdd.includes('EARLY_DEVELOPMENT'), 'Whiteboard picker should allow placing projects in Early Development')
  assert(whiteboardAdd.includes('DEVELOPING_WITH_NETWORK'), 'Whiteboard picker should allow placing projects in Developing with Network')
  assert(whiteboardAdd.includes('dateReceived'), 'Whiteboard picker should show received date metadata')

  assert(projectsRoute.includes('excludeStatuses'), 'Projects API should support excluding board statuses for existing-project picker')
  assert(projectsRoute.includes("order === 'recentReceived'"), 'Projects API should support received-date sorting for board picker')

  const coverageNew = fs.readFileSync(path.join(__dirname, '../src/app/coverage/new/page.tsx'), 'utf8')
  assert(coverageNew.includes('new URLSearchParams(window.location.search)'), 'New Coverage should read project/material query params')
  assert(coverageNew.includes('scriptId: prefillScriptId'), 'New Coverage should persist prefilled script id')

  const projectDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/page.tsx'), 'utf8')
  assert(projectDetailPage.includes('coverages: {'), 'Project detail should fetch directly linked coverages')
  assert(projectDetailPage.includes('...(project?.coverages.map'), 'Project detail should exclude directly linked coverages from link dropdown')

  const projectDetailClient = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/ProjectDetailClient.tsx'), 'utf8')
  assert(projectDetailClient.includes('directCoverages'), 'Project detail should display directly linked coverages')
  assert(projectDetailClient.includes('RepeatableTextItems'), 'Project detail should render saved repeatable items for next actions and notes')
  assert(projectDetailClient.includes('Add Next Action'), 'Project detail should support adding another next action below saved actions')
  assert(projectDetailClient.includes('Add Note'), 'Project detail should support adding another note below saved notes')
  assert(projectDetailClient.includes("deleteSingleTextField('logline')"), 'Project detail should allow deleting the single logline field')
  assert(projectDetailClient.includes("deleteSingleTextField('synopsis')"), 'Project detail should allow deleting the single synopsis field')
  assert(projectDetailClient.includes('Save Synopsis'), 'Project detail should allow synopsis edits from the detail page')
  assert(projectDetailClient.includes('toast.error'), 'Project detail save buttons should show visible failure feedback')

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
  const buyerDetailServerPage = fs.readFileSync(path.join(__dirname, '../src/app/buyers/[id]/page.tsx'), 'utf8')
  const projectsPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/page.tsx'), 'utf8')
  const projectDetailPage = fs.readFileSync(path.join(__dirname, '../src/app/projects/[id]/ProjectDetailClient.tsx'), 'utf8')
  const projectApiRoute = fs.readFileSync(path.join(__dirname, '../src/app/api/projects/[id]/route.ts'), 'utf8')
  const targetBuyerHelpers = fs.readFileSync(path.join(__dirname, '../src/lib/target-buyers.ts'), 'utf8')
  const migration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/202605212215_buyers_feature/migration.sql'), 'utf8')

  assert(sidebar.includes("name: 'Buyers'") && sidebar.includes("href: '/buyers'"), 'Sidebar should expose Buyers nav')
  assert(schema.includes('isBuyer') && schema.includes('model BuyerSlateItem'), 'Company-backed buyers and slate model should exist')
  assert(schema.includes('BuyerSlateStatus'), 'Slate status enum should exist')
  assert(schema.includes('model BuyerSlateContact'), 'Slate-contact link model should exist')
  assert(migration.includes('Disney+ Canada'), 'Migration should create/flag Disney+ Canada buyer')
  assert(migration.includes('TARGET_BUYER'), 'Migration should backfill target buyer project links')
  assert(buyersPage.includes('Research docs'), 'Buyers area should preserve access to research documents')
  assert(buyersPage.includes('/api/research/documents/${doc.id}/download'), 'Buyer research docs should use authenticated download links')
  assert(!buyersPage.includes('href={doc.fileUrl}'), 'Buyer research docs must not link directly to private storage URLs')
  assert(buyersPage.includes("doc.fileUrl.startsWith('/uploads/')"), 'Buyer research docs should flag legacy local uploads instead of linking to missing files')
  assert(buyersPage.includes('Needs re-upload'), 'Buyer research docs should label missing legacy files clearly')
  const researchDownloadRoutePath = path.join(__dirname, '../src/app/api/research/documents/[id]/download/route.ts')
  assert(fs.existsSync(researchDownloadRoutePath), 'Research documents should have an authenticated download route')
  const researchDownloadRoute = fs.readFileSync(researchDownloadRoutePath, 'utf8')
  assert(researchDownloadRoute.includes('requireApiAuth'), 'Research document downloads must require CRM auth')
  assert(researchDownloadRoute.includes('getUploadedFileAccessUrl'), 'Research document downloads should issue signed access URLs')
  assert(researchDownloadRoute.includes('new URL(accessUrl, baseUrl)'), 'Research document downloads should redirect relative local upload paths safely')
  assert(researchDownloadRoute.includes('x-forwarded-host'), 'Research document downloads should preserve the public host behind the proxy')
  assert(buyerDetailPage.includes('What they’re looking for'), 'Buyer detail should include mandate notes section')
  assert(buyerDetailPage.includes('Their slate'), 'Buyer detail should include slate section')
  assert(buyerDetailPage.includes('Our contacts there'), 'Buyer detail should include contacts section')
  assert(buyerDetailPage.includes('Our projects targeting them'), 'Buyer detail should include targeted projects section')
  assert(targetBuyerHelpers.includes('TARGET_BUYER_DEVELOPING'), 'Target buyer links should support a Developing it label')
  assert(targetBuyerHelpers.includes('TARGET_BUYER_GREENLIGHT_TARGET'), 'Target buyer links should support a Greenlight target label')
  assert(projectDetailPage.includes('targetBuyerLinks'), 'Project detail should save labeled target buyer links')
  assert(projectDetailPage.includes('space-y-1') && projectDetailPage.includes('block w-full rounded-md'), 'Project detail should stack target buyer label below the buyer name')
  assert(projectApiRoute.includes('targetBuyerLinks'), 'Project API should accept labeled target buyer links')
  assert(buyerDetailServerPage.includes("startsWith: 'TARGET_BUYER'"), 'Buyer detail should include all target-buyer role labels')
  assert(buyersPage.includes("startsWith: 'TARGET_BUYER'"), 'Buyer cards should count all target-buyer role labels')
  assert(projectsPage.includes('targetBuyerRoleLabel'), 'Projects list should show clickable labeled target buyer links')
  assert(buyerDetailPage.includes('Pending review'), 'Slate items should show pending-review state')
  assert(buyerDetailPage.includes('Contacts on this show'), 'Slate items should show contacts attached to a buyer show')
  assert(buyerDetailPage.includes('/slate/${item.id}/contacts'), 'Buyer slate should support attaching contacts to shows')
  assert(fs.existsSync(path.join(__dirname, '../scripts/seed-buyer-slate-phase-1.ts')), 'Buyer slate seed script should exist')
  const slateSeed = fs.readFileSync(path.join(__dirname, '../scripts/seed-buyer-slate-phase-1.ts'), 'utf8')
  assert(slateSeed.includes('I’m Not Here to Hurt You'), 'Buyer slate seed should include newer Bell/Crave news')
  assert(slateSeed.includes('Rogers Sports & Media'), 'Buyer slate seed should include Rogers Sports & Media as a buyer')
  assert(slateSeed.includes('Law & Order Toronto: Criminal Intent S4'), 'Buyer slate seed should include newer Rogers/Citytv news')
  assert(slateSeed.includes('Committed'), 'Buyer slate seed should include newer CBC greenlight news')
  assert(slateSeed.includes('CBC documentary investment + FAST channel'), 'Buyer slate seed should include fresh CBC mandate intelligence, not only returning shows')
  assert(slateSeed.includes('Saint-Pierre S2') && slateSeed.includes('old news to Hawco'), 'Buyer slate seed should explicitly prune known Hawco returning-season old news')
  assert(slateSeed.includes('Home Town Takeover Canada'), 'Buyer slate seed should include current Rogers unscripted buyer intelligence')
  assert(slateSeed.includes('staleSeededTitles'), 'Buyer slate seed should remove weak stale first-pass items')
  assert(fs.existsSync(path.join(__dirname, '../src/app/api/buyers/[id]/slate/[itemId]/contacts/route.ts')), 'Slate-contact attachment API should exist')
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
run('IP rights feature contracts', testIpFeatureContracts)
run('Writer tier contracts', testWriterTierContracts)
run('Buyers feature contracts', testBuyersFeatureContracts)
run('Dashboard redesign contracts', testDashboardRedesignContracts)
run('Material read sync contracts', testMaterialReadSyncContracts)
run('Material download access contracts', testMaterialDownloadContracts)
run('Coverage script-link cleanup contract', testCoverageScriptLinkCleanupContract)
run('Usability filters and project search', testUsabilityFiltersAndSearch)
run('Connected project/material/coverage flows', testConnectedProjectFlows)
run('Calendar sync mapping logic', testCalendarMapper)
run('MCP integration contract wiring', testMcpIntegrationContracts)

console.log('\nAll tests passed.')
