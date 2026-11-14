# Sourcing — local candidate, November 12, 2026

## Scope

`/sourcing` is a separate lead register, not the projects or unread-materials queue. `/sourcing/wanted` displays the live authoritative six-stage development slate and a versioned sourcing brief. Existing Three Canadian screenwriters to know and all cron jobs remain unchanged. No remote reads/writes, outreach, drafting, paid sources or scheduler activation is part of this implementation.

Only additive tables: SourcingLead, SourcingEvent, SourcingBrief. Existing Project, Contact and IpProperty rows are referenced, not rewritten. Foreign keys intentionally restrict deletion of linked records until the lead's link is explicitly cleared; clearing a link preserves its prior value in sourcing history. No source files, read marks, coverage, agreement or rights-clearance records are changed.

## Decisions and evidence

- Types: writer, book, play, other IP.
- Explicit decisions: NEW, INTERESTED, PURSUING, PASSED, NOT_NOW. A pass/not-now reason is mandatory. No decision follows automatically from an email, link, or factual event.
- Contact events record what already happened: inquiry sent, response received, reading copy received, meeting held, note. Non-note events require an evidence/thread URL and all require an occurred-on date. They do not send anything.
- Rights default UNKNOWN. Every other assertion requires evidence text and a check date. REPRESENTED is explicitly distinct from CONFIRMED_AVAILABLE. This remains a sourced research assertion, not legal clearance; no external verification is inferred by software.
- Assessment basis distinguishes descriptions, reviews, excerpt and full work. Adaptation fit/gap is a recorded judgment, not an automatically derived fact.
- Canonical dedupe normalizes kind/title/creator, case, accents, punctuation and spaces. It does **not** resolve aliases, title translations or same-work editions; human near-match review remains required. Concurrent identical creates are stopped by the unique index; failed create transactions leave no orphan events.
- Version-checked transactions write record and before/after history together. Failed/stale/replayed updates cannot silently overwrite data. Refresh explicitly after uncertain saves. No delete/history-edit API exists.
- History is the sourcing-specific audit ledger. Actor ID/name and full before/after states are retained independently of later user renames. General ActivityLog is not duplicated.

## Wanted list

Shared `DEVELOPMENT_SLATE_STATUSES` controls membership. Genre/format/status counts use exact recorded labels, not semantic inference. All active project cards show source fields, current stage, recorded intake origin, explicitly linked IP/writers/buyers, target network, packaging needs and next action.

An absent IP link does not establish original material. EXTERNAL intake origin does not mean writer original. Missing writer links do not establish a recruitment need. Blank target network does not establish no buyer relationship. IP links do not establish rights clearance.

Initial text is UNSAVED DRAFT, with provisional 20-project / 4–8-IP planning references and genre interests. No generated text is silently persisted or approved. Save creates an append-only DRAFT version. Explicit approval requires exactly the currently saved draft, an authenticated session, same-origin request and the exact user ID configured in `SOURCING_PHILIP_USER_ID`. Unset/blank configuration denies all approvals (403). No role, email, display-name or legal-access fallback exists. Attribution uses the actual signed-in account. Other authenticated accounts retain draft editing but cannot approve. A later edit creates a new draft while preserving the previous approval in history. Before an approved deployment, independently verify Philip’s individual (not shared) account ID and configure `SOURCING_PHILIP_USER_ID`. This setting grants only business-brief approval and neither grants nor inherits legal access. No production configuration has been changed.

## APIs / future integration

Authenticated session routes (existing app account policy), no public or MCP scope change:

- GET/POST `/api/sourcing/leads`; GET supports `q`, `kind`, `decision`, `page` (zero-based, 50 rows).
- GET/PATCH `/api/sourcing/leads/:id`; PATCH envelope `{version, action: edit|decision|event, value}`. Creation/edit schema does not accept decisions, project fields, read flags or arbitrary keys.
- GET/POST `/api/sourcing/brief`; POST `{version, body, action: draft|approve}`. The API does not imply that latest draft is approved direction.

