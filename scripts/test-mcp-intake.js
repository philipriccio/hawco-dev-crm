const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(root, rel))

function testSchema() {
  const schema = read('prisma/schema.prisma')
  assert(schema.includes('sourceContactId'), 'Project should have sourceContactId')
  assert(schema.includes('submissionThreadId'), 'Project should have submissionThreadId')
  assert(schema.includes('@relation("ProjectSourceContact"'), 'Project.sourceContact relation should be explicit')
  assert(schema.includes('Scorecard (1-10 scale per category; total out of 50)'), 'Coverage score docs should reflect 1-10 /50 scale')
}

function testRoutesUseNarrowScope() {
  const writeRoutes = [
    'src/app/api/mcp/intake/company/route.ts',
    'src/app/api/mcp/intake/contact/route.ts',
    'src/app/api/mcp/intake/project/route.ts',
    'src/app/api/mcp/intake/material/route.ts',
    'src/app/api/mcp/intake/link-writer-agent/route.ts',
    'src/app/api/mcp/intake/submission/route.ts',
  ]
  for (const route of writeRoutes) {
    assert(exists(route), `Missing ${route}`)
    assert(read(route).includes("requireMcpAuth(request, 'intake:write')"), `${route} must require intake:write`)
  }
}

function testMcpWrapperTools() {
  const server = read('mcp-server/src/server.mjs')
  for (const tool of ['find_or_create_contact', 'find_or_create_company', 'create_project', 'upload_material', 'link_writer_agent', 'intake_submission', 'list_unread_materials', 'list_projects_by_age']) {
    assert(server.includes(tool), `MCP server should expose ${tool}`)
  }
  assert(server.includes('upload_file'), 'MCP server should expose raw file-byte upload helper')
}

function testIntakeImplementationGuards() {
  const intake = read('src/lib/mcp-intake.ts')
  assert(intake.includes('connectOrCreate'), 'Genre tags should reuse/create Tag records')
  assert(intake.includes('equals: name'), 'Find/create should match by exact case-insensitive name')
  assert(intake.includes("role: 'WRITER'"), 'Intake should create writer ProjectContact rows')
  assert(intake.includes("role: 'SOURCE'"), 'Intake should create source ProjectContact rows')
  assert(intake.includes('tx.project.create'), 'Macro intake_submission should be transactional')
  assert(intake.includes('logMcpActivity'), 'Intake writes should be MCP-audited')
}

testSchema()
testRoutesUseNarrowScope()
testMcpWrapperTools()
testIntakeImplementationGuards()
console.log('✓ MCP intake contracts passed')

function testBroadAuditedAuthority() {
  const auth = read('src/lib/mcp-auth.ts')
  const crud = read('src/lib/mcp-crud.ts')
  const upload = read('src/lib/mcp-upload.ts')
  assert(auth.includes('crm:write'), 'MCP auth should include broad crm:write authority')
  assert(auth.includes('crm:delete'), 'MCP auth should include audited crm:delete authority')
  assert(crud.includes('logMcpActivity'), 'Broad CRM writes should log MCP activity')
  assert(crud.includes('deleteMcpProject'), 'Broad CRM helper should include audited deletes')
  assert(upload.includes('base64'), 'MCP upload helper should accept raw file bytes as base64')
  assert(upload.includes('logMcpActivity'), 'MCP uploads should be audited')
}

testBroadAuditedAuthority()
