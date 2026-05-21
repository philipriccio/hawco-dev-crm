# Hawco Development CRM — Project Overview

## 🎯 Vision
A development tracking CRM for Hawco Productions (Allan Hawco's production company). Track scripts in development, writers, agents, managers, buyers, coverage reports, and meetings — everything needed to manage an active TV development slate.

## 👤 For Whom
Philip Riccio — Development Executive at Hawco Productions. Uses this daily to track submissions, coverage, contacts, and project status.

## 🏗️ Current State (Mar 27, 2026)
**Status:** Live, deployed, and materially ahead of this document's previous Feb 21 state
**URL:** https://hawco.companytheatre.ca
**Login:** philip@hawcoproductions.com / hawco2026

### What’s Live Now
- **Dashboard** — Overview plus Follow-up Items widget replacing High Priority Writers
- **Projects** — Full development slate tracking (Submitted → Released pipeline)
- **Contacts** — Writers, Agents, Managers, Buyers, Network Execs, Producers, with color-coded trims and distinct type tags
- **Coverage** — Script assessments with scoring, plus sync of overlapping fields back to linked projects on save
- **Materials** — Scripts, bibles, pitch decks linked to projects and writers
- **Research** — renamed from Market Intel; now includes PDF research uploads and buyer notes
- **Settings** — App configuration

### Mar 26 Release (deployed)
Nine-feature release shipped live:
1. **Market Intel → Research** rename
2. **PDF upload in Research**
3. **Buyer Notes** for CBC Comedy/Drama, Netflix Canada, Disney+ Canada, CTV/Crave, Amazon Canada
4. **Contact uniformity** — all type-specific fields editable
5. **Coverage → Project sync** on save
6. **Contact card left color trim** by type
7. **Distinct type colors** — Manager = pink, Buyer = yellow, etc.
8. **High Priority Writers removed** from dashboard
9. **Follow-up Items** per contact + dashboard widget

### Current Known Issues / Next Work
- Google Calendar integration still pending
- Project doc had gone stale; source files + git were the truth until this refresh
- Continue refining Hawco workflow/features based on Philip's real usage

### Apr 30 Auth Boundary Repair
- Source/browser audit found `/login` rendered inside the authenticated CRM shell and most CRM API handlers lacked explicit route-level auth guards.
- Commit `9de550a` fixes the public/auth layout split with `AppShell`, adds shared API auth/admin helpers, guards CRM API handlers, disables deployed seed endpoints, and protects upload config/upload routes.
- Verification: API guard scan found no unguarded CRM API handlers outside intentional public exceptions; `npx tsc --noEmit` passed; `npm run test` passed; `npm run build` passed.
- Remaining quality note: strict lint has 0 errors but still fails on pre-existing warnings; clean separately.

## 📜 History

### Feb 17, 2026 — Project Started
- Initialized Next.js 16 + TypeScript + Tailwind CSS v4 + Prisma 6
- Basic CRUD for contacts, projects
- Deployed to DigitalOcean via Coolify

### Feb 20, 2026 — Coverage System
- Built coverage feature matching Philip's existing Google Drive template
- Imported 6 historical coverages from Philip's email
- Scoring: 1-10 per category (Concept, Characters, Structure, Dialogue, Market Fit)
- Mandate checklist with toggle buttons (✓/✗)
- Verdicts: PASS / CONSIDER / RECOMMEND

### Feb 21, 2026 — Contact Enhancements
- Added Manager and Buyer contact types
- Agent/Manager dropdowns on Writer forms (new + edit)
- Writer linking on Materials
- "What They're Looking For Now" on Buyer contacts
- Fixed dashboard score to show /50 (was /25)
- VPS: Added 2GB swap to prevent build OOM crashes

## 🔧 Technical Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Prisma 6
- **Hosting:** DigitalOcean droplet (4GB RAM, Toronto)
- **Deploy:** Coolify (auto-deploy from GitHub)

## 📁 Key Files
- `/prisma/schema.prisma` — Database schema
- `/src/app/page.tsx` — Dashboard
- `/src/app/contacts/` — Contact management
- `/src/app/coverage/` — Coverage system
- `/src/app/materials/` — Materials management
- `/src/app/projects/` — Project tracking

## 🚀 Deployment

**⚠️ IMPORTANT: Coolify deploys from `stable-deploy` branch, NOT `main`!**

```bash
# Always commit and push to BOTH branches
git add -A && git commit -m "description"
git push origin main
git push origin main:stable-deploy  # <-- THIS IS CRITICAL

# THEN deploy via Coolify API
curl -X POST "http://159.89.120.69:8000/api/v1/deploy?uuid=l48gsw4wg0004wssgsk80kg0&force=true" \
  -H "Authorization: Bearer 2|A2o1wJUePCL5l6IMpEDVgesbHBTkLQYoiwg7eOx1c014e2df"
```

**⚠️ NEVER do in-container rebuilds.** Doing `docker exec ... npm run build` + `docker restart` does NOT deploy new code. Coolify runs a Docker image baked at deploy time — restarting re-uses the old image. The only way to get new code live is triggering a Coolify deploy (above), which builds a fresh Docker image from the latest GitHub commit.

**Verify deploy succeeded:**
```bash
ssh root@159.89.120.69 "docker ps --filter name=l48gsw4wg0004wssgsk80kg0 --format '{{.Image}}'"
# Must show the new commit SHA, e.g. l48gsw4wg0004wssgsk80kg0:8f39367f...
```

**Build takes 5–8 minutes.** Don't check too early.

## ⚠️ Critical Constraints
1. **VPS has 4GB RAM** — Builds use swap, may be slow but won't crash
2. **Coolify pulls from GitHub** — Must push before deploying
3. **Basic auth on site** — Don't remove authentication

## 🚫 What NOT to Do
- Don't deploy without pushing first (Coolify pulls from repo)
- Don't change auth without Philip's approval
- Don't modify existing coverage scores/data without asking

## 📋 Pending Features
- [ ] Buyers → Project linking
- [ ] Google Calendar integration
- [ ] Project edit page improvements

---
*Last updated: 2026-03-27 by Mildred*

## 2026-04-30 — Connected-flow repair pass

Commit `abd5681` repairs the first connected-flow audit pass after Philip reported that Project Detail → Add Material → Upload New did not actually upload a file.

Fixed locally and pushed to both `main` and `stable-deploy`:
- Project Add Material now uses the real `/api/upload` file upload flow for PDF/DOC/DOCX/TXT instead of only requiring a pasted URL.
- Materials API supports `orphans=true` for Project Add Material → Link Existing.
- Whiteboard Add Project → Add from Submissions handles the actual `/api/projects` array response.
- Project Add Contact uses valid `NETWORK_EXEC` enum for Network Executive contacts and stops sending unsupported contact payload fields.
- Project Detail → Add Coverage now lets `/coverage/new?projectId=...&scriptId=...` prefill project/script context and persist `scriptId`.
- Project Detail now fetches and displays directly linked project coverages, not only material-linked coverage, and excludes direct coverages from the Link Coverage dropdown.
- Coverage page now honors `projectId` links. Score totals are now canonical `/50` scale.
- Added regression checks in `scripts/test.js` for connected project/material/coverage flows.

Verification before deploy:
- `npm run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test` passed.
- `npm run build` passed.
- `git diff --check` passed.

Deployment:
- `abd5681` was deployed and live-smoked. It repaired the connected project/material/coverage flows, but Philip’s live browser still experienced Upload New as broken.
- Follow-up commit `b31450a` changed Project Add Material upload to a submit-driven flow: selecting a file only stages it, and clicking Add Material performs upload + attach with visible status/errors. `b31450a` was deployed and verified live with a production test upload/delete on Halfyard.
- Follow-up commit `7a2501e` forced app routes dynamic/no-store to reduce stale route/client payload issues, but briefly broke `/login` because client page exports were invalid. Corrected by `0124a39`, which restored the login client page while preserving root no-store behavior.
- Live as of Apr 30 12:23 PM Cayman: Docker image `l48gsw4wg0004wssgsk80kg0:0124a39f2f1e8d368eccd531f69b241c71c0909b`; `/login` returns 200 with no authenticated shell strings; cache-control is `private, no-cache, no-store, max-age=0, must-revalidate`; invalid-cookie `/api/contacts` returns 401.
- Deploy reliability issue remains: Coolify/Nixpacks performs slow cold builds (`apt-get`, `npm ci`, `next build`, no build cache) and can fail at Docker image export despite successful app builds. Next infrastructure cleanup should move this app to a cache-aware Dockerfile/build setup before more rapid CRM iteration.
### Apr 30 Deploy-speed repair — Dockerfile build path

Status: **LIVE** as of Apr 30, 2026.

Problem found:
- Coolify/Nixpacks was doing slow cold builds for small CRM changes (`apt-get`, full `npm ci`, full `next build`) and intermittently failed during Docker image export even when the app build had succeeded.
- Route/app-shell caching also caused stale browser/client behavior; fixed earlier via root no-store/dynamic config and login-page repair.

Fixes shipped:
- `b02bbd6` added a multi-stage `Dockerfile` and `.dockerignore`, and Coolify app `l48gsw4wg0004wssgsk80kg0` was switched from `nixpacks` to `dockerfile` build pack.
- `bdd729c` fixed the Docker deps layer to run `npm ci --ignore-scripts`, avoiding Prisma postinstall before `prisma/schema.prisma` is copied. Prisma now generates in the builder layer after the full app is present.

Verification:
- Local gates before deploy: `npm run lint -- --max-warnings=0`, `npm test`, `npm run build`, `git diff --check`.
- Deployment `hlcxf4uktvevmr15yp9jvzob` completed and rolled production to image `l48gsw4wg0004wssgsk80kg0:bdd729c2ef5af056a28ff429565892b17db647da`.
- Live smoke passed: `/login` returns 200 with `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`; login page contains Email/Password/Hawco Productions and no Dashboard/Development Board/Sign out; invalid-cookie `/api/contacts` returns 401; `/api/seed` returns 410.

Remaining note:
- First Dockerfile deploy is still slow because it must populate Docker cache. Subsequent deploys should reuse dependency layers unless `package*.json` or base image layers change. If deploys remain slow, next step is deeper Docker BuildKit/cache/Coolify host tuning.


## 2026-05-16 — Cowork MCP integration + OAuth/DCR wrapper

Status: **LIVE** for the public MCP wrapper at `https://mcp.hawco.companytheatre.ca/mcp`.

What shipped:
- CRM-side `/api/mcp/*` service-token API surface was added in commit `4807e91`, with bearer-token auth, scoped machine actor `Cowork MCP`, and read-mostly CRM tools plus limited follow-up/meeting/signal writes.
- Middleware and seed-route cleanup shipped in `8dd6c6d` and `7989fdc`; CRM production image `l48gsw4wg0004wssgsk80kg0:7989fdc...` was live-smoked.
- Public standalone MCP wrapper was added and exposed as `hawco-crm-mcp-server`; static bearer connector auth initially worked technically but Cowork UI does not support user-pasted bearer tokens.
- Commit `e5ec17f` adds OAuth 2.0 / Dynamic Client Registration support to the public MCP wrapper: protected-resource metadata, authorization-server metadata, DCR `/register`, gated `/authorize`, `/token`, and OAuth-issued bearer validation for `/mcp`.

Security model:
- The underlying CRM service token remains server-side only in the MCP wrapper container and Keychain; it is not sent to Cowork or stored in docs/chat/git.
- Public Cowork/Claude access uses OAuth-issued access tokens.
- `/authorize` is gated by `MCP_OAUTH_APPROVAL_CODE`, stored only in macOS Keychain as service `openclaw`, account `hawco-crm/mcp-oauth-approval-code`.
- The previous public static connector token was treated as burned and rotated; rotated legacy value is stored only in Keychain as service `openclaw`, account `hawco-crm/mcp-server-auth-token-rotated-2026-05-16`.

Live verification after OAuth deploy:
- `GET https://mcp.hawco.companytheatre.ca/healthz` returned `ok: true`, service `hawco-crm-mcp-server`, auth `oauth_dcr`.
- `GET /.well-known/oauth-protected-resource` advertised resource `https://mcp.hawco.companytheatre.ca/mcp` and authorization server `https://mcp.hawco.companytheatre.ca`.
- `GET /.well-known/oauth-authorization-server` advertised `/authorize`, `/token`, `/register`, authorization-code and refresh-token grants, client-secret auth, S256 PKCE, and CRM scopes.
- Unauthenticated `POST /mcp` returned `401` with `WWW-Authenticate: Bearer resource_metadata="https://mcp.hawco.companytheatre.ca/.well-known/oauth-protected-resource"`.
- Live DCR → approval-code authorization → token exchange succeeded.
- OAuth-authenticated MCP initialize returned protocol `2025-06-18`, server `hawco-crm`, tools capability.
- OAuth-authenticated `tools/list` returned expected Hawco CRM tools.

Operational caveat:
- The public MCP wrapper is a separate hand-managed Docker container (`hawco-crm-mcp-server`) on the Coolify host, not the main CRM Coolify app. Preserve its Traefik labels and env if recreating it. Consider moving it into a managed Coolify service or compose file later for cleaner repeatable deploys.

### May 16, 2026 — Script intake MCP scope expansion started

Local implementation from Philip/Cowork script-intake brief:
- Added `Project.sourceContactId` and `Project.submissionThreadId` schema foundation.
- Added narrow `intake:write` MCP scope plus intake endpoints/tools for find/create contact/company, create project, create material metadata from pre-uploaded URL, link writer-agent, atomic intake submission, unread materials, and aged unread projects.
- Corrected CRM scoring documentation/display path toward canonical `/50` scale.
- Verification passed locally: strict lint, TypeScript, tests including MCP intake contracts, MCP server syntax check, production build, and `git diff --check`.
- Not deployed yet. Remaining cleanup includes BUYER removal, coverage field cleanup/migration, source backfill, duplicate contact merge, orphan coverage backfill, follow-up UI expansion, genre decision, and token rotation.

### May 16, 2026 — Cowork CRM authority widened with audit trail

Philip clarified the desired control model: do not constrain Cowork artificially; give it broad CRM authority, but make every Cowork/MCP action attributable and reviewable. Local implementation now adds `crm:write`, `crm:delete`, broad audited write/delete MCP tools, raw script-file upload via `upload_file`, and MCP activity logging that records actor/tool/source metadata in the Activity Log under a dedicated MCP service user. Password changes are not exposed through MCP; file bytes are redacted from audit metadata.

## 2026-05-17 — Dashboard redesign / read-queue surface

Status: **LIVE** as of May 17, 2026 on image `l48gsw4wg0004wssgsk80kg0:f2c37b2a4d5e9e325f012529675a025e45cd4ac7`.

Commit `f2c37b2` implemented Philip/Cowork dashboard design notes for the CRM landing dashboard:
- Pitch decks are excluded from dashboard read/unread flows through shared readable-material helpers.
- Dashboard now uses age labels/colors, priority pills, project status pills, verdict pills, source/agent display, and estimated read-time conventions.
- Top stat cards have secondary metrics and whole-card navigation.
- Unread Scripts is ordered by priority/age and includes Today’s Pick.
- Read Scripts shows Phil-preferred verdict pills and duplicate-Phil coverage indication.
- Relationship-risk/source rollup was added with a legacy-data note.
- Reading Stats now uses Philip’s 3/week goal with progress and 12-week sparkline.
- Recent Meetings and Follow-up empty states now explicitly say they are coming with Cowork integration rather than looking broken.

Verification before deploy:
- `npm run lint -- --max-warnings=0`
- `npx tsc --noEmit --pretty false`
- `npm run test`
- `npm run build`
- `git diff --check`
- Local authenticated HTML marker smoke confirmed dashboard strings render with an auth cookie.

Deployment:
- Pushed to both `main` and `stable-deploy`.
- Coolify deployment `o5p8y5lash9z0tgc419df0ck` rolled production to `f2c37b2`.

Live smoke:
- `/login` returned 200 with login markers and no authenticated shell leakage.
- Unauthenticated `/` redirected to `/login`.
- Forged auth cookie on `/api/contacts` returned JSON 401.
- `POST /api/seed` returned 410 disabled seed JSON.
- Running production image contains the new dashboard strings.

Known limits:
- Source/agency rollup quality depends on legacy `sourceContact` / `submittedBy` completeness.
- Dashboard unread query currently loads all readable unread materials for rollup/scoring; acceptable for current data volume, but server aggregation/pagination should be considered if the dataset grows.

### 2026-05-17 — Dashboard coverage/read-state repair

Status: **READY FOR DEPLOY** pending push/deploy/live smoke.

Fixes implemented:
- Dashboard read rows now choose coverage by authoritative `projectId` first, deduping any direct material-linked coverage by coverage id. This makes project-level coverage appear even when `coverage.scriptId` is null or linked to the wrong material.
- Material read toggle now treats `PILOT_SCRIPT`, `FEATURE_SCRIPT`, `TREATMENT`, and `SERIES_BIBLE` as script-type readable materials. When a material transitions from unread to read and the linked project has no `firstReadAt`, the project `firstReadAt` is set automatically.
- Added `scripts/cleanup-coverage-script-links.ts` to repair stale coverage/material links: if a project-linked coverage points to a non-script/wrong-project material, it repoints to the single script-type material when unambiguous, otherwise clears `scriptId` and leaves `projectId` authoritative.

Verification before commit:
- `npm run test` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- `git diff --check` passed.

Boundary:
- Code/local gates only until deployed and live-smoked.
- Production data cleanup still needs to be run against the live database after deploy.

### 2026-05-17 — Dashboard coverage/read-state repair deployed

Status: **LIVE**.

Commit/deploy:
- Commit `3a60e28 fix: repair dashboard coverage read tracking` pushed to both `stable-deploy` and `main`.
- Coolify deployment `g9r3qg67kdvgysorlbwk1fw7` finished successfully.
- Production container/image: `l48gsw4wg0004wssgsk80kg0:3a60e2864e8d40364fb964948efbccfa798c7b9a`.

Production cleanup:
- One-time coverage/material link cleanup ran against production.
- Result: checked 3 project-linked/script-linked coverages; repointed 1 (`Mama Bear`) from stale deck/non-script link to the `Mama Bear` `PILOT_SCRIPT`; cleared 0.
- Post-cleanup verification: stale linked coverage count is 0.

Live smoke:
- `/login` returned 200 with login markers and no authenticated shell leakage.
- Unauthenticated `/` redirected to `/login`.
- Forged auth on `/api/contacts` returned JSON 401.
- `POST /api/seed` returned 410 disabled seed JSON.
- Mama Bear coverage now links to the Mama Bear pilot script under the Mama Bear project.

Boundary:
- Dashboard/project coverage query is live and project-first.
- Material read toggle first-read sync is live.
- Browser-session-specific UI rendering was not manually clicked, but production code/data/API smoke passed.


## 2026-05-21 — CRM script-intake schema/tag cleanup

Status: **LOCAL VERIFIED, pending deploy**.

Implemented from Philip/Cowork script-intake scope:
- Removed empty legacy `BUYER` contact type from schema and beta-facing contact/project-contact UI; migration maps any stragglers to `NETWORK_EXEC` before replacing the enum.
- Added idempotent migration coverage for dashboard/research/follow-up tables that previously existed via db-push-era releases, so production can move to `prisma migrate deploy` safely.
- Normalized genre handling around Project `Tag` records with category `genre`, seeded Philip’s starter genre vocabulary, and added a migration/script to backfill existing `Project.genre` strings into genre tags while keeping the legacy `genre` string until verified.
- Corrected stale CoverageIQ comments so the CRM source no longer claims a `/5` coverage schema; canonical score remains 1–10 per category, total `/50`.
- Changed local/build and Docker runtime database path away from `prisma db push` to migration discipline (`prisma migrate deploy`) so enum/schema changes are applied through reviewed migrations instead of unsafe push flags.
- Added `scripts/test-crm-intake-scope.js` and wired it into `npm test` to guard BUYER removal, genre-tag consistency, and score-scale comments.

Verification before deploy:
- `npm run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test` passed, including MCP/intake contracts and new CRM intake scope cleanup checks.
- `npm run build` passed.
- `git diff --check` passed.

Not done in this commit:
- No destructive live data merges/backfills yet. Duplicate contact merge, orphan coverage backfill, and sourceContactId backfill require production DB verification/backup before mutation.
- Coverage duplicate-field removal is intentionally deferred; current UI/API still depends on existing Coverage fields for historical records.
- Token rotation remains hygiene work, not part of this code deploy.


## 2026-05-21 — Buyers feature Phase 1

Status: **LIVE** as of 2026-05-21.

Commit/deploy:
- Commit `6ed1ae4 feat: add buyers hub` pushed to both `stable-deploy` and `main`.
- Production image verified: `l48gsw4wg0004wssgsk80kg0:6ed1ae4f6aacd005c84618b5b6da956d5c34e835`.
- Migration `202605212215_buyers_feature` applied successfully; `prisma migrate status` reports database schema up to date.

Implemented from Philip's Buyers Feature Spec:
- Sidebar now shows **Buyers** instead of Research, with `/research` redirecting to `/buyers` so old links do not break.
- Added Company-backed buyer fields: `isBuyer`, `lookingFor`, `brands`, and `region`; no parallel Buyer model was created.
- Added `BuyerSlateItem` with status enum (`ON_AIR`, `IN_DEVELOPMENT`, `GREENLIT`, `ANNOUNCED`, `ENDED`), source/date/confirmed metadata, and pending-review support.
- Seed/migration flags phase-1 Canadian buyers: CBC, Bell Media, Netflix Canada, Disney+ Canada.
- Existing `BuyerNote` content is migrated into `Company.lookingFor` where buyer names match.
- Existing `ResearchDocument` records remain accessible in a Research docs section inside Buyers.
- Existing `Project.targetNetwork` strings are backfilled into `ProjectCompany` rows with role `TARGET_BUYER`; project detail now supports target-buyer company pills while preserving separate primary company links.
- Buyer detail page includes header/stats, editable looking-for mandate notes, slate grouped by status, contacts linked by company, and Hawco projects targeting the buyer.
- Contact new page accepts `companyId` and `type` query params so buyer detail can prefill Add Contact.

Verification before deploy:
- `npm run lint -- --max-warnings=0` passed after fixing hook warning.
- `npx tsc --noEmit` passed.
- `npm run test` passed, including Buyers feature contracts and CRM intake scope checks.
- `npm run build` passed.
- `git diff --check` passed.

Live smoke:
- `/login` returned 200 with login form markers and no authenticated app-shell leakage.
- Unauthenticated `/` and `/buyers` redirected to `/login`.
- Forged auth PATCH `/api/buyers/cbc` returned JSON 401.
- POST `/api/seed` returned 410 disabled seed JSON.
- Production DB has 4 buyer companies; target-buyer links count was 0 after migration, likely because existing `targetNetwork` values did not match the phase-one buyer-name mapping.

Not included / deferred:
- Phase 2 Cowork market-research scheduler and write tools (`add_buyer_slate_item`, `update_buyer_notes`) are not added yet.
- Destructive live data cleanup, duplicate merges, orphan coverage/source backfills, and token rotation remain separate cautious DB work.


## 2026-05-21 — Buyers slate/contact intelligence Phase 1.5

Status: **LIVE** as of 2026-05-21.

Commit/deploy:
- Commit `75a6b88 feat: add buyer slate contact links` pushed to both `stable-deploy` and `main`.
- Production image verified: `l48gsw4wg0004wssgsk80kg0:75a6b88b7a78636deee357b0415341757cd3dcd4`.
- Migration `202605212315_buyer_slate_contacts` applied successfully; `prisma migrate status` reports database schema up to date.
- Controlled one-time slate seed ran successfully and seeded/updated 23 buyer slate items.

Implemented from Philip's follow-up request:
- Added `BuyerSlateContact` join model so Hawco contacts can be attached to specific buyer slate/show items.
- Buyer detail now shows contacts attached to each show under **Contacts on this show**.
- Buyer detail provides an attach dropdown using the buyer's known contacts, so if one of our contacts is working on an existing buyer show, it can be linked and seen on the buyer page.
- Added guarded API route `POST/DELETE /api/buyers/[id]/slate/[itemId]/contacts` for attaching/detaching contacts to slate items.
- Added researched phase-one slate seed script `scripts/seed-buyer-slate-phase-1.ts` covering CBC, Bell Media/CTV/Crave, Netflix Canada, and Disney+ Canada with source URLs and confirmed status labels.

Research sources used include CBC Media Centre, Bell Media/The Lede, About Netflix, Disney+ Press, and high-signal industry/streaming trade sources where official Canadian-slate detail was limited.

Verification before deploy:
- `npm run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test` passed.
- `npm run build` passed.
- `git diff --check` passed.

Live smoke:
- `/login` returned 200 with login form and no authenticated app-shell leakage.
- Unauthenticated `/buyers` redirected to `/login`.
- Forged auth POST to slate-contact API returned JSON 401.
- POST `/api/seed` returned 410 disabled seed JSON.
- Production DB shows 23 buyer slate items: CBC 8, Bell Media 8, Netflix Canada 4, Disney+ Canada 3.

Boundary / deferred:
- Contact-to-show links require CRM users to attach the relevant contact manually unless a future researched relationship source proves the link.
- Phase 2 Cowork recurring market-research ingestion remains separate.
