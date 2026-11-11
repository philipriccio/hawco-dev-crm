# Hawco CRM MCP Server

Standalone MCP wrapper for the Hawco CRM `/api/mcp/*` service-token API.

## Required environment

```bash
export HAWCO_CRM_BASE_URL="https://hawco.companytheatre.ca"
export HAWCO_MCP_TOKEN="<CRM service token>"
```

Do not use Philip's browser session cookie or CRM password. The CRM service token stays server-side and must match the CRM-side `HAWCO_MCP_TOKEN` or `HAWCO_MCP_TOKEN_SHA256` configuration.

## Public HTTP transport + OAuth

Default production mode is Streamable HTTP MCP on `/mcp` with OAuth/DCR discovery for Claude/Cowork:

```bash
export PORT=3000
export MCP_PUBLIC_ORIGIN="https://mcp.hawco.companytheatre.ca"
export MCP_HTTP_PATH="/mcp"
export MCP_OAUTH_APPROVAL_CODE="<one-time approval code Philip enters during connector consent>"
export MCP_OAUTH_DATA_DIR="/data/hawco-mcp-oauth"
npm start
```

Public endpoints:

- `GET /healthz` — unauthenticated process health check.
- `GET /.well-known/oauth-protected-resource` — MCP protected-resource metadata.
- `GET /.well-known/oauth-protected-resource/mcp` — path-specific protected-resource metadata fallback.
- `GET /.well-known/oauth-authorization-server` — OAuth authorization server metadata.
- `POST /register` — Dynamic Client Registration for Cowork/Claude.
- `GET|POST /authorize` — consent/approval-code gate; redirects back with auth code.
- `POST /token` — authorization-code/refresh-token exchange.
- `/mcp` — protected Streamable HTTP MCP endpoint; requires OAuth-issued bearer token.

The public OAuth token is not the CRM service token. OAuth-issued access tokens authorize the MCP wrapper, and the wrapper uses `HAWCO_MCP_TOKEN` privately when calling the CRM `/api/mcp/*` API.

## Local stdio mode

```bash
npm install
npm run stdio
```

## Tools

- `hawco_health`
- `search_contacts`
- `get_contact`
- `search_projects`
- `get_project`
- `list_project_materials`
- `list_project_coverage`
- `search_coverage`
- `list_followups`
- `add_followup`
- `complete_followup`
- `add_writer_signal`
- `log_interaction`

Initial scope intentionally excludes raw script downloads, uploads, deletes, user/admin operations, broad project mutation, and coverage creation.

## Claude connection passphrase — app-owned authority (November 10, 2026)
The OAuth approval passphrase is verified dynamically at the authenticated Hawco
`POST /api/mcp/claude-connection/verify` endpoint. `MCP_OAUTH_APPROVAL_CODE` is no
longer read. Deploy the web migration and Settings change first, set a passphrase
privately in Settings, then activate this MCP release. Verification uses the
existing server-to-app machine credential; it never sends that credential to
Claude. Unconfigured credentials, app/database outages, redirects, and a five-second
verification timeout deny new authorization. Existing issued OAuth access/refresh
tokens retain their previous lifetimes; passphrase rotation does not revoke them.
Do not roll this MCP image back to the environment-password implementation after
activation: that would revive an obsolete approval credential. Use a forward fix
or temporarily disable authorization.

## Scoped Claude collaboration (November 11 candidate)

Mildred remains Philip's point agent. Start with `collaboration_context`; use a
Philip/Mildred task reference on `edit_business_record`. New OAuth tools:

- `list_business_records`: 29 allowlisted business entities, including contacts,
  companies, projects, materials, coverage, meetings, research, buyers, funding,
  reply tracking, costs, IP and relationship links. Deterministic 50-record pages,
  readable-entity/ editable-field discovery and opaque versions. Users, auth,
  calendar credentials and audit internals are excluded.
- `edit_business_record`: allowlisted business create/update only; repeat the
  exact `requestId` after uncertain transport, reread/reconcile stale versions.
  Before/after audit and the edit commit together. No deletion, user/admin,
  Philip read markers, evaluations, release approvals or nested writes.
- `read_material_file`: an actual stored private PDF as an embedded MCP resource,
  maximum 8 MiB. Historical email-only references return unavailable. No signed
  URLs, arbitrary URL fetching or changes to Philip's read status.
- Existing unread and project-age reads are now available to OAuth connections.

Every tool callback enforces its OAuth scope. Existing read-only connections
remain read-only; an explicit reconnect/grant is needed for `crm:write`.
Refresh may preserve or narrow its original grant, never expand it. Legacy
machine-only generic CRUD/admin/delete/upload/intake tools remain unavailable
to OAuth. Their authority is unchanged. New material metadata intake supports
already-stored approved private PDFs, not arbitrary URLs or new byte uploads.

Deploy the web routes before this connector. No database migration. Keep the
current OAuth store intact during rollout and rollback. Actual Claude PDF
rendering and production storage acceptance must be checked by the parent;
local embedded-resource contract proof is not user-client rendering proof.
