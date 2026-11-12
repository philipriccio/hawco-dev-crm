# Agreements hub — local candidate

November 12, 2026. Additive candidate; no live import, scheduler, deployment, external notices, payments or template approval.

## Data and boundaries

- `ProjectAgreement` remains the stable record. Legacy IDs, notes, contacts, project links and single-file references are unchanged. No legacy text status maps to an explicit stage or acquired rights.
- Seven additive tables: `AgreementWorkspace` (validated business snapshot), `AgreementEvent` (append-only business revisions), `AgreementDocument` (immutable classified business bytes/hash), `AgreementLegal` (separate append-only restricted notes/files), `AgreementReminder`, `AgreementImport`, and immutable business-classified `AgreementTemplate` versions with reviewed approval history.
- Workspace FK restricts agreement deletion, including project cascades. The ordinary agreement API also returns a clear 409 for a workspace delete. Legacy unclassified agreement creation is retired with 410; project creation now links into the typed/classified workspace with its project prefilled. Existing general material/IP uploads are unchanged. No private relation is added to ordinary agreement/IP models or to MCP entity allowlists.
- Legal access uses exact immutable authenticated user IDs in `AGREEMENTS_PHILIP_USER_ID` and `AGREEMENTS_MILDRED_USER_ID`. Role ADMIN grants nothing. Unset values deny everyone. Do not put email guesses, role names, generic agent IDs or shared connector identities in these fields.
- Restricted file bytes live only in `AgreementLegal`, not public/local upload directories or generic object-store paths. Authenticated delivery is attachment-only, no-store, nosniff and sandboxed; no general unsigned URL or presigned redirect. Mixed, redline and advice uploads are restricted. Classification is mandatory before storage; UI defaults restricted. Upload limit 10 MB.
- Private entries carry private actor/time and immutable versions; no private values or metadata are written into global activity. Business snapshots/events/export do not join private tables. This is application access control, not a claim that an infrastructure/database administrator cannot access stored bytes.

## Workflows

All deals / Needs action / Dates & payments / same-type Precedents; explicit draft inclusion. New manual draft selects one of eight types and project/multiple IP works. No real template files were supplied. An explicit principal can upload a business-classified immutable template version, cite approval separately, retire it, and select an approved exact same-type version for a draft. Unavailable/unapproved/other-type files are rejected with manual fallback; no generation/substitution or approval is fabricated. Selected version/hash lineage survives retirement. Showrunner/shopping are provisional until explicitly approved.

Detail: overview, parties/roles/contact/loan-out/agent/lawyer/payee/signatures; type-specific sourced terms with unknown/zero/not-applicable/not-agreed states, structured money/formula/percentage/coowner allocations; repeatable periods; explicit stages/issues and reopening history; document versions and execution review; source-backed title checks; dates/payments; restricted Legal.

Internal approval is separate and principal-only. Executed copy filing requires the selected business-classified document, all required signature evidence, effective basis and satisfied/reviewed conditions. Operative terms are distinct from proposals; amendments name a same-field predecessor. Signed does not clear title.

Reviewed IP sync is principal-only, optimistic and transactional. It requires filed execution, evidenced title checks and no competing executed claims; distinguishes OPTIONED from acquired SECURED; updates only explicitly reviewed date/status fields, preserves chain-of-title status, and writes an immutable business before/after event.

Dates are date-only: absolute or relative anchors, integer day/month/year offsets, calendar/business rules, explicit timezone, weekend and user-entered holiday exclusions. Unreviewed/unknown/cyclic/invalid anchors remain unresolved. Extension/recalculation snapshots remain in history. Month/year arithmetic requires an explicit clamp-to-last-valid-day, preserve-end-of-month, or reject-overflow policy; January 31 and leap cases are tested. Month/year business-day combinations must be expressed as a calendar anchor plus a separate business-day offset. Conditional automatic extensions and legal-calendar nuances remain sourced and manually reviewed; no legal calendaring inference.

