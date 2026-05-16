const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8') }
function exists(rel) { return fs.existsSync(path.join(root, rel)) }

function testMcpAuth() {
  const auth = read('src/lib/mcp-auth.ts')
  assert(auth.includes('HAWCO_MCP_TOKEN_SHA256'), 'MCP auth should support hashed service tokens')
  assert(auth.includes('crypto.timingSafeEqual'), 'MCP auth should use timing-safe comparison')
  assert(auth.includes('authorization'), 'MCP auth should read Authorization bearer tokens')
  assert(!auth.includes('auth-token'), 'MCP auth must not use human web-session cookie')
}

function testMcpRoutes() {
  const routes = [
    'src/app/api/mcp/health/route.ts',
    'src/app/api/mcp/contacts/route.ts',
    'src/app/api/mcp/contacts/[id]/route.ts',
    'src/app/api/mcp/projects/route.ts',
    'src/app/api/mcp/projects/[id]/route.ts',
    'src/app/api/mcp/projects/[id]/materials/route.ts',
    'src/app/api/mcp/projects/[id]/coverage/route.ts',
    'src/app/api/mcp/coverage/route.ts',
    'src/app/api/mcp/follow-ups/route.ts',
    'src/app/api/mcp/writer-signals/route.ts',
    'src/app/api/mcp/interactions/route.ts',
  ]
  for (const route of routes) {
    assert(exists(route), `Missing MCP route ${route}`)
    assert(read(route).includes('requireMcpAuth'), `${route} should require MCP auth`)
  }
}

function testSensitiveMaterials() {
  const materials = read('src/app/api/mcp/projects/[id]/materials/route.ts')
  assert(!materials.includes('fileUrl: true'), 'MCP materials metadata must not expose raw fileUrl')
}

function testMcpServer() {
  const server = read('mcp-server/src/server.mjs')
  assert(server.includes('@modelcontextprotocol/sdk'), 'MCP server should use MCP SDK')
  assert(server.includes('HAWCO_MCP_TOKEN'), 'MCP server should require service token')
  assert(server.includes('search_contacts'), 'MCP server should expose search_contacts')
  assert(server.includes('log_interaction'), 'MCP server should expose log_interaction')
  assert(!server.includes('auth-token'), 'MCP server must not use CRM web-session cookie')
}

testMcpAuth()
testMcpRoutes()
testSensitiveMaterials()
testMcpServer()
console.log('✓ MCP integration contracts passed')