Mutation routes require authenticated session, matching Origin/Host, non-cross-site context, JSON and bounded request size. Browser/API failures are explicit; failed reads never masquerade as empty slate. A future automated reconciliation must independently establish task authority, source attribution, correct lead identity and human decisions. These routes do not enable that automation by themselves.

List pagination is 50. Detail renders latest100 sourcing events; brief page latest50 revisions. Older entries remain retained in DB; expanded history pagination is a later enhancement. Link selectors load lightweight existing IDs/names, appropriate to the present CRM size, not an unbounded-scale design.

## Migration / rollback

Apply `prisma/migrations/20261113034500_sourcing/migration.sql` after a verified backup on an authorized rollout; regenerate Prisma/build with the committed schema. This adds three tables, indexes and FKs only. Inherited migration history lacks an initial schema: empty-database `migrate deploy` is not claimed; synthetic fixture setup uses `db push` deliberately.

Revert application code first if rolling back. `scripts/rollback/sourcing.sql` locks the new tables and refuses **any** populated sourcing database. Never bypass this guard to erase real research/history. A populated rollback requires preserving/exporting the new data and separately planned restoration/reconciliation. Migration bookkeeping (`prisma migrate resolve`) is a release-specific decision, not automatically rewritten by this script.

## Local verification / QA

Use only `postgresql://mildred@localhost/hawco_sourcing_dev_20261112` for fixture suites. `npm run test:sourcing:db` clears sourcing records in that explicitly guarded synthetic DB only. It creates local synthetic user/contact/project/IP fixtures. Never use real data in this database.

- `npm test` includes pure sourcing validation and existing regressions.
- `npm run test:sourcing:db` exercises real transactions, stale/concurrent conflicts, audit, no project/read/coverage mutation, rights defaults, dedupe and draft/approval rules.
- `node scripts/test-sourcing-http.cjs` starts/stops local production candidate on3371 with ephemeral synthetic auth. Tests access/origin/validation, browser creation/decisions/conflicts/reload, brief versions and1440/390/320 layouts. Uses existing host Chrome/agent-browser Playwright dependency without app runtime additions.
- `node scripts/preview-sourcing.cjs` starts parent preview3371 and authenticated synthetic Chrome CDP3372. No credentials printed/persisted. Stop the process to stop preview/browser.

Evidence is in `../../audits/hawco-sourcing-20261112/`. No push/deploy/live import has occurred.

## November 13 classification extension
See `CLASSIFICATION.md`: project/lead/IP shared standardized labels and tags, project pipeline stages, protected classification writes, standardized wanted counts/filters. Existing research forms remain independent and version-safe. No real backfill or schedule change is implied by this implementation.

## November 14 — Clear suggestions and preserve feedback (candidate)

- `SourcingLead.dismissedAt` is a separate reversible visibility state. Clear does **not** set PASSED/NOT_NOW, infer rights, delete research, clear links, edit reading records or exclude a writer/genre. Existing records initially stay visible.
- Each list card and detail page offers **Clear suggestion**, optional note (8,000 characters), Cancel/Escape, and explicit save/error/reload controls. Cleared suggestions have their own filter-preserving view with **Restore suggestion**. No bulk deletion/clear-all behavior.
- PATCH `/api/sourcing/leads/:id` adds `action: dismiss|restore`, `value: {note?:string}` (restore only permits blank note), same integer `version`. Existing serializable/CAS transaction also appends DISMISSED/RESTORED history with actual actor and before/after. Stale saves, duplicate transitions and unsupported fields fail; restore never deletes prior notes.
- GET `/api/sourcing/leads` now defaults to active suggestions; use `view=cleared` or `view=all` explicitly for archive/history/reconciliation. Existing title/creator/gap, decision, kind and pagination filters remain.
- `/sourcing/feedback` and authenticated GET `/api/sourcing/feedback?page=0` show nonblank clearing notes, newest first, 50/page, stable ID tiebreaker; response `{feedback,total,page}` includes event ID, exact trimmed note, actor ID/name, UTC date, and current lead ID/title/creator/kind/source/decision/dismissal state. Notes remain after restoration; full contemporaneous lead snapshot is retained in the detail event's before/after history. Empty notes are valid clears, not inferred preferences. There is no automatic model training, mandate approval, broad exclusion or job/scheduler change. Future research must read feedback with its source context, distinguish item-specific feedback from explicit general direction, and review current restored/cleared status.
- Auth/session and same-origin JSON/size boundaries are unchanged. No public/MCP access added.

