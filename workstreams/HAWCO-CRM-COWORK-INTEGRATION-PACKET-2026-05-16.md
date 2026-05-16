# Hawco CRM → Cowork Integration Packet

**Date:** 2026-05-16  
**Prepared by:** Mildred  
**Audience:** Philip / Cowork setup  
**Status:** Internal technical packet. Safe to share with Cowork. Contains no credentials or secrets.

---

## Executive recommendation

The CRM can support a Cowork integration cleanly, but Cowork should **not** use Philip's normal web login/session cookie. The safest path is:

1. Add a narrow API namespace such as `/api/mcp/...` or `/api/integrations/cowork/...`.
2. Authenticate it with a dedicated machine/service token, not Philip's password/cookie.
3. Start with read-only/search tools plus a small number of low-risk write tools: log interaction, add follow-up, add writer/project note.
4. Audit every Cowork write with actor/source metadata (`cowork-mcp`).
5. Keep file uploads, destructive actions, seed/admin endpoints, and broad record mutation out of initial scope.

---

## 1. Stack overview

- **Framework:** Next.js 16, App Router.
- **Language:** TypeScript.
- **Frontend:** React 19 + Tailwind CSS v4.
- **Backend:** Next.js API routes under `src/app/api/...`.
- **Database:** PostgreSQL.
- **ORM:** Prisma 6.
- **File storage:** DigitalOcean Spaces for uploaded scripts/materials/research documents.
- **Hosting:** DigitalOcean droplet in Toronto.
- **Deploy:** Coolify from GitHub.
- **Deploy mode:** Dockerfile build path, not Nixpacks.
- **Live URL:** `https://hawco.companytheatre.ca`.

Important repo paths:

- `prisma/schema.prisma` — canonical data model.
- `src/app/api/` — JSON API routes used by the UI.
- `src/lib/auth.ts` — web-session auth.
- `src/lib/api-auth.ts` — API auth helper for current cookie/JWT user auth.
- `src/lib/db.ts` — Prisma client.
- `src/lib/activity.ts` — activity logging helper.
- `src/app/projects/`, `src/app/contacts/`, `src/app/materials/`, `src/app/coverage/` — main UI surfaces.

---

## 2. Data model summary

Canonical source: `prisma/schema.prisma`.

### Users and audit

#### `User`
Fields include:
- `id`
- `email`
- `password`
- `name`
- `role`: `ADMIN` or `MEMBER`
- timestamps

Relations:
- meetings
- project reviews
- activity logs
- writer signals
- optional Google Calendar connection

#### `ActivityLog`
Tracks CRM changes.

Fields:
- `userId`
- `action` — e.g. created, updated, deleted
- `entityType` — e.g. contact, company, project, coverage, material
- `entityId`
- `entityName`
- `changes` JSON
- `createdAt`

**Integration note:** Cowork writes should create activity/audit records. If we add service-token auth, activity logging should be extended to support an integration actor/source, not only a human `userId`.

---

### Contacts

#### `Contact`
Represents writers, agents, managers, buyers, network execs, producers, and other contacts.

Core fields:
- `id`
- `type`: `WRITER`, `AGENT`, `MANAGER`, `BUYER`, `NETWORK_EXEC`, `PRODUCER`, `OTHER`
- `name`
- `email`
- `phone`
- `imdbUrl`
- `notes`
- timestamps

Writer fields:
- `writerLevel`: `EMERGING`, `MID_LEVEL`, `EXPERIENCED`, `SHOWRUNNER`
- `writerGenres`
- `writerVoice`
- `citizenship`
- `isCanadian`
- `highPriority`
- `unionMembership`

Agent/manager/buyer/network fields:
- `agentVibe`
- `lookingFor`
- `execTitle`
- `execRole`

Relations:
- optional `company`
- writer's `agent` and `manager`
- represented/managed writers
- project-contact links
- buyer project links
- meeting attendance
- submitted materials
- written materials
- writer signals
- follow-ups

