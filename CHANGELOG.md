# Changes

## 2026-10-22 — Separate unread feature films (local candidate)

- Split the dashboard's combined full-script queue into **Unread TV Scripts** and **Unread Feature Films**, each with its own total and filtered Materials link. Pitch decks, treatments, bibles and one-pagers remain in the existing pitch-deck queue.
- Reuse the same sorted script snapshot for counters and previews. Preserve global script/readable sets, reading activity, saved priorities, today's-pick scoring, read controls and original age-badge date rules. The single global pick appears in its matching script queue.
- No schema, stored material type/read state, auth, API, deployment or production-data changes.
- Verified locally against a disposable synthetic PostgreSQL database: three disjoint queues and counts, matching view-all filters, sorting, feature today's pick, read error restoration, successful read update and final fixture read-state restoration; desktop 1440 and mobile 390/320 layouts. Existing test suite, TypeScript, scoped lint, production webpack build and diff checks pass.
- Audit: `../../audits/hawco-unread-features-20261022/`. Not pushed or deployed.
