// Synthetic-only parent QA preview; credentials stay ephemeral in this process/browser.
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const {
  chromium,
} = require('/opt/homebrew/lib/node_modules/agent-browser/node_modules/playwright-core')
const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/')
assert.ok(
  ['localhost', '127.0.0.1'].includes(url.hostname) &&
    url.pathname === '/hawco_agreements_dev_20261112',
  'Synthetic loopback database only',
)
const db = new PrismaClient()
const secret = randomBytes(48).toString('hex')
const origin = 'http://127.0.0.1:3361'
const principal = 'agreements-synthetic-owner'
let server, browser
async function stop() {
  if (browser) await browser.close()
  if (server) server.kill('SIGTERM')
  await db.$disconnect()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
;(async () => {
  assert.ok(
    await db.user.findUnique({ where: { id: principal } }),
    'Run synthetic DB tests to seed preview fixtures first',
  )
  server = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3361',
    ],
    {
      env: {
        ...process.env,
        JWT_SECRET: secret,
        AGREEMENTS_PHILIP_USER_ID: principal,
        AGREEMENTS_MILDRED_USER_ID: 'agreements-synthetic-mildred',
      },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  let ready = false
  for (let n = 0; n < 60; n++) {
    try {
      if ((await fetch(origin + '/login')).ok) {
        ready = true
        break
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  assert.ok(ready, 'Preview server unavailable')
  browser = await chromium.launch({
    headless: !process.argv.includes('--headed'),
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=3362',
    ],
  })
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: 'auth-token',
      value: jwt.sign(
        { userId: principal, email: 'agreements-owner@example.invalid' },
        secret,
        { expiresIn: '2h' },
      ),
      url: origin,
    },
  ])
  const page = await context.newPage()
  await page.goto(origin + '/agreements', { waitUntil: 'networkidle' })
  console.log('Synthetic authenticated preview: ' + origin + '/agreements')
  console.log(
    'QA browser CDP: http://127.0.0.1:3362 (synthetic owner only). Stop this process to close preview.',
  )
})().catch(async (e) => {
  console.error(e.message)
  await stop()
})