Cowork-relevant tools:
- `search_contacts`
- `get_contact`
- `list_contact_projects`
- `list_contact_materials`
- `list_contact_followups`
- `add_contact_note` or safer: `add_writer_signal`
- `add_follow_up`

---

### Companies

#### `Company`
Represents agencies, networks, production companies, distributors, etc.

Fields:
- `id`
- `type`: `AGENCY`, `NETWORK`, `PRODUCTION_COMPANY`, `DISTRIBUTOR`, `OTHER`
- `name`
- `website`
- `notes`
- timestamps

Relations:
- contacts
- project-company links

Cowork-relevant tools:
- `search_companies`
- `get_company`
- `list_company_contacts`
- `list_company_projects`

---

### Projects

#### `Project`
Represents submissions and development slate items.

Core fields:
- `id`
- `title`
- `logline`
- `synopsis`
- `format`
- `genre`
- `comps`
- `status`
- `origin`
- `verdict`

Status values:
- `SUBMITTED`
- `READING`
- `READ`
- `CONSIDERING`
- `CONSIDER_RELATIONSHIP`
- `PASSED`
- `DEVELOPING`
- `REWRITE_IN_PROGRESS`
- `PACKAGING`
- `PITCHED`
- `GREENLIT`
- `IN_PRODUCTION`
- `RELEASED`
- `ON_HOLD`

Tracking/development fields:
- `dateReceived`
- `firstReadAt`
- `optionExpiryDate`
- `readPriority`
- `considerRelationship`
- `rewriteStatus`
- `pitchReady`
- `pitchChecklist` JSON
- `currentStage`
- `packagingNeeds`
- `nextAction`
- `targetNetwork`
- `intlPotential`
- `notes`

Relations:
- contacts through `ProjectContact`
- companies through `ProjectCompany`
- buyers through `ProjectBuyer`
- materials
- meetings
- project reviews
- tags
- coverages
- rewrite cycles

Cowork-relevant tools:
- `search_projects`
- `get_project`
- `list_project_contacts`
- `list_project_materials`
- `list_project_coverage`
- `list_project_rewrite_cycles`
- `add_project_note` or `create_project_review`
- `update_project_next_action` — probably not in first write scope unless Philip approves

---

### Project relationship tables

#### `ProjectContact`
Links projects to contacts with role:
- `WRITER`
- `SOURCE`
- `ATTACHED_TALENT`
- `PRODUCER`

#### `ProjectBuyer`
Links projects to buyer contacts.

#### `ProjectCompany`
Links projects to companies with a free-text role, e.g. Network, Co-Producer, Distributor.

---

### Materials

#### `Material`
Represents scripts, pitch decks, series bibles, treatments, etc.

Fields:
- `id`
- `type`: `PILOT_SCRIPT`, `SERIES_BIBLE`, `PITCH_DECK`, `TREATMENT`, `FEATURE_SCRIPT`, `OTHER`
- `title`
- `filename`
- `fileUrl`
- `fileSize`
- `mimeType`
- `notes`
- `readAt`
- timestamps

Relations:
- optional project
- optional submitted-by contact
- optional writer contact
- coverages

Cowork-relevant tools:
- `list_materials`
- `get_material_metadata`
- `list_materials_for_project`
- `list_materials_for_writer`

**Caution:** File URLs/scripts may be sensitive. Initial Cowork tools should probably expose metadata, not raw file download access, unless Philip explicitly approves.

---

### Coverage

#### `Coverage`
Represents script coverage/assessment.

Metadata:
- `reader`
- `dateRead`
- title/writer/format/source/draftDate

Content fields:
- `logline`
- `synopsis`
- `seriesEngine`
- `targetNetwork`
- `comps`

Score fields, each typically 1–5:
- `scoreConcept`
- `scoreCharacters`
- `scoreStructure`
- `scoreDialogue`
- `scoreMarketFit`
- `scoreTotal` — total out of 25

