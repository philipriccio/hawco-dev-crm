# Hawco relationship preparation — local candidate

The existing Meetings page now includes a five-person buyer-first weekly shortlist, open incoming reply threads, upcoming meeting preparation, missing debrief preparation, CRM meeting records, buyer/company history, and draft timing preferences. No scores, external messages, reminders, scheduler or provider subscriptions are activated.

## Source isolation and review

Calendar sync and calendar reads fail closed unless both `HAWCO_CALENDAR_ID` (an exact non-`primary` calendar ID) and `HAWCO_CALENDAR_OWNER_ID` match the signed-in user's saved Google connection. These are deployment prerequisites, **not values inferred from a calendar name, attendee, email domain or subject**. Philip must independently identify/confirm the Hawco calendar; an operator must record that evidence before configuring this binding. Never use the Company Theatre calendar. Unknown source requires clarification, not a fallback.

Old cache rows have null `sourceCalendarId` and cannot be viewed or imported as Hawco meetings until re-synced against the approved source. A connection's calendar ID must be set to the verified explicit calendar ID; the old OAuth default `primary` remains deliberately ineligible. Reconnection/account identity and calendar access need live acceptance before any rollout. No credentials or live configurations changed here.

Sync is read-only with Google, follows pagination, retains exact source identity, and handles cancellation tombstones. It does not infer cancellation from absence in a partial/windowed response. Calendar imports require a fresh preview fingerprint. Apply rechecks/locks sources and serializes imports transactionally. Stable calendar/event keys prevent duplicate records; revisions update the same record. Scheduled/past calendar events remain PLANNED until someone explicitly confirms attendance. Cancelled events are labelled CANCELLED, never attendance evidence. Contacts link only on one unambiguous exact email match. Imported participant revisions preserve other manual links. Existing notes, follow-up text and project links remain intact.

## Historical notes

Backfill recognizes only an unambiguous `YYYY-MM-DD - Met ...` line (including dash/colon variants), rejects invalid/future dates and cancellation/planning qualifiers, and records DAY precision. Month-only dates, ambiguous prose and unsupported formats remain untouched for manual review. Original contact notes are byte-for-byte preserved; each meeting retains its original line/contact/date provenance. Identical repeated lines for one contact deduplicate. Similar-looking notes across contacts are **not** merged without identity evidence. A new source that overlaps an existing same-day meeting for the same contact blocks the whole apply transaction for manual review; it is not silently merged or duplicated. This conservative overlap check can also flag two genuinely different meetings on one day. Edits to original historical lines require human review; content-identical imports are idempotent, not a general natural-language record-merging system.

## Notes, projects and email evidence

`POST /api/networking` action `note` accepts an exact meeting ID, stable source key, explicit BUSINESS classification, NOTES/TRANSCRIPT/DEBRIEF kind, source reference and bounded text. It never guesses a Google Meet/Drive identity, fetches a URL, or imports files. Existing identical evidence is idempotent; changed evidence requires a new source revision. Debrief repeat submissions deduplicate. Legal-classified content is refused and belongs in the existing restricted Legal workspace. No legal tables/search/permissions are changed or incorporated.

Google Meet/Drive automatic discovery and ingestion **are not connected**. Source-to-meeting identity, provider permissions and a verified ingestion channel remain prerequisites. Before/after meeting prompts currently appear in the CRM; they are not delivered notifications.

Project links require explicit selection, confirmation and evidence reference; a transactional activity record preserves attribution. No keyword/title matching or rights/approval inference.

Action `email` records reviewed message metadata from the exact existing Hawco mailbox only. It requires explicit INCOMING/OUTGOING direction, message ID, counterparty email, date and source reference. Counterparty must match exactly one existing contact. Message/contact keys are unique; conflicting reimports are refused. No messages are sent, fetched or marked read. The existing reply tracker supplies only incoming facts. Resolved/dismissed reply states never imply Philip sent a reply.

## Relationship summaries and reminders

Last contact uses explicitly OCCURRED past meetings, received Hawco reply records and sourced email facts. Last incoming, outgoing and occurred-meeting dates remain separate in the API. Company history uses explicit current company links and latest known linked-contact fact, not domain/name inference. Missing data says “No contact date recorded,” not “never contacted.” Histories can be incomplete. The visible meeting record list is limited to the latest 500; relationship history queries are not truncated to that list.

Draft defaults are 56 days for buyers and 90 for existing priority contacts. Only existing `WANT_TO_WORK_WITH` priority evidence is used; no new taste/priority inference for agents. Thresholds are configurable from 14–365 days and conflict-safe. Notification enablement is deliberately rejected. Philip must agree thresholds and delivery/routing before any separate automation release. The list contains at most five contacts, buyers first; there is no relationship grade.

## Deployment / rollback

This is local only. Review the candidate with Philip before any push/deployment/live import. Additive migration: `20261115140000_networking/migration.sql`. Verify protected role grants for three new tables, existing Meeting/GoogleCalendarEvent additions and the import transaction's advisory/source-row locks. Run migration against a backup/restore-verified release environment and test existing APIs/consumers. No historical migration repair is included.

The adjacent `rollback.sql` refuses when new business records/preferences exist. After use, roll back application code and retain additive schema/evidence. Never delete populated meeting provenance, notes or sourced email history to make rollback work. Source credentials, source-note bodies, materials and legal workspace remain unchanged.
