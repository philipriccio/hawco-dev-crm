#!/usr/bin/env node
import http from 'node:http'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'

const CRM_BASE_URL = (process.env.HAWCO_CRM_BASE_URL || 'https://hawco.companytheatre.ca').replace(/\/$/, '')
const TOKEN = process.env.HAWCO_MCP_TOKEN
const PORT = Number(process.env.PORT || process.env.MCP_PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
const PUBLIC_ORIGIN = process.env.MCP_PUBLIC_ORIGIN || 'https://mcp.hawco.companytheatre.ca'
const HTTP_PATH = process.env.MCP_HTTP_PATH || '/mcp'
const OAUTH_APPROVAL_CODE = process.env.MCP_OAUTH_APPROVAL_CODE
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const OAUTH_DATA_DIR = process.env.MCP_OAUTH_DATA_DIR || (IS_PRODUCTION ? '' : '/tmp/hawco-mcp-oauth')
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.MCP_ACCESS_TOKEN_TTL_SECONDS || 60 * 60 * 8)
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.MCP_REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 30)
const SUPPORTED_SCOPES = ['crm:read', 'crm:write', 'crm:delete', 'followups:write', 'meetings:write', 'signals:write', 'intake:write']
const CLAUDE_CALLBACK_URL = 'https://claude.ai/api/mcp/auth_callback'

const args = new Set(process.argv.slice(2))

if (args.has('--check')) {
  console.log('hawco-crm-mcp-server: syntax ok')
  process.exit(0)
}

if (!TOKEN) {
  console.error('HAWCO_MCP_TOKEN is required')
  process.exit(1)
}


function sha256Base64Url(value) {
  return createHash('sha256').update(value).digest('base64url')
}

function secretToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function oauthIssuer() {
  return PUBLIC_ORIGIN.replace(/\/$/, '')
}

function mcpResourceUrl() {
  return `${oauthIssuer()}${HTTP_PATH}`
}

function isOAuthConfigured() {
  return Boolean(OAUTH_APPROVAL_CODE && OAUTH_DATA_DIR)
}

function oauthMetadata() {
  const issuer = oauthIssuer()
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: SUPPORTED_SCOPES,
  }
}

function protectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [oauthIssuer()],
    scopes_supported: SUPPORTED_SCOPES,
    bearer_methods_supported: ['header'],
    resource_name: 'Hawco CRM MCP',
  }
}

function ensureOauthStore() {
  mkdirSync(OAUTH_DATA_DIR, { recursive: true })
  const path = join(OAUTH_DATA_DIR, 'oauth-store.json')
  if (!existsSync(path)) writeFileSync(path, JSON.stringify({ clients: {}, codes: {}, tokens: {}, refreshTokens: {} }, null, 2))
  return path
}

function readOauthStore() {
  try {
    return JSON.parse(readFileSync(ensureOauthStore(), 'utf8'))
  } catch {
    return { clients: {}, codes: {}, tokens: {}, refreshTokens: {} }
  }
}

function writeOauthStore(store) {
  mkdirSync(OAUTH_DATA_DIR, { recursive: true })
  writeFileSync(join(OAUTH_DATA_DIR, 'oauth-store.json'), JSON.stringify(store, null, 2))
}

function cleanupOauthStore(store) {
  const now = nowSeconds()
  for (const [code, data] of Object.entries(store.codes || {})) if ((data.expiresAt || 0) < now) delete store.codes[code]
  for (const [token, data] of Object.entries(store.tokens || {})) if ((data.expiresAt || 0) < now) delete store.tokens[token]
  for (const [token, data] of Object.entries(store.refreshTokens || {})) if ((data.expiresAt || 0) < now) delete store.refreshTokens[token]
}

async function readRequestBody(req, limitBytes = 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limitBytes) throw new Error('request_body_too_large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function readJsonBody(req) {
  const raw = await readRequestBody(req)
  return raw ? JSON.parse(raw) : {}
}

async function readFormBody(req) {
  const raw = await readRequestBody(req)
  const body = Object.fromEntries(new URLSearchParams(raw))
  if (body.approval_code) body.approval_code = String(body.approval_code).trim()
  return body
}