Score notes:
- `notesConcept`
- `notesCharacters`
- `notesStructure`
- `notesDialogue`
- `notesMarketFit`

Mandate checklist:
- `mandateCanadian`
- `mandateStarRole`
- `mandateIntlCoPro`
- `mandateBudget`

Other fields:
- `strengths`
- `weaknesses`
- `summary`
- `verdict`: `PASS`, `CONSIDER`, `RECOMMEND`

Relations:
- optional script/material
- optional project

Cowork-relevant tools:
- `search_coverage`
- `get_coverage`
- `list_coverage_for_project`
- `list_coverage_for_material`
- Later, with approval: `create_coverage_note` or `draft_coverage`, but I would not give Cowork autonomous coverage-write authority at first.

---

### Meetings and interactions

#### `Meeting`
Fields:
- `title`
- `date`
- `location`
- `notes`
- `followUp`
- `createdById`
- timestamps

Relations:
- attendees through `MeetingAttendee`
- projects through `MeetingProject`

Cowork-relevant tools:
- `log_meeting`
- `list_recent_meetings`
- `list_meetings_for_contact`
- `list_meetings_for_project`

**Important:** The current app has meeting creation, but a Cowork-specific “interaction” tool may be better than overloading meetings. It could create a Meeting record for now, or we can add a dedicated `Interaction` model later if Philip wants finer history.

---

### Follow-ups and writer signals

#### `FollowUp`
Fields:
- `contactId`
- `note`
- `completed`
- timestamps

#### `WriterSignal`
Fields:
- `writerId`
- `signalType`
- `note`
- `createdById`
- `createdAt`

Cowork-relevant tools:
- `list_followups`
- `add_followup`
- `complete_followup`
- `add_writer_signal`

---

### Research

#### `ResearchDocument`
Fields:
- `title`
- `description`
- `fileName`
- `fileUrl`
- `fileSize`
- `tags`
- timestamps

#### `BuyerNote`
Fields:
- `buyer`
- `notes`
- timestamps

Cowork-relevant tools:
- `search_research_documents`
- `get_buyer_notes`
- `update_buyer_notes` — not first-scope unless approved

---

## 3. Existing API routes

There is already a JSON API surface used by the UI. Routes are under `src/app/api/`.

Current route inventory:

```text
/api/activity                         GET
/api/admin/update-statuses             POST
/api/auth/login                        POST
/api/auth/logout                       POST
/api/calendar/connect                  GET
/api/calendar/oauth/callback           GET
/api/calendar                          GET
/api/calendar/sync                     POST
/api/companies                         GET, POST
/api/contacts                          GET, POST
/api/contacts/[id]                     GET, PATCH, DELETE
/api/contacts/[id]/signals             GET, POST
/api/contacts/import                   POST
/api/coverage                          GET, POST
/api/coverage/[id]                     GET, PATCH, PUT, DELETE
/api/coverage/options                  GET
/api/coverage/stats                    GET
/api/follow-ups                        GET, POST, PATCH, DELETE
/api/materials                         GET, POST
/api/materials/[id]                    PATCH, DELETE
/api/meetings                          POST
/api/projects                          GET, POST
/api/projects/[id]                     GET, PATCH, DELETE
/api/projects/[id]/ai-coverage         POST
/api/projects/[id]/contacts            GET, POST, DELETE
/api/projects/[id]/rewrite-cycles      GET, POST
/api/research                          GET, POST
/api/research/[id]                     PATCH, DELETE
/api/research/buyer-notes              GET, POST
/api/research/documents                GET, POST, DELETE
/api/seed                              POST — disabled in deployed app
/api/seed-users                        POST — disabled in deployed app
/api/settings/password                 POST
/api/settings/profile                  GET, PATCH
/api/tags                              GET, POST
/api/tags/[id]                         PATCH, DELETE
/api/upload                            GET, POST
/api/users                             GET, POST
```

