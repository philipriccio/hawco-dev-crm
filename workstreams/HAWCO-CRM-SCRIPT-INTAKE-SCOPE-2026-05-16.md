# Hawco CRM Script Intake Scope — 2026-05-16

Source brief: `CRM_Scope_Expansion_for_Mildred---71f3146b-84af-4565-985f-c54db2d91617.docx` from Philip.

## Implemented locally

### Schema / model foundation
- Added `Project.sourceContactId` relation to `Contact` for the submission source.
- Added `Project.submissionThreadId` for Gmail thread provenance.
- Documented coverage scoring as 1–10 per category, total `/50`.
- Preserved existing `Project.logline`, `Project.synopsis`, and `Project.comps` as intake-populated project fields.
- Added migration `prisma/migrations/202605161610_crm_intake_scope/migration.sql`.

### Narrow MCP intake scope
- Added supported OAuth/backend scope: `intake:write`.
- Existing CRM read/write scopes remain separate. Intake write routes require `intake:write`; they do not grant deletes, coverage writes, admin access, or broad project mutation.

### New CRM MCP intake endpoints
- `POST /api/mcp/intake/company`
- `POST /api/mcp/intake/contact`
- `POST /api/mcp/intake/project`
- `POST /api/mcp/intake/material`
- `POST /api/mcp/intake/link-writer-agent`
- `POST /api/mcp/intake/submission`
- `GET /api/mcp/intake/unread-materials`
- `GET /api/mcp/intake/projects-by-age`

### New public MCP wrapper tools
- `find_or_create_company`
- `find_or_create_contact`
- `create_project`
- `upload_material`
- `link_writer_agent`
- `intake_submission`
- `list_unread_materials`
- `list_projects_by_age`

## Important boundary
- `upload_material` currently accepts a pre-uploaded URL and creates material metadata. Raw file-byte upload is intentionally not exposed yet through the MCP wrapper. That is safer for this first scope expansion and avoids script bytes moving through the MCP wrapper until explicitly designed.

## Not yet done
- Remove `BUYER` enum/type from UI/schema/data. Needs data migration and UI cleanup pass.
- Full coverage field cleanup/removal. Current code still stores legacy duplicated Coverage fields while Project fields are being formalized.
- Source backfill from existing coverage source strings.
- Contact dedupe and orphan coverage backfill.
- Follow-up dashboard UI expansion.
- Genre taxonomy decision: tags vs enum. Current intake supports tags and writes them through existing Tag facility.
- Token rotation for the accidentally pasted setup token.

## Verification
- `npm run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run test` passed, including new MCP intake contracts.
- `node mcp-server/src/server.mjs --check` passed.
- `npm run build` passed and locally synced Prisma schema with the dev database.
- `git diff --check` passed.

## Deployment boundary
Not deployed yet. Before deploy: commit, push to `main` and `stable-deploy`, trigger Coolify, verify container image, then live-smoke `/login`, MCP health, OAuth metadata, and at least one non-destructive MCP read/intake route authorization check.


## May 16 scope correction — full authority with attribution

Philip rejected limiting Cowork to narrow intake-only operations. New direction: Cowork should have broad CRM authority, including raw script-file upload and broad create/update/delete powers, as long as actions are clearly attributable and visible.

Implemented locally after correction:
- Added `crm:write` and `crm:delete` scopes.
- Added audited broad `crm_write` and `crm_delete` MCP tools for contacts, companies, projects, materials, tags, and limited user updates.
- Added raw `upload_file` MCP tool accepting base64 PDF/DOC/DOCX/TXT bytes and writing to configured storage, then returning a URL for material creation.
- Added `src/lib/mcp-activity.ts`; MCP-originated writes create/find a dedicated service user (`<actor-id>@mcp.local`) and write Activity Log rows with source `mcp`, actor id/name, scopes, tool name, and sanitized change metadata.
- Existing intake tools now also write MCP activity entries when they create/link records.

Guardrail kept intentionally:
- MCP user update cannot change passwords.
- Deletes are allowed only through `crm_delete` and require `crm:delete`, but they are available if Cowork is granted that scope.
- File-byte payloads are redacted from audit metadata.