function parseBasicClient(req) {
  const header = req.headers.authorization || ''
  const value = Array.isArray(header) ? header[0] : header
  const match = /^Basic\s+(.+)$/i.exec(value || '')
  if (!match) return {}
  const decoded = Buffer.from(match[1], 'base64').toString('utf8')
  const index = decoded.indexOf(':')
  if (index < 0) return {}
  return { client_id: decodeURIComponent(decoded.slice(0, index)), client_secret: decodeURIComponent(decoded.slice(index + 1)) }
}

function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[ch]))
}

function writeHtml(res, status, html) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  res.end(html)
}

function writeOAuthError(res, status, error, description) {
  writeJson(res, status, { error, error_description: description })
}

function writeOAuthNotConfigured(res) {
  writeOAuthError(res, 503, 'server_error', 'OAuth is not configured for this Hawco CRM MCP server.')
}

function redirectWithParams(res, redirectUri, params) {
  const target = new URL(redirectUri)
  for (const [key, value] of Object.entries(params)) if (value !== undefined) target.searchParams.set(key, String(value))
  res.writeHead(302, { location: target.toString(), 'cache-control': 'no-store' })
  res.end()
}

function validateRedirectUri(uri, client) {
  if (!uri) return false
  if (uri === CLAUDE_CALLBACK_URL) return true
  return Array.isArray(client.redirect_uris) && client.redirect_uris.includes(uri)
}

function normalizeScopes(scope) {
  const requested = String(scope || '').split(/\s+/).filter(Boolean)
  const allowed = requested.filter(s => SUPPORTED_SCOPES.includes(s))
  return allowed.length ? allowed : ['crm:read']
}

async function handleOAuthRegister(req, res) {
  if (!isOAuthConfigured()) return writeOAuthNotConfigured(res)
  if (req.method !== 'POST') return writeOAuthError(res, 405, 'invalid_request', 'POST required')
  let body
  try { body = await readJsonBody(req) } catch { return writeOAuthError(res, 400, 'invalid_client_metadata', 'Invalid JSON body') }
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter(Boolean) : []
  if (!redirectUris.includes(CLAUDE_CALLBACK_URL)) redirectUris.push(CLAUDE_CALLBACK_URL)
  const clientId = `hawco_${randomUUID()}`
  const clientSecret = secretToken(32)
  const issuedAt = nowSeconds()
  const store = readOauthStore()
  cleanupOauthStore(store)
  store.clients[clientId] = {
    ...body,
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: issuedAt,
    client_secret_expires_at: 0,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: body.token_endpoint_auth_method || 'client_secret_post',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: SUPPORTED_SCOPES.join(' '),
  }
  writeOauthStore(store)
  writeJson(res, 201, store.clients[clientId])
}

async function handleOAuthAuthorize(req, res, url) {
  if (!isOAuthConfigured()) return writeOAuthNotConfigured(res)
  const query = req.method === 'POST' ? await readFormBody(req) : Object.fromEntries(url.searchParams.entries())
  const store = readOauthStore()
  const client = store.clients?.[query.client_id]
  if (!client) return writeOAuthError(res, 400, 'invalid_client', 'Unknown client_id')
  if (query.response_type !== 'code') return redirectWithParams(res, query.redirect_uri || client.redirect_uris?.[0], { error: 'unsupported_response_type', state: query.state })
  if (!validateRedirectUri(query.redirect_uri, client)) return writeOAuthError(res, 400, 'invalid_request', 'Unregistered redirect_uri')
  if (query.code_challenge_method !== 'S256' || !query.code_challenge) return redirectWithParams(res, query.redirect_uri, { error: 'invalid_request', error_description: 'S256 PKCE is required', state: query.state })

  if (req.method !== 'POST' || !query.approval_code) {
    const hidden = ['response_type', 'client_id', 'redirect_uri', 'scope', 'state', 'code_challenge', 'code_challenge_method', 'resource']
      .map(k => `<input type="hidden" name="${k}" value="${htmlEscape(query[k])}">`).join('\n')
    return writeHtml(res, 200, `<!doctype html><html><head><title>Authorize Hawco CRM MCP</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 20px;"><h1>Authorize Hawco CRM MCP</h1><p><strong>Client:</strong> ${htmlEscape(client.client_name || client.client_id)}</p><p>This grants Cowork limited access to Hawco CRM tools: contacts/projects lookup, follow-ups, meetings/interactions, writer signals, and script-intake writes, and broader audited CRM writes when requested.</p><p>Enter the one-time approval code Mildred provides for Philip. Do not approve this request unless Philip initiated it.</p><form method="post" action="/authorize">${hidden}<label>Approval code<br><input name="approval_code" type="password" autocomplete="one-time-code" style="font-size: 18px; padding: 8px; width: 100%; max-width: 420px;"></label><p><button type="submit" style="font-size: 18px; padding: 10px 16px;">Authorize</button></p></form></body></html>`)
  }

  if (!OAUTH_APPROVAL_CODE || !safeEqual(String(query.approval_code || '').trim(), OAUTH_APPROVAL_CODE)) {
    return writeHtml(res, 403, '<!doctype html><h1>Authorization denied</h1><p>Invalid approval code.</p>')
  }

  const code = secretToken(32)
  cleanupOauthStore(store)
  store.codes[code] = {
    clientId: client.client_id,
    redirectUri: query.redirect_uri,
    codeChallenge: query.code_challenge,
    scopes: normalizeScopes(query.scope),
    resource: query.resource || mcpResourceUrl(),
    expiresAt: nowSeconds() + 600,
  }
  writeOauthStore(store)
  redirectWithParams(res, query.redirect_uri, { code, state: query.state })
}

