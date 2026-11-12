// Runs only against the disposable loopback fixture; ephemeral auth never printed or persisted.
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/')
assert.ok(
  ['localhost', '127.0.0.1'].includes(url.hostname) &&
    url.pathname === '/hawco_agreements_dev_20261112',
  'Synthetic loopback DB only',
)
const db = new PrismaClient()
const port = 3361
const origin = 'http://127.0.0.1:' + port
const secret = randomBytes(40).toString('hex')
const mcp = randomBytes(40).toString('hex')
const owner = 'agreements-synthetic-owner'
const mildred = 'agreements-synthetic-mildred'
const roles = [
  owner,
  mildred,
  'agreements-synthetic-admin',
  'agreements-synthetic-member',
  'agreements-synthetic-other-agent',
]
const artifacts = path.resolve('../../audits/hawco-agreements-build-20261112')
fs.mkdirSync(artifacts, { recursive: true })
const log = fs.createWriteStream(path.join(artifacts, 'http-server.log'))
let server, browser
const results = []
function token(id) {
  return jwt.sign({ userId: id, email: id + '@example.invalid' }, secret, {
    expiresIn: '30m',
  })
}
function cookie(id) {
  return 'auth-token=' + token(id)
}
async function call(route, actor = owner, body, method) {
  const r = await fetch(origin + route, {
    redirect: 'manual',
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      ...(actor ? { Cookie: cookie(actor) } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: r.status, data, text, headers: r.headers }
}
function passed(name) {
  results.push(name)
  console.log('PASS ' + name)
}
async function main() {
  for (const id of roles)
    await db.user.upsert({
      where: { id },
      create: {
        id,
        email: id + '@example.invalid',
        password: 'NO_LOGIN',
        name: id,
        role: id.endsWith('admin') ? 'ADMIN' : 'MEMBER',
      },
      update: {},
    })
  server = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      process.env.AGREEMENTS_TEST_PRODUCTION === '1' ? 'start' : 'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      env: {
        ...process.env,
        JWT_SECRET: secret,
        HAWCO_MCP_TOKEN: mcp,
        HAWCO_MCP_SCOPES: 'crm:read,crm:write',
        AGREEMENTS_PHILIP_USER_ID:
          process.env.AGREEMENTS_TEST_EMPTY === '1' ? '' : owner,
        AGREEMENTS_MILDRED_USER_ID:
          process.env.AGREEMENTS_TEST_EMPTY === '1' ? '' : mildred,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  server.stdout.pipe(log)
  server.stderr.pipe(log)
  let ready = false
  for (let n = 0; n < 90; n++) {
    try {
      const r = await fetch(origin + '/login')
      if (r.ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  assert.ok(ready, 'server starts')
  const baseRow = await db.projectAgreement.findFirstOrThrow({
    where: { title: 'Synthetic Three-Period Literary Deal' },
    orderBy: { createdAt: 'desc' },
  })
  const id = baseRow.id
  const base = '/api/agreements/' + id
  if (process.env.AGREEMENTS_TEST_EMPTY === '1') {
    for (const a of roles)
      assert.equal((await call(base + '/legal', a)).status, 403)
    passed('empty principal allowlist denies everyone over HTTP')
    fs.writeFileSync(
      path.join(artifacts, 'EMPTY-ALLOWLIST-RESULT.json'),
      JSON.stringify({ passed: results }),
    )
    return
  }
  assert.equal((await call(base, 'forged-user')).status, 401)
  assert.ok([307, 401].includes((await call(base, null)).status))
  passed('unauthenticated / nonexistent user denied')
  for (const actor of roles.slice(2)) {
    assert.equal((await call(base + '/legal', actor)).status, 403)
    assert.equal(
      (await call(base + '/legal', actor, { name: 'attempt', body: 'denied' }))
        .status,
      403,
    )
  }
  assert.equal((await call(base + '/legal', owner)).status, 200)
  assert.equal((await call(base + '/legal', mildred)).status, 200)
  passed(
    'exact owner/Mildred access; ADMIN/member/other-agent direct read/write denied',
  )
  const canary = 'RESTRICTED-HTTP-CANARY-' + id
  let r = await call(base + '/legal', owner, {
    name: 'Private synthetic advice',
    body: canary,
  })
  assert.equal(r.status, 200)
  const noteId = r.data.id
  async function upload(actor, classification, content) {
    const f = new FormData()
    f.set('classification', classification)
    f.set('file', new Blob([content], { type: 'text/plain' }), 'synthetic.txt')
    f.set('source', 'Synthetic fixture message #1')
    const r = await fetch(origin + base + '/documents', {
      method: 'POST',
      headers: { Cookie: cookie(actor) },
      body: f,
    })
    return { status: r.status, data: await r.json() }
  }
  const privateDoc = await upload(owner, 'REDLINE', canary)
  assert.equal(privateDoc.status, 200)
  assert.equal((await upload(roles[2], 'MIXED', canary)).status, 403)
  assert.equal((await upload(roles[3], '', canary)).status, 400)
  const publicDoc = await upload(
    roles[3],
    'BUSINESS',
    'SYNTHETIC business copy',
  )
  assert.equal(publicDoc.status, 200)
  assert.equal(
    (
      await call(
        base + '/documents/' + privateDoc.data.id + '?restricted=1',
        owner,
      )
    ).text,
    canary,
  )
  for (const a of roles.slice(2))
    assert.equal(
      (
        await call(
          base + '/documents/' + privateDoc.data.id + '?restricted=1',
          a,
        )
      ).status,
      403,
    )
  assert.equal(
    (await call(base + '/documents/' + privateDoc.data.id, owner)).status,
    404,
  )
  assert.equal(
    (await call('/api/files/agreements/' + privateDoc.data.id, owner)).status,
    404,
  )
  assert.equal(
    (await call('/api/files/restricted/' + privateDoc.data.id, owner)).status,
    404,
  )
  assert.equal(
    (await call(base + '/documents/' + publicDoc.data.id, roles[3])).text,
    'SYNTHETIC business copy',
  )
  passed(
    'classification-before-upload, mixed/redline restricted, direct file bytes and guessed generic path enforcement',
  )
  for (const route of [
    base,
    '/api/search?q=' + encodeURIComponent(canary),
    '/api/activity',
    '/api/projects/agreements-synthetic-project',
    '/agreements',
    '/projects/agreements-synthetic-project',
    '/contacts/agreements-synthetic-contact',
    '/ip/agreements-synthetic-ip',
  ]) {
    r = await call(route, roles[3])
    assert.equal(r.status, 200, route)
    assert.ok(!r.text.includes(canary), route + ' does not leak')
    assert.ok(
      !r.text.includes(noteId),
      route + ' does not leak private metadata',
    )
  }
  r = await call(base + '/actions', roles[3], { action: 'export' })
  assert.equal(r.status, 200)
  assert.ok(!r.text.includes(canary))
  assert.ok(!r.text.includes(privateDoc.data.id))
  passed(
    'business API, HTML, search, activity, project/contact/IP and export omit restricted content/metadata',
  )
  for (const entity of [
    'agreementLegal',
    'agreementDocument',
    'agreementWorkspace',
    'agreementTemplate',
  ]) {
    const r = await fetch(origin + '/api/mcp/collaboration?entity=' + entity, {
      headers: { Authorization: 'Bearer ' + mcp },
    })
    assert.equal(r.status, 400)
    assert.ok(!(await r.text()).includes(canary))
  }
  r = await fetch(
    origin + '/api/mcp/collaboration?entity=projectAgreement&id=' + id,
    { headers: { Authorization: 'Bearer ' + mcp } },
  )
  assert.equal(r.status, 200)
  assert.ok(!(await r.text()).includes(canary))
  const restrictedMcpFile = await fetch(
    origin + '/api/mcp/materials/' + privateDoc.data.id + '/file',
    { headers: { Authorization: 'Bearer ' + mcp } },
  )
  assert.equal(restrictedMcpFile.status, 404)
  const m = await fetch(origin + base + '/legal', {
    headers: { Authorization: 'Bearer ' + mcp },
    redirect: 'manual',
  })
  assert.ok([307, 401].includes(m.status))
  passed(
    'shared MCP cannot enumerate/read new tables or impersonate browser principals',
  )
  assert.equal(
    (await call(base + '/actions', owner, { action: 'externalReminder' }))
      .status,
    503,
  )
  const current = (await call(base)).data
  assert.equal(
    (
      await call(
        base,
        owner,
        {
          classification: 'BUSINESS',
          version: current.version,
          action: 'date',
          value: {
            id: 'http-reminder-date',
            label: 'Synthetic HTTP reminder obligation',
            absolute: new Date().toISOString().slice(0, 10),
            anchorId: '',
            offset: 0,
            unit: 'DAY',
            monthEnd: 'CLAMP',
            rule: 'CALENDAR',
            timezone: 'America/Toronto',
            holidays: [],
            notice: 'Synthetic notice',
            owner: 'Synthetic owner',
            source: {
              reference: 'Synthetic HTTP evidence',
              locator: 'message 1',
            },
            reviewed: true,
          },
        },
        'PATCH',
      )
    ).status,
    200,
  )
  assert.equal(
    (await call(base + '/actions', owner, { action: 'reminders' })).status,
    200,
  )
  const reminder = await db.agreementReminder.findFirst({
    where: { agreementId: id, state: { not: 'SUPERSEDED' } },
  })
  assert.ok(reminder)
  if (reminder) {
    assert.equal(
      (
        await call(base + '/actions', owner, {
          action: 'externalReminder',
          id: reminder.id,
        })
      ).status,
      503,
    )
    assert.equal(
      (await db.agreementReminder.findUnique({ where: { id: reminder.id } }))
        .state,
      'FAILED',
    )
    assert.equal(
      (
        await call(base + '/actions', owner, {
          action: 'reminder',
          id: reminder.id,
          state: 'DELIVERED',
        })
      ).status,
      200,
    )
    assert.equal(
      (await db.agreementReminder.findUnique({ where: { id: reminder.id } }))
        .error,
      null,
    )
  }
  assert.equal(
    (
      await call(
        '/api/projects/agreements-synthetic-project/agreements/' + id,
        owner,
        undefined,
        'DELETE',
      )
    ).status,
    409,
  )
  passed(
    'unconfigured external delivery fails without fake success; legacy deletion cannot destroy workspace',
  )
  assert.equal(
    (
      await call(
        '/api/projects/agreements-synthetic-project/agreements',
        owner,
        {
          title: 'Blocked unclassified upload',
          fileUrl: '/api/files/materials/unsafe.txt',
        },
      )
    ).status,
    410,
  )
  passed(
    'legacy unclassified agreement creation is retired; generic material upload is not used by agreement workflow',
  )
  const templateVersion = 'SYNTHETIC-' + Date.now()
  const tf = new FormData()
  tf.set('classification', 'BUSINESS')
  tf.set('type', 'ASSIGNMENT')
  tf.set('versionLabel', templateVersion)
  tf.set(
    'file',
    new Blob(['SYNTHETIC TEMPLATE, NOT A REAL CONTRACT']),
    'synthetic-template.txt',
  )
  tf.set('reference', 'Synthetic template source')
  tf.set('locator', 'Version 1')
  let tr = await fetch(origin + '/api/agreements/templates', {
    method: 'POST',
    headers: { Cookie: cookie(roles[2]) },
    body: tf,
  })
  assert.equal(tr.status, 403)
  tr = await fetch(origin + '/api/agreements/templates', {
    method: 'POST',
    headers: { Cookie: cookie(owner) },
    body: tf,
  })
  assert.equal(tr.status, 200)
  let template = await tr.json()
  const createBody = {
    classification: 'BUSINESS',
    title: 'Synthetic selected template test',
    projectId: 'agreements-synthetic-project',
    type: 'ASSIGNMENT',
    templateVersion: template.id,
  }
  assert.equal((await call('/api/agreements', owner, createBody)).status, 400)
  assert.equal(
    (
      await call(
        '/api/agreements/templates',
        roles[2],
        {
          id: template.id,
          expectedVersion: template.updatedAt,
          decision: 'APPROVED',
          source: { reference: 'Synthetic review', locator: 'message 1' },
        },
        'PATCH',
      )
    ).status,
    403,
  )
  assert.equal(
    (
      await call(
        '/api/agreements/templates',
        owner,
        {
          id: template.id,
          expectedVersion: template.updatedAt,
          decision: 'APPROVED',
          source: { reference: 'Synthetic review', locator: 'message 1' },
        },
        'PATCH',
      )
    ).status,
    200,
  )
  assert.equal(
    (await call('/api/agreements', owner, { ...createBody, type: 'SHOPPING' }))
      .status,
    400,
  )
  assert.equal(
    (await call('/api/agreements/templates/' + template.id, roles[3])).status,
    200,
  )
  passed(
    'template immutable upload, principal approval, unapproved/type-mismatch denial and approved download',
  )
  const {
    chromium,
  } = require('/opt/homebrew/lib/node_modules/agent-browser/node_modules/playwright-core')
  browser = await chromium.launch({
    headless: true,
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })
  const context = await browser.newContext()
  await context.addCookies([
    { name: 'auth-token', value: token(owner), url: origin },
  ])
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(origin + '/projects/agreements-synthetic-project', {
    waitUntil: 'networkidle',
  })
  await page
    .getByRole('link', { name: 'New agreement for this project', exact: true })
    .click()
  await page.locator('select[name=projectId]').waitFor()
  assert.equal(
    await page.locator('select[name=projectId]').inputValue(),
    'agreements-synthetic-project',
  )
  passed(
    'project agreement creation links into typed/classified workspace with project prefilled',
  )
  await page.goto(origin + '/agreements', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'New deal', exact: true }).click()
  await page
    .getByLabel('Deal title', { exact: true })
    .fill('Synthetic Browser Workflow')
  await page.locator('select[name=type]').selectOption('ASSIGNMENT')
  await page.locator('select[name=templateVersion]').selectOption(template.id)
  await page
    .locator('select[name=projectId]')
    .selectOption('agreements-synthetic-project')
  await page.getByRole('button', { name: 'Create draft record' }).click()
  await page.waitForURL('**/agreements/*')
  await page.getByRole('heading', { name: 'Ownership & next action' }).waitFor()
  const browserId = page.url().split('/').at(-1)
  await page
    .getByLabel('Ball holder', { exact: true })
    .fill('Synthetic Browser Owner')
  await page
    .getByLabel('Next action', { exact: true })
    .fill('Review synthetic evidence')
  await page.getByRole('button', { name: 'Save business overview' }).click()
  await page.getByRole('status').waitFor()
  assert.equal(
    (await call('/api/agreements/' + browserId)).data.workspace.ballHolder,
    'Synthetic Browser Owner',
  )
  assert.equal(
    (await call('/api/agreements/' + browserId)).data.workspace.templateVersion,
    template.id,
  )
  passed(
    'browser creates type-selected draft with exact approved template lineage and persists overview',
  )
  template = (await call('/api/agreements/templates')).data.find(
    (t) => t.id === template.id,
  )
  assert.equal(
    (
      await call(
        '/api/agreements/templates',
        owner,
        {
          id: template.id,
          expectedVersion: template.updatedAt,
          decision: 'RETIRED',
          source: { reference: 'Synthetic retirement', locator: 'message 2' },
        },
        'PATCH',
      )
    ).status,
    200,
  )
  assert.equal((await call('/api/agreements', owner, createBody)).status, 400)
  assert.equal(
    (await call('/api/agreements/templates/' + template.id, roles[3])).status,
    200,
  )
  passed(
    'retired template cannot be newly selected; retained lineage still downloads exact bytes',
  )
  await page.getByRole('button', { name: 'Terms', exact: true }).click()
  await page.locator('select[name=field]').first().selectOption('consideration')
  await page.locator('select[name=state]').first().selectOption('ZERO')
  await page
    .getByLabel('Exact term / scope / definition (business only)', {
      exact: true,
    })
    .fill('0')
  const termForm = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Add immutable term' }) })
  await termForm
    .getByLabel('Document / thread / message reference')
    .fill('Synthetic assignment')
  await termForm.getByLabel('Page, clause or message locator').fill('Clause 4')
  await page.getByRole('button', { name: 'Add immutable term' }).click()
  await page.getByText('0', { exact: true }).first().waitFor()
  assert.equal(
    (await call('/api/agreements/' + browserId)).data.workspace.terms[0].state,
    'ZERO',
  )
  passed('browser records sourced explicit zero distinct from unknown')
  await page.getByRole('button', { name: 'Negotiation', exact: true }).click()
  const issueForm = page.locator('form').filter({
    has: page.getByRole('button', {
      name: /^(Add issue|Save issue revision)$/,
    }),
  })
  await issueForm.getByLabel('New issue').fill('Synthetic credit issue')
  await issueForm
    .getByLabel('ask', { exact: true })
    .fill('Opening title credit')
  await issueForm
    .getByLabel('Document / thread / message reference')
    .fill('Synthetic email')
  await issueForm
    .getByLabel('Page, clause or message locator')
    .fill('Message 1')
  await page.getByRole('button', { name: 'Add issue', exact: true }).click()
  await page.getByRole('button', { name: 'Update / reopen' }).click()
  await issueForm.locator('select[name=state]').selectOption('RESOLVED')
  await issueForm
    .getByLabel('outcome', { exact: true })
    .fill('Synthetic agreed credit')
  await issueForm
    .getByLabel('Document / thread / message reference')
    .fill('Synthetic email')
  await issueForm
    .getByLabel('Page, clause or message locator')
    .fill('Message 2')
  await page.getByRole('button', { name: 'Save issue revision' }).click()
  await page
    .getByText('Synthetic agreed credit', { exact: false })
    .first()
    .waitFor()
  const record = (await call('/api/agreements/' + browserId)).data
  assert.equal(record.workspace.issues[0].history.length, 2)
  passed('browser issue add/resolve retains immutable negotiation history')
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await page
    .getByRole('button', { name: 'Preview business intake', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Download reviewed preview', exact: true })
    .waitFor()
  assert.ok(
    (await page.locator('pre').innerText()).includes(
      'BUSINESS-ONLY LAWYER INTAKE',
    ),
  )
  const downloading = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Download reviewed preview', exact: true })
    .click()
  const download = await downloading
  assert.equal(download.suggestedFilename(), 'business-intake.txt')
  await download.saveAs(path.join(artifacts, 'synthetic-business-intake.txt'))
  assert.ok(
    !fs
      .readFileSync(
        path.join(artifacts, 'synthetic-business-intake.txt'),
        'utf8',
      )
      .includes(canary),
  )
  passed(
    'human-readable business-only lawyer intake preview/download works without restricted content or external send',
  )
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(origin + '/agreements', { waitUntil: 'networkidle' })
    await page.screenshot({
      path: path.join(artifacts, `agreements-hub-${width}.png`),
      fullPage: true,
    })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'hub no overflow ' + width,
    )
    await page.goto(origin + '/agreements/' + id, { waitUntil: 'networkidle' })
    for (const tab of [
      'Overview',
      'Terms',
      'Negotiation',
      'Documents',
      'Rights checks',
      'Dates & payments',
      'Legal · restricted',
    ]) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      await page.waitForTimeout(100)
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        tab + ' no overflow ' + width,
      )
    }
    await page.getByRole('button', { name: 'Overview', exact: true }).click()
    await page.screenshot({
      path: path.join(artifacts, `agreements-detail-${width}.png`),
      fullPage: true,
    })
  }
  assert.deepEqual(errors, [])
  passed(
    '1440/390/320 hub + all tabs: no horizontal overflow or runtime errors; screenshots saved',
  )
  for (const route of [
    '/projects/agreements-synthetic-project',
    '/contacts/agreements-synthetic-contact',
    '/ip/agreements-synthetic-ip',
    '/materials',
    '/union-cheat-sheet',
    '/agreements/templates',
  ]) {
    await page.goto(origin + route, { waitUntil: 'networkidle' })
    assert.ok(
      !(await page.locator('body').innerText()).includes('Application error'),
      route,
    )
  }
  passed('project/contact/IP/materials/WGC authenticated browser smoke')
  await browser.close()
  browser = null
  fs.writeFileSync(
    path.join(artifacts, 'HTTP-BROWSER-RESULTS.json'),
    JSON.stringify(
      {
        runtime:
          process.env.AGREEMENTS_TEST_PRODUCTION === '1'
            ? 'production-build'
            : 'dev',
        passed: results,
        agreementId: id,
        browserAgreementId: browserId,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
}
main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(async () => {
    if (browser) await browser.close()
    if (server) server.kill('SIGTERM')
    await db.$disconnect()
    log.end()
  })
