#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const CRM_BASE_URL = (process.env.HAWCO_CRM_BASE_URL || 'https://hawco.companytheatre.ca').replace(/\/$/, '')
const TOKEN = process.env.HAWCO_MCP_TOKEN

if (process.argv.includes('--check')) {
  console.log('hawco-crm-mcp-server: syntax ok')
  process.exit(0)
}

if (!TOKEN) {
  console.error('HAWCO_MCP_TOKEN is required')
  process.exit(1)
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

await server.connect(new StdioServerTransport())
