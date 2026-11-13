# Changes

## 2026-10-27 — Recently read dashboard (local candidate)

- Replaced Project Next Steps with the ten latest scripts/decks marked read, ordered by recorded read time with deterministic ties. Both reading sources and orphan materials are included.
- Links open the exact material or linked project; read dates preserve date-only UTC records. Meaningful empty state and responsive rows.
- Removed only dashboard next-step presentation/query; project next actions remain intact elsewhere. No schema, history, read-state or production changes.
- Full tests, synthetic real-DB query checks, typecheck, scoped lint, production build and authenticated 1440/390/320 browser proof passed.

## 2026-10-26 — Separate unsolicited website reading queues (local candidate)

- Added three separate unread website widgets for TV scripts, decks/outlines and feature scripts. Existing queues and today’s pick exclude explicitly classified website submissions; unclassified and orphan materials remain in the main queue without claiming solicitation.
- Added project `websiteUnsolicited` boolean (default false), an editable project setting, validated project/API/new-material-intake support, and source-preserving Materials filters. No text/notes guessing; existing-data classification requires a separately reviewed source-backed backfill.
- All-materials defaults, MCP aggregate, reading history and coverage behavior remain unchanged. Counts/previews use the same sorted snapshot; mark-read failure restores the row/count.
- Fixed project editing clearing legacy free-text genre when tags were untouched, discovered while testing classification edits. Material filters wrap on small screens.
- Synthetic real-DB/API/browser verification passed for disjoint partitions, orphans, filtered links/search, all sort modes, read success/failure, project edit/create/intake, coverage prefill, authentication and 1440/390/320 layouts. Full tests, typecheck and build passed; two existing lint errors documented separately. Not pushed or deployed.

## 2026-10-26 — Coverage read linkage and saved-detail prefill (local candidate)

- Saving Philip’s coverage transactionally marks the project and covered material read, preserving prior timestamps and workflow/evaluation fields. Select among multiple scripts; never infer reads for unrelated writer samples, attachments or later revisions. Imported/other-reader reports do not assert Philip read them.
- New coverage prefills saved project logline, synopsis and genre, preserving manual edits and rejecting stale cross-project material links. Sample-labelled materials do not inherit unrelated project summaries. Missing source details remain blank; no AI calls.
- Add nullable coverage genre, edit/detail support and source-backed fallback for older reports. Project Read badges/filter use reading history independently of workflow stage. Coverage entry works without materials; agreements no longer expose Start Coverage.
- Verified local synthetic database transactions, authenticated browser/API workflows, desktop/mobile viewport layouts, full existing tests, TypeScript and production webpack build. Additive migration required before rollout; not pushed or deployed.


## 2026-10-22 — Separate unread feature films (local candidate)

- Split the dashboard's combined full-script queue into **Unread TV Scripts** and **Unread Feature Films**, each with its own total and filtered Materials link. Pitch decks, treatments, bibles and one-pagers remain in the existing pitch-deck queue.
- Reuse the same sorted script snapshot for counters and previews. Preserve global script/readable sets, reading activity, saved priorities, today's-pick scoring, read controls and original age-badge date rules. The single global pick appears in its matching script queue.
- No schema, stored material type/read state, auth, API, deployment or production-data changes.
- Verified locally against a disposable synthetic PostgreSQL database: three disjoint queues and counts, matching view-all filters, sorting, feature today's pick, read error restoration, successful read update and final fixture read-state restoration; desktop 1440 and mobile 390/320 layouts. Existing test suite, TypeScript, scoped lint, production webpack build and diff checks pass.
- Audit: `../../audits/hawco-unread-features-20261022/`. Not pushed or deployed.

## 2026-11-12 — Agreements hub (isolated local candidate)
- Replaced the status-inferred register with explicit deal stages, four working views, manual type-selected creation and source-backed detail workflows.
- Added isolated restricted legal notes/files with exact-principal authorization; separate immutable business histories/documents; no generic MCP/private-field joins.
- Added reviewed atomic IP synchronization, date/payment uncertainty, manual reminder delivery/ack/snooze/retry and idempotent reviewed business import proposals.
- Additive seven-table migration and guarded rollback preserve stable legacy records. No live data, approved templates, deployment, external notices or actual payments.

- Review follow-up: immutable template registry with principal approval/retirement and exact version lineage; calendar month/year arithmetic with explicit end-of-month policies and leap tests.

## 2026-11-12 — Sourcing wanted list and lead tracker (local candidate)
- Separate research leads with evidence, reading basis, rights uncertainty, explicit decisions and existing contact/project/IP links; no automatic submissions or read-queue pollution.
- Atomic versioned edits, conservative identity dedupe, before/after history, sourced factual events separate from decisions, explicit conflict/error recovery.
- Live slate snapshot and append-only draft/approved sourcing brief; exact recorded labels and missing metadata remain explicit. Approval is an authenticated explicit action attributed to its actor.
- Session-authenticated APIs and sidebar navigation; existing jobs, MCP/auth configuration, legal records and rights-clearance states unchanged.
- Additive migration, guarded rollback and synthetic DB/HTTP/browser tests; no push/deploy/live-data import.

## 2026-11-13 — Shared slate classification (local candidate)
- Added nullable standardized format, engine, primary/secondary genre and flexible descriptor tags to projects, sourcing leads and IP; separate eight-stage project pipeline preserves existing workflow status and stage prose.
- Shared authenticated, origin-checked, version-guarded classification editors with transactional attributed audit; unrelated notes, read marks, coverage, rights, decisions and existing tags untouched.
- Standardized dashboard/list summaries and wanted-list counts/filters; unknown values stay explicit and legacy fields remain labelled reference data. Existing packaging needs/target network editable without duplicate columns.
- Additive enum/column migration only; no inferred classification, real-data backfill, scheduler changes or external actions. Details and rollback in docs/CLASSIFICATION.md.
