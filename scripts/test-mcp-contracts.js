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
    'src/app/api/mcp/intake/contact/route.ts',
    'src/app/api/mcp/intake/company/route.ts',
    'src/app/api/mcp/intake/project/route.ts',
    'src/app/api/mcp/intake/material/route.ts',
    'src/app/api/mcp/intake/link-writer-agent/route.ts',
    'src/app/api/mcp/intake/submission/route.ts',
    'src/app/api/mcp/intake/unread-materials/route.ts',
    'src/app/api/mcp/intake/projects-by-age/route.ts',
    'src/app/api/mcp/crm/route.ts',
    'src/app/api/mcp/upload/route.ts',
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
  assert(server.includes('verifyStaticBearerToken'), 'MCP HTTP wrapper should preserve static bearer-token access')
  assert(server.includes('verifyMcpBearerToken'), 'MCP HTTP wrapper should accept static bearer or OAuth access tokens')
  assert(server.includes('isOAuthConfigured'), 'MCP OAuth endpoints should fail closed when OAuth config is missing')
  assert(server.includes('oauthLimited'), 'OAuth connector should expose the limited Cowork-safe tool surface')
  assert(server.includes('search_contacts'), 'MCP server should expose search_contacts')
  assert(server.includes('log_interaction'), 'MCP server should expose log_interaction')
  assert(server.includes('intake:write'), 'MCP server should support intake:write scope')
  assert(server.includes('crm:write'), 'MCP server should support broad audited crm:write scope')
  assert(server.includes('crm:delete'), 'MCP server should support audited crm:delete scope')
  assert(server.includes('intake_submission'), 'MCP server should expose atomic intake_submission tool')
  assert(server.includes('find_or_create_contact'), 'MCP server should expose find_or_create_contact')
  assert(server.includes('list_unread_materials'), 'MCP server should expose read-queue helper')
  assert(server.includes('crm_write'), 'MCP server should expose audited broad write helper')
  assert(server.includes('upload_file'), 'MCP server should expose raw file upload helper')
  assert(!server.includes('auth-token'), 'MCP server must not use CRM web-session cookie')
}

testMcpAuth()
testMcpRoutes()
testSensitiveMaterials()
testMcpServer()
console.log('✓ MCP integration contracts passed')
