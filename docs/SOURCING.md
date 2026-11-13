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
