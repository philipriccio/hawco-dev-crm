# Shared Active Development ordering

Dashboard-only shared priority order. All authenticated CRM browser users may reorder. Slate membership remains the shared six-status constant; project fields, updatedAt, status, and Slate ordering are untouched. All writers, explicit IP, stage, and next steps remain displayed.

The additive migration creates a singleton DashboardDevelopmentOrder row and seeds it from the existing updatedAt-desc/id-asc dashboard order. Later unranked projects append by createdAt/id, and inactive projects retain their saved slot. Deleted project IDs are pruned on the next successful save.

GET/PUT `/api/dashboard/development-order` requires authentication; PUT additionally requires same-origin JSON. Saves submit the entire active membership and prior revision. A locked singleton serializes saves, project row share locks prevent concurrent status updates during validation, and stale revision or changed membership returns 409 without writing. New rows committed after the validation snapshot append on the next read. No stale tab can overwrite a newer order. Read transactions use RepeatableRead so revision and membership are consistent.

Drag handles support pointer/mouse/touch, edge scrolling and Escape/cancel. Up/down buttons are keyboard accessible. Controls disable during save. On any failure the UI restores its prior order and locks edits until a fresh authenticated reload succeeds; an ambiguous network failure is never presented as confirmed success.

## Release gate

Candidate only; parent must approve deployment. Take a fresh protected backup/restore proof. Run `prisma migrate deploy` before serving this candidate; missing storage intentionally fails visibly rather than silently inventing an order. This migration changes no existing rows or indexes. Build normally regenerates Prisma client within the isolated deployment image. Local verification reused the matching existing client with parameterized SQL, without regenerating a shared client.

Verify production auth, authenticated dashboard order save/reload, second-session shared order, stale-tab conflict, all existing active content, and responsive drag/keyboard controls. Do not use real project order for synthetic live tests without release scope approval.

## Rollback

Preferred: redeploy previous application commit; retain additive table and saved user order. No Project changes need undoing. Do not restore a full old database over concurrent user work.

Only if removing this feature permanently, after preserving/exporting the order and stopping all candidate code, an approved DB administrator may `DROP TABLE "DashboardDevelopmentOrder"`. Never drop it while this candidate serves traffic. Prisma migration history reconciliation is a separate DBA operation; do not rewrite applied migration checksums. Synthetic rehearsal verifies migration, data preservation, removal, and reapplication on a dedicated disposable database.

## Tests

`DATABASE_URL=postgresql://mildred@localhost/hawco_dashboard_order_dev_20261112 node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-dashboard-order.ts`

The test refuses any host/database other than that named local synthetic DB, resets its synthetic Project data, and leaves fixtures for parent browser QA. Never run against production.
