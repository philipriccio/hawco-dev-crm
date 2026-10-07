// Local-only QA runner. Creates a synthetic user/session; never uses application credentials.
const fs = require('node:fs')
const crypto = require('node:crypto')
const { spawn } = require('node:child_process')
const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const qaDir = '/tmp/hawco-improvements-qa'
const qaUrl = 'postgresql://mildred@127.0.0.1:55439/hawco_qa'
async function main() {
  const env = { ...process.env }
  for (const name of fs.readdirSync('.').filter(name => name.startsWith('.env'))) {
    for (const line of fs.readFileSync(name, 'utf8').split('\n')) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=/)
      if (match) env[match[1]] = ''
    }
  }
  env.DATABASE_URL = qaUrl
  env.JWT_SECRET = crypto.randomBytes(48).toString('hex')
  env.NODE_ENV = 'development'
  const prisma = new PrismaClient({ datasources: { db: { url: qaUrl } } })
  const user = await prisma.user.upsert({ where: { email: 'qa@example.test' }, update: {}, create: { email: 'qa@example.test', name: 'QA Reviewer', password: 'not-a-login-hash', role: 'ADMIN' } })
  const token = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '6h' })
  fs.writeFileSync(qaDir + '/browser-state.json', JSON.stringify({ cookies: [{ name: 'auth-token', value: token, domain: '127.0.0.1', path: '/', expires: Date.now() / 1000 + 21600, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }), { mode: 0o600 })
  await prisma.$disconnect()
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3109', '--webpack'], { env, stdio: 'inherit' })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal))
  server.on('exit', code => process.exit(code || 0))
}
main().catch(error => { console.error('Local QA setup failed:', error.message); process.exit(1) })