Current API auth is cookie/JWT user-session oriented. Extending these routes directly for Cowork is possible, but I recommend a separate integration namespace so tool permissions and audit behavior are explicit.

---

## 4. Authentication

Current auth model:

- Email/password login.
- Passwords checked with bcrypt.
- Login creates JWT via `createToken()`.
- JWT is stored in `auth-token` cookie.
- API routes call `requireApiAuth()` / `requireApiAdmin()`.
- JWT payload includes `userId` and `email`.
- Session lookup returns user id/email/name/role.

There is currently **no service account / API key / MCP token layer**.

Recommended Cowork auth:

- Add `Authorization: Bearer <token>` support for a dedicated integration token.
- Do not use Philip's user password or browser cookies.
- Prefer hashed storage if token is in DB, e.g. future `IntegrationToken` table:
  - `id`
  - `name` — e.g. Cowork MCP
  - `tokenHash`
  - `scopes` JSON/string array
  - `createdAt`
  - `lastUsedAt`
  - `revokedAt`
- Alternative simpler first version: single env var `COWORK_MCP_TOKEN_HASH` or `COWORK_MCP_TOKEN`, but DB-backed token gives better rotation/audit later.
- Every integration request should resolve to an integration actor object, not impersonate Philip.
- Every write should create an activity/audit entry with source `cowork-mcp`.

Suggested scopes:

- `crm:read`
- `contacts:write_note`
- `followups:write`
- `meetings:write`
- Later only with approval: `projects:update`, `coverage:write`, `materials:read_files`, `upload:write`

---

## 5. Deployment / change workflow

Repo:

`/Users/mildred/.openclaw/workspace/projects/hawco-dev-crm`

Current branch note from local check:

- Local checkout was on `main` and aligned with `origin/main`.
- There was an untracked `knowledge-graph.json`; do not commit it unless intentionally requested.

Deploy facts:

- Coolify deploys from `stable-deploy`, not just `main`.
- Production fixes must be pushed to both `main` and `stable-deploy`.
- Deployment is through Coolify Dockerfile build mode.
- Do not rebuild inside the running container.

Before deploy, run:

```bash
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run test
npm run build
git diff --check
```

Then:

1. Commit locally.
2. Push to `origin main`.
3. Push same commit to `origin stable-deploy`.
4. Trigger Coolify deploy.
5. Wait for deploy completion.
6. Confirm production container/image is running expected commit.
7. Live-smoke the exact workflow.

Sensitive/off-limits without approval:

- Auth changes that affect normal user login.
- Production data mutation/migration.
- Upload/storage behavior.
- Seed/admin endpoints.
- Destructive delete tools.
- Public exposure of file URLs/raw scripts.

---

## 6. Representative Philip workflows

Based on current CRM shape, Philip's normal CRM use is roughly:

### A. Review development slate

- Open dashboard or projects.
- Review project status, stage, priority, next action.
- Check whether something is submitted, reading, considering, passed, developing, packaging, pitched, etc.

Cowork support:
- `search_projects`
- `get_project`
- `list_projects_by_status`
- `list_next_actions`

### B. Track a submission/material

- Add a script/material.
- Link it to a project.
- Link writer/submitting contact.
- Mark as read or attach coverage.

Cowork support:
- Read-only metadata first: `list_materials`, `get_material_metadata`.
- Write/upload should be later and approval-gated.

### C. Coverage workflow

- Create/edit coverage.
- Score concept, characters, structure, dialogue, market fit.
- Add strengths, weaknesses, summary, verdict.
- Link coverage to project/material.
- Coverage save can sync overlapping fields back to linked project.

Cowork support:
- `search_coverage`
- `get_coverage`
- `list_project_coverage`
- Potential future: `draft_coverage`, but not autonomous final write at first.

### D. Contact relationship tracking

