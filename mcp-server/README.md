# Hawco CRM MCP Server

Standalone MCP wrapper for the Hawco CRM `/api/mcp/*` service-token API.

## Required environment

```bash
export HAWCO_CRM_BASE_URL="https://hawco.companytheatre.ca"
export HAWCO_MCP_TOKEN="<CRM service token>"
```

Do not use Philip's browser session cookie or CRM password. The token must match the CRM-side `HAWCO_MCP_TOKEN` or `HAWCO_MCP_TOKEN_SHA256` configuration.

## Public HTTP transport

Default production mode is Streamable HTTP MCP on `/mcp`:

```bash
export PORT=3000
export MCP_PUBLIC_ORIGIN="https://mcp.hawco.companytheatre.ca"
export MCP_HTTP_PATH="/mcp"
export MCP_SERVER_AUTH_TOKEN="<optional connector bearer token>"
npm start
```

- `GET /healthz` is an unauthenticated process health check.
- `/mcp` is the MCP endpoint.
- If `MCP_SERVER_AUTH_TOKEN` is set, connector requests must include `Authorization: Bearer <token>`.

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