async function handleOAuthToken(req, res) {
  if (!isOAuthConfigured()) return writeOAuthNotConfigured(res)
  if (req.method !== 'POST') return writeOAuthError(res, 405, 'invalid_request', 'POST required')
  const basic = parseBasicClient(req)
  const body = await readFormBody(req)
  const clientId = body.client_id || basic.client_id
  const clientSecret = body.client_secret || basic.client_secret
  const store = readOauthStore()
  cleanupOauthStore(store)
  const client = store.clients?.[clientId]
  if (!client || !safeEqual(client.client_secret, clientSecret)) return writeOAuthError(res, 401, 'invalid_client', 'Invalid client credentials')

  if (body.grant_type === 'authorization_code') {
    const codeData = store.codes?.[body.code]
    if (!codeData || codeData.clientId !== clientId) return writeOAuthError(res, 400, 'invalid_grant', 'Invalid authorization code')
    if (body.redirect_uri && body.redirect_uri !== codeData.redirectUri) return writeOAuthError(res, 400, 'invalid_grant', 'redirect_uri mismatch')
    if (sha256Base64Url(body.code_verifier || '') !== codeData.codeChallenge) return writeOAuthError(res, 400, 'invalid_grant', 'PKCE verification failed')
    delete store.codes[body.code]
    const accessToken = secretToken(32)
    const refreshToken = secretToken(32)
    const scopes = codeData.scopes || ['crm:read']
    store.tokens[accessToken] = { clientId, scopes, resource: codeData.resource, expiresAt: nowSeconds() + ACCESS_TOKEN_TTL_SECONDS }
    store.refreshTokens[refreshToken] = { clientId, scopes, resource: codeData.resource, expiresAt: nowSeconds() + REFRESH_TOKEN_TTL_SECONDS }
    writeOauthStore(store)
    return writeJson(res, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL_SECONDS, refresh_token: refreshToken, scope: scopes.join(' ') })
  }

  if (body.grant_type === 'refresh_token') {
    const refreshData = store.refreshTokens?.[body.refresh_token]
    if (!refreshData || refreshData.clientId !== clientId) return writeOAuthError(res, 400, 'invalid_grant', 'Invalid refresh token')
    const scopes = normalizeScopes(body.scope || refreshData.scopes?.join(' '))
    const accessToken = secretToken(32)
    store.tokens[accessToken] = { clientId, scopes, resource: refreshData.resource, expiresAt: nowSeconds() + ACCESS_TOKEN_TTL_SECONDS }
    writeOauthStore(store)
    return writeJson(res, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL_SECONDS, scope: scopes.join(' ') })
  }

  return writeOAuthError(res, 400, 'unsupported_grant_type', 'Unsupported grant_type')
}

function verifyOAuthAccessToken(token) {
  if (!isOAuthConfigured()) return false
  if (!token) return false
  const store = readOauthStore()
  cleanupOauthStore(store)
  const tokenData = store.tokens?.[token]
  if (!tokenData || tokenData.expiresAt < nowSeconds()) {
    writeOauthStore(store)
    return false
  }
  return tokenData
}