Migration: additive `20261114170000_sourcing_dismissal/migration.sql` adds one nullable timestamp and index. Apply on an authorized rollout after backup, before the candidate app uses it. Roll back app first, retaining the additive schema/data if used. `scripts/rollback/sourcing-dismissal.sql` refuses any non-null dismissal **or any DISMISSED/RESTORED history**, including restored suggestions. Never bypass that guard; a populated rollback requires separately planned preservation/reconciliation.

New isolated test DB is `postgresql://mildred@localhost/hawco_sourcing_clear_dev_20261114`; test/preview scripts are strictly guarded for this synthetic DB. Production candidate preview uses3381, Chrome CDP3382. Existing DB test suite resets synthetic sourcing fixtures only. Evidence: `../../audits/hawco-sourcing-clear-20261114/IMPLEMENTATION.md`.

## November 14 — Editorial sourcing overview (successor candidate)

Default list/detail now prioritize a short synopsis, genre, why-interesting assessment, supported awards/accolades, impressive sales/reach, and an optional caveat. Unknown accolades/sales are omitted instead of rendering empty-state clutter. Only an unavailable synopsis gets a concise pending message. Existing taxonomy genres take display precedence; `editorialGenre` provides source-described genre when shared genre classification is unreviewed. No shared taxonomy decisions are changed.

All legacy fit/gap/nextStep/source/rights/event fields remain intact. Detail presents read-only overview first, collapsible sources, secondary **Manage this lead**, and collapsed original research/history. Manage retains existing classification/research/decision/event controls and adds an editorial editor with normal labeled source fields (not raw JSON).

Additive columns: editorialSynopsis (max1800), editorialGenre (max200), editorialAccolades/editorialSales/editorialWhy/editorialCaveat (max1200 each), editorialSources (JSON array, max40). All strings default empty; sources default[]. Each source is `{field: synopsis|genre|accolades|sales|why|caveat, url, label, checkedOn}`. URLs must be credential-free HTTP(S); labels <=300 and dates are valid YYYY-MM-DD. Every nonblank section requires a matching dated source. A source may support an expressly framed assessment; no claim of full-script reading or independently verified sales is implied by a publisher citation.

PATCH `/api/sourcing/leads/:id` adds `action:'editorial'` with integer version and full editorial value. Transaction CAS and before/after EDITORIAL event are atomic. Omitted editorial strings in this dedicated action are cleared intentionally; send the complete six-field editor payload. Legacy `action:'edit'` neither accepts nor wipes the new fields. Editorial mutation cannot update decision, rights, classification or links. No live enrichment or import is part of this code candidate.

List/API visibility: active now means non-cleared AND rightsStatus != OPTIONED_SOLD; market means non-cleared AND OPTIONED_SOLD; cleared includes all cleared statuses; all includes all records. Existing decision/kind/search filters compose within each view. This is a derived presentation grouping, never a rights/decision/dismissal mutation. Restoration of sold/optioned material returns it to Market intelligence, not active suggestions. Counts/pagination use the identical filter as rendered rows. Clearing/feedback/history remain available.

Apply additive `20261114190000_sourcing_editorial/migration.sql` after authorized backup and before candidate runtime. Rollback app first, retaining data/columns. `scripts/rollback/sourcing-editorial.sql` refuses any nonempty editorial field/source or any EDITORIAL history. Never bypass used-data refusal. Existing sourcing dismissal migration remains required.

Synthetic tests/preview now target only `postgresql://mildred@localhost/hawco_sourcing_editorial_dev_20261114`, production app3391 and synthetic Chrome CDP3392. Evidence: `../../audits/hawco-sourcing-editorial-20261114/IMPLEMENTATION.md`. Parent owns real content research and rollout.
