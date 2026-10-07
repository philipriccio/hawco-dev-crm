const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { NextRequest, NextResponse } = require('next/server')
function load(file, mocks) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', js)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
async function main() {
  const calls = []
  const prisma = Object.fromEntries(['project', 'contact', 'material'].map(name => [name, { findMany: async args => { calls.push({ name, args }); return [{ id: name }] } }]))
  const search = load('src/lib/global-search.ts', { '@/lib/db': { prisma } })
  assert.throws(() => search.validateSearchQuery(' '))
  assert.throws(() => search.validateSearchQuery('a'))
  assert.throws(() => search.validateSearchQuery('a'.repeat(121)))
  assert.equal(search.validateSearchQuery('  Legacy  '), 'Legacy')
  assert.deepEqual(await search.globalSearch('Legacy'), { projects: [{ id: 'project' }], contacts: [{ id: 'contact' }], materials: [{ id: 'material' }] })
  assert.equal(calls.length, 3)
  for (const { args } of calls) {
    assert.equal(args.take, 20)
    assert.equal(JSON.stringify(args.where).includes('Legacy'), true)
    assert.equal(args.select.fileUrl, undefined)
    assert.equal(args.select.notes, undefined)
  }
  let authenticated = false, fail = false, searched = 0
  const route = load('src/app/api/search/route.ts', {
    '@/lib/api-auth': {
      requireApiAuth: async () => authenticated ? { id: 'reader' } : NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      isAuthResponse: value => value instanceof NextResponse,
    },
    '@/lib/global-search': { ...search, globalSearch: async query => { searched++; if (fail) throw new Error('private DB detail'); return { query } } },
  })
  const request = query => new NextRequest('http://localhost/api/search?q=' + encodeURIComponent(query))
  assert.equal((await route.GET(request('Legacy'))).status, 401)
  assert.equal(searched, 0)
  authenticated = true
  assert.equal((await route.GET(request('a'))).status, 400)
  assert.equal(searched, 0)
  const ok = await route.GET(request('Legacy'))
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('Cache-Control'), 'private, no-store')
  fail = true
  const error = await route.GET(request('Legacy'))
  assert.equal(error.status, 500)
  assert.equal((await error.text()).includes('private DB detail'), false)
  console.log('✓ Global search bounds, grouped query, auth-before-read, no-store and failure response')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
