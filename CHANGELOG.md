# Changes

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
