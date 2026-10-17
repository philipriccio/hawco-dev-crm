# Dashboard focus — 17 October 2026

## Local delivery

- Removed Decisions Needed, Materials Reviewed total, and Reviewed Materials list, including their unused database queries.
- Project Next Steps uses the **same shared status list** as the Development Slate `/whiteboard`: EARLY_DEVELOPMENT, DEVELOPING, PACKAGING, PITCHED, DEVELOPING_WITH_NETWORK, GREENLIT. No submission/verdict heuristic. Distinct next-step content retained; whitespace-only actions removed at presentation.
- Emails to reply to: six-row preview, expand/collapse, sender, subject, received date, context, Gmail link, Mark handled, No reply needed, immediate Undo. Save errors retain rows and show explicit feedback. No sending/drafting capability.
- Funding and rights widgets unchanged for parent-owned evidence/data work.

## Data contract / rollout

Apply additive `prisma/migrations/202610171530_email_replies/migration.sql` BEFORE starting this release. Only new EmailReply table + indexes/check constraint; no existing data rewrite. Prisma client regeneration is in normal build.

Authenticated API `/api/email-replies`:

- GET: all rows including closed rows, for reconciliation.
- POST `{items:[{mailbox,threadId,latestMessageId,sender,subject,context,receivedAt}]}`: atomic upsert, maximum 200 rows; duplicate mailbox/thread keys within one batch rejected. Mailbox must be `philip@hawcoproductions.com`; Gmail IDs hexadecimal; receivedAt ISO timestamp with timezone. Context max 2,000 characters (scanner should write 1–2 concise sentences).
- `latestMessageId` means **latest actionable incoming request being tracked**, not an internal acknowledgement or arbitrary last message in the thread. `receivedAt` is that same request's timestamp. Review the whole thread before deciding a reply is still needed.
- Unique mailbox + threadId prevents duplicate listings. Repeating the same actionable message preserves RESOLVED/DISMISSED. A different actionable message at a non-older timestamp reopens. Older input cannot overwrite newer content. Omitted threads never auto-resolve: scans can be partial.
- PATCH `{id,latestMessageId,status}` with OPEN, RESOLVED or DISMISSED. Message ID guards against closing a newly arrived request from a stale page; conflict returns 409. Resolve only with positive thread evidence or owner's manual action.
- Stored Gmail link derived from mailbox/threadId; no arbitrary URLs rendered.
- Imports and manual operations require the existing authenticated session boundary. Direct Prisma import must enforce the same validation/update policy in `src/lib/email-replies.ts`.
- No recurring-job settings were changed here; parent owns automation and Gmail reconciliation.

Rollback application code to preceding commit if needed; retain new table and evidence. Do not drop the table after data intake.

## Verification

- Production build: PASS (`npm run build`, synthetic PostgreSQL URL).
- Independent `npx tsc --noEmit`: PASS.
- ESLint of changed TS/TSX: PASS.
- Full `npm test`: PASS, including new runtime email tests. Existing source-string assertions updated only where owner-requested UI removal/shared slate extraction made them obsolete.
- New email tests exercise input validation, exact slate membership, duplicate rejection, closed-row persistence, newer-message reopen, stale scan protection, authentication-before-access, stale PATCH conflict and private-error redaction.
- New migration applied successfully against schema-derived synthetic local PostgreSQL baseline. Existing historical migration chain cannot initialize an empty database (first historical migration expects ProjectStatus to exist); this pre-existing limitation does not affect incremental new-table SQL. No production migration performed by this child.
- Real Next production server + actual PostgreSQL + browser: authenticated dashboard six-state membership inclusion/exclusion; removed widgets absent; six-row expand; handled + undo; dismiss + reload; same-message import preserves dismissal; newer-message import reopens; stale resolve returns 409; simulated save failure retains row; anonymous endpoint access blocked (existing middleware redirects to login).
- Browser at 1440/390/320: no document horizontal overflow or page errors. Desktop/mobile screenshots inspected; anchored email widget and controls accessible in main scroll container.
- Knowledge graph rebuilt; left uncommitted with prior unrelated docs/strategy changes.
- No sends, production data/config edits, push or deployment.

## Evidence

Screenshots `dashboard-{1440,390,320}.png` and `emails-{1440,390,320}.png` contain **synthetic QA data only**. Preview http://127.0.0.1:3213 uses isolated local database; synthetic session cookie deliberately not committed or included in report.