Payment triggers use evidenced AND/OR conditions. Conditional currency, formulas and unresolved exclusions stay needs-review; paid requires evidence. No money moves. Formula source/inputs/basis/exclusions/floor/cap/credits are retained, not evaluated as executable formulas or represented as guaranteed payable amounts.

Reminders run manually in-app only. IDs include agreement/date/resolved due date/lead time; repeated runs do not duplicate. Acknowledge, snooze, resume and retry attempts are visible. External adapter fails closed and records failure on an identified reminder; never a false sent status. No scheduler is installed or activated.

Human-readable plain-text business intake preview/download excludes restricted entries/files and unclassified legacy attachments; never emails. Backfill staging is business-only, 1–100 cited proposed terms, stable request IDs with payload fingerprints and optimistic expected versions; principal review/apply is atomic/idempotent. No live backfill performed.

## Verification and local preview

Use only a disposable PostgreSQL database named `hawco_agreements_dev_20261112` on loopback. Scripts enforce this boundary. No production `.env` or credentials are needed/copied. The candidate has an independent `node_modules`/generated Prisma client.

- `npm run test:agreements` — pure domain tests.
- `DATABASE_URL=postgresql://mildred@localhost/hawco_agreements_dev_20261112 npm run test:agreements:db` — **resets only this suite's synthetic project fixtures**, exercises transactional workflows, leaves demo records.
- `AGREEMENTS_TEST_PRODUCTION=1 DATABASE_URL=postgresql://mildred@localhost/hawco_agreements_dev_20261112 node scripts/test-agreements-http.cjs` — starts local production candidate on 127.0.0.1:3361, generates ephemeral in-memory auth, HTTP/security/browser tests, screenshots, then stops server. Requires host Chrome + existing global agent-browser Playwright package; not a runtime app dependency. Omit production flag to use dev server.
- Add `AGREEMENTS_TEST_EMPTY=1` for HTTP fail-closed empty-principal checks.
- Parent QA preview: `DATABASE_URL=postgresql://mildred@localhost/hawco_agreements_dev_20261112 node scripts/preview-agreements.cjs` (optional `--headed`). It starts the production candidate on loopback3361 and an authenticated synthetic-owner Chrome on loopback CDP3362; attach a named agent-browser session to3362. Auth credentials remain ephemeral in memory and are not printed or persisted. Stop the preview process to close both server and browser.

Current inherited migrations lack an initial schema. For a fresh synthetic database, generate/apply the base datamodel SQL first, then this additive migration; do not pretend `migrate deploy` on empty DB is verified. An existing deployed base uses its normal migration process after parent review. `scripts/agreements-rollback.sql` rehearses empty-table rollback and refuses when new agreement data exists. Preserve/export populated new data under an approved restore plan rather than dropping it.

## Boundaries / release review

- All supplied type requirements are recordable through sourced type-specific fields, structured money, periods, parties and checks. This is not a document editor, AI contract extractor, legal conclusion engine, live rate calculator, payment platform or external messaging service.
- Existing legacy attachments/notes remain in their prior access scope and are explicitly unreviewed. This implementation does not retroactively classify or move existing live documents; parent-reviewed migration is required before using it for real privileged material.
- The business-only classification is an explicit user assertion. The application cannot infer privilege from arbitrary free text; advice and identifiers must be entered in Legal.
- Main hub currently loads the business register for client filtering; large-scale pagination/search optimization is not implemented. Detail returns the most recent 100 business events and 20 import proposals; older events remain in DB, not deleted.
- Existing full lint has baseline React-hook diagnostics (20 errors, 2 warnings), identical at the base commit. New agreement code passes scoped zero-warning lint. See parent audit folder for exact baseline diff, build, HTTP/browser results and screenshots.
- No production identity allowlist has been configured. No approval to deploy or external sends is implied.
