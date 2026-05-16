# Hawco CRM MCP Server

Standalone MCP wrapper for the Hawco CRM `/api/mcp/*` service-token API.

## Required environment

```bash
export HAWCO_CRM_BASE_URL="https://hawco.companytheatre.ca"
export HAWCO_MCP_TOKEN="<service token>"
```

Do not use Philip's browser session cookie or CRM password. The token must match the CRM-side `HAWCO_MCP_TOKEN` or `HAWCO_MCP_TOKEN_SHA256` configuration.

## Run

```bash
npm install
npm start
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
