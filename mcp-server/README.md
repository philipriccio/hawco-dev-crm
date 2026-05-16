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
