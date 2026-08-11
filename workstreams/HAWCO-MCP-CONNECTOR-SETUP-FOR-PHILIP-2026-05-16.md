# Hawco CRM MCP Connector Setup

Status: Internal setup note for Philip. This document intentionally does not contain the raw connector token.

## Connector URL

Use this URL in Cowork / Anthropic connector setup:

https://mcp.hawco.companytheatre.ca/mcp

## Transport

Choose:

Streamable HTTP

Do not choose SSE unless Cowork specifically requires a fallback; the live wrapper is implemented with the official MCP TypeScript SDK using Streamable HTTP.

## Authentication

Use OAuth / Dynamic Client Registration for Cowork connector setup. Leave OAuth fields blank in Cowork so it can discover:

- `GET /.well-known/oauth-authorization-server`
- `POST /register`
- `GET|POST /authorize`
- `POST /token`

Philip approves the consent screen with the Hawco CRM MCP OAuth approval code stored locally in Keychain:

```bash
security find-generic-password -s openclaw -a 'hawco-crm/mcp-oauth-approval-code' -w
```

Do not paste the approval code into shared docs, GitHub, screenshots, or chat logs.

The older static bearer token remains available for internal/OpenClaw automation, but it is not the Cowork setup path.

## Important security note

The raw static connector token and the OAuth approval code are production credentials. They should not be pasted into Google Docs, Telegram, GitHub, chat logs, screenshots, or shared docs.

## Health check

For uptime only:

https://mcp.hawco.companytheatre.ca/healthz

The actual MCP connector URL is:

https://mcp.hawco.companytheatre.ca/mcp

## Current live verification

- Public MCP endpoint is live.
- `/healthz` returns 200.
- `/mcp` without auth returns 401 with OAuth protected-resource metadata.
- OAuth metadata and protected-resource discovery return 200.
- Dynamic Client Registration, authorization-code exchange, refresh-token exchange, OAuth `tools/list`, and OAuth read smoke pass.
- Static bearer authentication remains available for internal/OpenClaw automation.

## Cowork OAuth tools

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

The broader internal static-token surface may expose extra upload/intake/delete helpers. Those are deliberately not exposed through the Cowork OAuth connector.