- Search writer/agent/manager/buyer/network exec.
- Review notes, company, representation, writer level/voice/genres.
- Add follow-up or relationship signal.

Cowork support:
- `search_contacts`
- `get_contact`
- `add_writer_signal`
- `add_follow_up`

### E. Meetings/interactions

- Log meeting/contact/project notes.
- Associate meeting with contacts and projects.
- Capture follow-up.

Cowork support:
- `log_interaction` / `log_meeting`
- `list_recent_interactions`
- `list_contact_interactions`
- `list_project_interactions`

---

## 7. Recommended first MCP/API tool shape

I would not expose raw CRUD directly. I would add purpose-built tools that match Philip's workflows.

### Read tools — first wave

```text
search_contacts(query, type?, limit?)
get_contact(contactId)
search_projects(query, status?, limit?)
get_project(projectId)
list_project_contacts(projectId)
list_project_materials(projectId)
list_project_coverage(projectId)
search_coverage(query, verdict?, projectId?, limit?)
list_followups(completed?, contactId?)
get_buyer_notes(buyer?)
```

### Write tools — first wave, low risk

```text
add_followup(contactId, note)
complete_followup(followupId)
add_writer_signal(writerId, signalType, note)
log_interaction(title, date?, contactIds?, projectIds?, notes, followUp?)
```

### Hold for later / approval-gated

```text
create_project
update_project_status
update_project_next_action
create_or_update_coverage
upload_material
read/download raw script files
bulk import contacts
admin/user management
delete anything
```

---

## 8. Suggested implementation shape

Add something like:

```text
src/lib/integration-auth.ts
src/lib/integration-audit.ts
src/app/api/mcp/contacts/search/route.ts
src/app/api/mcp/contacts/[id]/route.ts
src/app/api/mcp/projects/search/route.ts
src/app/api/mcp/projects/[id]/route.ts
src/app/api/mcp/projects/[id]/coverage/route.ts
src/app/api/mcp/projects/[id]/materials/route.ts
src/app/api/mcp/follow-ups/route.ts
src/app/api/mcp/interactions/route.ts
```

The MCP server can then wrap these HTTP endpoints into Cowork tools.

Recommended response format:

```json
{
  "ok": true,
  "data": ...,
  "meta": {
    "source": "hawco-crm",
    "toolVersion": "v1"
  }
}
```

Recommended error format:

```json
{
  "ok": false,
  "error": {
    "code": "unauthorized|forbidden|not_found|validation_error|server_error",
    "message": "Human-readable safe message"
  }
}
```

---

## 9. Risks / idiosyncrasies

- This is production CRM data for Hawco development work. Treat it as sensitive.
- Do not expose credentials, env vars, DB URLs, JWT secrets, Spaces keys, Coolify tokens, or raw deployment details to Cowork.
- Do not let Cowork mutate existing records broadly at first.
- Do not expose raw uploaded scripts/materials unless Philip explicitly approves.
- Existing auth is cookie/session-based; service-token auth needs to be added deliberately.
- Existing activity logging assumes a human `userId`; integration audit may need a small extension.
- Seed endpoints are intentionally disabled in deployed app and should remain disabled.
- Upload New was previously fixed to a submit-driven flow; avoid changing upload behavior casually.
- `knowledge-graph.json` is local tooling output and should not be included in repo snapshots.
- The project doc was historically stale; source files and current git state are the source of truth.

---

## 10. Practical next step

Best next implementation step:

1. Add service-token auth for `/api/mcp/*`.
2. Add read-only endpoints for contacts/projects/coverage/material metadata.
3. Add two low-risk write endpoints:
   - add follow-up
   - log interaction/meeting
4. Add tests for auth, read filters, and audit logging.
5. Deploy only after local gates and Philip approval.

If Cowork needs the repo context but GitHub connector is unavailable, the safe workaround is a Drive snapshot with secrets excluded, but I would prefer sharing this packet first and only exporting source if Cowork truly needs it.
