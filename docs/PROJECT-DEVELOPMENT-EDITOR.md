# Project Active Development fields

The project detail page has a prominent Active Development section before Workflow. Its labels mirror the dashboard: Writers, Underlying IP, Status, Current stage, Next steps. Edit dashboard fields opens one form; Back to dashboard returns to the widget.

Writers are explicit ProjectContact WRITER links, not contact-type guesses or considered writers. Selecting an existing contact explicitly attaches it as a writer, preserving other roles. Underlying IP uses only IpProperty.projectId and offers unlinked/current-project records. Unchecking removes a relationship, never the record; linking does not infer ownership or rights clearance.

PATCH /api/projects/[id]/development requires browser authentication and same-origin JSON. It validates bounded allowlisted fields and a SHA-256 snapshot of updatedAt, displayed fields and relationship IDs. Serializable transactional writes preserve unrelated project fields and non-WRITER relationships. A conditional IP claim cannot steal another project's IP. An atomic ActivityLog entry records before/after fields. Existing linked IP rows are not touched for text-only changes.

The compact status picker offers the six Active Development statuses plus the current status. It cannot bypass reading/triage workflows or set outside-development statuses. An outside-status project has an explicit dashboard-exclusion notice; protected reading statuses remain unchanged here.

Successful save refreshes server data, remounting project editors on the new snapshot so prior local copies cannot stay stale. Any unconfirmed save locks the form pending Reload latest fields; no ambiguous response is presented as success. No schema, dependency, auth model, agreement or legal changes.

## Verification

- TypeScript: node_modules/.bin/tsc --noEmit passed.
- Scoped lint: new library, component, API and page passed --max-warnings=0.
- Real PostgreSQL tests: scripts/test-project-development.ts passes atomic persistence, malformed/unknown input, stale/concurrent conflicts, other-project IP protection, unchanged-IP field preservation, non-WRITER preservation, unlink-without-record-deletion and outside-status rejection. Test accepts only localhost/hawco_dashboard_order_dev_20261112 and cleans only its prefixed fixtures.
- Parent owns production build, authenticated HTTP rejection and browser save/error/return-to-dashboard acceptance. Child did not build, push or deploy.