function verifyStaticBearerToken(token) {
  return Boolean(token && TOKEN && safeEqual(token, TOKEN))
}

function verifyMcpBearerToken(token) {
  if (verifyStaticBearerToken(token)) return { auth: 'static_bearer' }
  const oauthToken = verifyOAuthAccessToken(token)
  return oauthToken ? { auth: 'oauth', scopes: oauthToken.scopes } : null
}

function unauthorizedMcp(res) {
  const headers = { 'content-type': 'application/json; charset=utf-8' }
  if (isOAuthConfigured()) {
    headers['www-authenticate'] = `Bearer resource_metadata="${oauthIssuer()}/.well-known/oauth-protected-resource", scope="${SUPPORTED_SCOPES.join(' ')}"`
  }
  res.writeHead(401, headers)
  res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
}

function bearerFrom(req) {
  const header = req.headers.authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(Array.isArray(header) ? header[0] : header)
  return match?.[1]?.trim()
}

async function crm(path, { method = 'GET', query, body } = {}) {
  const url = new URL(`${CRM_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let parsed
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = { raw: text }
  }

  if (!response.ok || parsed?.ok === false) {
    const message = parsed?.error?.message || response.statusText || 'CRM request failed'
    throw new Error(`${response.status} ${message}`)
  }

  return parsed?.data ?? parsed
}

function jsonContent(data) {
  return [{ type: 'text', text: JSON.stringify(data, null, 2) }]
}

function createServer({ oauthLimited = false } = {}) {
  const server = new McpServer({ name: 'hawco-crm', version: '0.1.0' })

  server.tool('hawco_health', 'Check Hawco CRM MCP API health.', {}, async () => ({ content: jsonContent(await crm('/api/mcp/health')) }))

  server.tool(
    'search_contacts',
    'Search Hawco CRM contacts by name, email, company, notes, genre, or voice.',
    { query: z.string().optional(), type: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
    async (args) => ({ content: jsonContent(await crm('/api/mcp/contacts', { query: args })) })
  )

  server.tool(
    'get_contact',
    'Get a Hawco CRM contact with related projects, follow-ups, and writer signals.',
    { contactId: z.string() },
    async ({ contactId }) => ({ content: jsonContent(await crm(`/api/mcp/contacts/${encodeURIComponent(contactId)}`)) })
  )

  server.tool(
    'search_projects',
    'Search Hawco CRM projects by title, logline, synopsis, genre, notes, or contact name.',
    { query: z.string().optional(), status: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
    async (args) => ({ content: jsonContent(await crm('/api/mcp/projects', { query: args })) })
  )

  server.tool(
    'get_project',
    'Get a Hawco CRM project with contacts, companies, buyers, materials metadata, coverage, rewrite cycles, and tags.',
    { projectId: z.string() },
    async ({ projectId }) => ({ content: jsonContent(await crm(`/api/mcp/projects/${encodeURIComponent(projectId)}`)) })
  )

  server.tool(
    'list_project_materials',
    'List material metadata for a Hawco CRM project. Does not return raw file URLs.',
    { projectId: z.string() },
    async ({ projectId }) => ({ content: jsonContent(await crm(`/api/mcp/projects/${encodeURIComponent(projectId)}/materials`)) })
  )

  server.tool(
    'list_project_coverage',
    'List coverage records for a Hawco CRM project.',
    { projectId: z.string() },
    async ({ projectId }) => ({ content: jsonContent(await crm(`/api/mcp/projects/${encodeURIComponent(projectId)}/coverage`)) })
  )

  server.tool(
    'search_coverage',
    'Search Hawco CRM coverage records.',
    { query: z.string().optional(), verdict: z.string().optional(), projectId: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
    async (args) => ({ content: jsonContent(await crm('/api/mcp/coverage', { query: args })) })
  )

  if (!oauthLimited) {
    server.tool(
      'upload_file',
      'Upload PDF/DOC/DOCX/TXT bytes to CRM storage and return a file URL. Requires crm:write. Use returned URL with create/update material tools.',
      { filename: z.string(), mimeType: z.string().optional(), base64: z.string() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/upload', { method: 'POST', body })) })
    )

    server.tool(
      'crm_write',
      'Create or update CRM records with full audit logging. Entity: contact/company/project/material/tag/user. Action: create/update. Requires crm:write.',
      {
        entity: z.enum(['contact', 'company', 'project', 'material', 'tag', 'user']),
        action: z.enum(['create', 'update']),
        id: z.string().optional(),
        data: z.record(z.unknown()),
      },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/crm', { method: 'POST', body })) })
    )

    server.tool(
      'crm_delete',
      'Delete CRM records with full audit logging. Entity: contact/company/project/material. Requires crm:delete. Use only when Philip or Mildred explicitly intend deletion.',
      {
        entity: z.enum(['contact', 'company', 'project', 'material']),
        action: z.literal('delete'),
        id: z.string(),
        data: z.record(z.unknown()).optional(),
      },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/crm', { method: 'POST', body })) })
    )

    server.tool(
      'find_or_create_company',
      'Find or create a Hawco CRM company for script intake. Requires intake:write.',
      { name: z.string(), type: z.string().optional(), website: z.string().optional(), notes: z.string().optional() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/intake/company', { method: 'POST', body })) })
    )

    server.tool(
      'find_or_create_contact',
      'Find or create a Hawco CRM contact for script intake. Requires intake:write.',
      { name: z.string(), email: z.string().optional(), type: z.string().optional(), companyId: z.string().optional(), companyName: z.string().optional(), phone: z.string().optional(), notes: z.string().optional() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/intake/contact', { method: 'POST', body })) })
    )

    server.tool(
      'create_project',
      'Create a submitted Hawco CRM project from approved script-intake metadata. Requires intake:write.',
      { title: z.string(), origin: z.string().optional(), status: z.string().optional(), format: z.string().optional(), genre: z.string().optional(), tags: z.array(z.string()).optional(), dateReceived: z.string().optional(), sourceContactId: z.string().optional(), writerIds: z.array(z.string()).optional(), logline: z.string().optional(), synopsis: z.string().optional(), comps: z.string().optional(), notes: z.string().optional(), submissionThreadId: z.string().optional() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/intake/project', { method: 'POST', body })) })
    )

    server.tool(
      'upload_material',
      'Create Hawco CRM material metadata for a file URL. Use upload_file first when Cowork has raw script bytes. Requires intake:write or crm:write.',
      { type: z.string(), title: z.string(), filename: z.string().optional(), fileUrl: z.string(), fileSize: z.number().int().optional(), mimeType: z.string().optional(), notes: z.string().optional(), writerId: z.string().optional(), submittedById: z.string().optional(), projectId: z.string().optional() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/intake/material', { method: 'POST', body })) })
    )

    server.tool(
      'link_writer_agent',
      'Link a writer contact to a known agent or manager. Requires intake:write.',
      { writerId: z.string(), agentId: z.string().optional(), managerId: z.string().optional() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/intake/link-writer-agent', { method: 'POST', body })) })
    )

    server.tool(
      'intake_submission',
      'Atomically create approved script-intake records: contacts, project, material metadata, source links, genre tags, and follow-up. Requires intake:write.',
      { title: z.string(), format: z.string().optional(), genre: z.string().optional(), tags: z.array(z.string()).optional(), dateReceived: z.string().optional(), logline: z.string().optional(), synopsis: z.string().optional(), comps: z.string().optional(), notes: z.string().optional(), submissionThreadId: z.string().optional(), source: z.record(z.unknown()).optional(), writers: z.array(z.record(z.unknown())).optional(), material: z.record(z.unknown()).optional(), followUpNote: z.string().optional() },
      async (body) => ({ content: jsonContent(await crm('/api/mcp/intake/submission', { method: 'POST', body })) })
    )

    server.tool(
      'list_unread_materials',
      "List unread Hawco CRM materials for Phil's read queue.",
      { limit: z.number().int().min(1).max(100).optional() },
      async (args) => ({ content: jsonContent(await crm('/api/mcp/intake/unread-materials', { query: args })) })
    )

    server.tool(
      'list_projects_by_age',
      'List submitted/reading Hawco CRM projects older than N days with no firstReadAt.',
      { days: z.number().int().min(0).max(365).optional(), limit: z.number().int().min(1).max(100).optional() },
      async (args) => ({ content: jsonContent(await crm('/api/mcp/intake/projects-by-age', { query: args })) })
    )
  }

  server.tool(
    'list_followups',
    'List Hawco CRM follow-ups.',
    { contactId: z.string().optional(), completed: z.boolean().optional() },
    async (args) => ({ content: jsonContent(await crm('/api/mcp/follow-ups', { query: args })) })
  )

  server.tool(
    'add_followup',
    'Add a low-risk follow-up note for a contact.',
    { contactId: z.string(), note: z.string() },
    async (body) => ({ content: jsonContent(await crm('/api/mcp/follow-ups', { method: 'POST', body })) })
  )

  server.tool(
    'complete_followup',
    'Mark a follow-up complete or incomplete.',
    { id: z.string(), completed: z.boolean().default(true), note: z.string().optional() },
    async (body) => ({ content: jsonContent(await crm('/api/mcp/follow-ups', { method: 'PATCH', body })) })
  )

  server.tool(
    'add_writer_signal',
    'Add a relationship/development signal to a writer contact.',
    { writerId: z.string(), signalType: z.string(), note: z.string().optional() },
    async (body) => ({ content: jsonContent(await crm('/api/mcp/writer-signals', { method: 'POST', body })) })
  )

  server.tool(
    'log_interaction',
    'Log a meeting/interaction linked to contacts and projects.',
    {
      title: z.string(),
      date: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
      followUp: z.string().optional(),
      contactIds: z.array(z.string()).optional(),
      projectIds: z.array(z.string()).optional(),
    },
    async (body) => ({ content: jsonContent(await crm('/api/mcp/interactions', { method: 'POST', body })) })
  )

  return server
}

function writeJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function createHttpTransport() {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    allowedHosts: ['mcp.hawco.companytheatre.ca', 'localhost', 'localhost:3000', 'localhost:3456', '127.0.0.1', '127.0.0.1:3000', '127.0.0.1:3456'],
    enableDnsRebindingProtection: true,
  })
}

async function runHttp() {
  const httpServer = http.createServer(async (req, res) => {
    let transport
    try {
      const url = new URL(req.url || '/', PUBLIC_ORIGIN)
      if (req.method === 'GET' && url.pathname === '/healthz') {
        writeJson(res, 200, {
          ok: true,
          service: 'hawco-crm-mcp-server',
          crmBaseUrl: CRM_BASE_URL,
          auth: isOAuthConfigured() ? 'static_bearer+oauth_dcr' : 'static_bearer',
        })
        return
      }
      if (req.method === 'GET' && (url.pathname === '/.well-known/oauth-authorization-server' || url.pathname === '/.well-known/openid-configuration')) {
        if (!isOAuthConfigured()) return writeOAuthNotConfigured(res)
        writeJson(res, 200, oauthMetadata())
        return
      }
      if (req.method === 'GET' && (url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === `/.well-known/oauth-protected-resource${HTTP_PATH}`)) {
        if (!isOAuthConfigured()) return writeOAuthNotConfigured(res)
        writeJson(res, 200, protectedResourceMetadata())
        return
      }
      if (url.pathname === '/register') {
        await handleOAuthRegister(req, res)
        return
      }
      if (url.pathname === '/authorize') {
        await handleOAuthAuthorize(req, res, url)
        return
      }
      if (url.pathname === '/token') {
        await handleOAuthToken(req, res)
        return
      }
      if (url.pathname !== HTTP_PATH) {
        writeJson(res, 404, { ok: false, error: 'not_found' })
        return
      }
      const auth = verifyMcpBearerToken(bearerFrom(req))
      if (!auth) {
        unauthorizedMcp(res)
        return
      }

      transport = createHttpTransport()
      const server = createServer({ oauthLimited: auth.auth === 'oauth' })
      await server.connect(transport)
      await transport.handleRequest(req, res)
    } catch (error) {
      console.error('MCP HTTP error', error)
      if (!res.headersSent) writeJson(res, 500, { ok: false, error: 'internal_error' })
      else res.end()
    } finally {
      try {
        await transport?.close()
      } catch (error) {
        console.error('MCP transport close error', error)
      }
    }
  })

  httpServer.listen(PORT, HOST, () => {
    console.error(`hawco-crm-mcp-server listening on http://${HOST}:${PORT}${HTTP_PATH}`)
  })
}

async function runStdio() {
  const server = createServer()
  await server.connect(new StdioServerTransport())
}

if (args.has('--stdio')) await runStdio()
else await runHttp()
