# Shared slate classification

November 13, 2026 candidate. No automatic record classification or production backfill.

Project, SourcingLead and IpProperty share nullable `standardizedFormat`, `narrativeEngine`, `primaryGenre`, `secondaryGenre` enums and `descriptorTags` text array. Project additionally has nullable `pipelineStage`. The exact enum choices are in `src/lib/classification/domain.ts` and Prisma schema. Null means not recorded; it never implies a creative gap. Engine uses Episodic, not Procedural, with no Hybrid choice. Tags permit any number within a 20,000-character aggregate payload; each text value is limited to 200 characters. Existing ProjectTag relationships and old format/genre/currentStage prose are untouched. Display old fields as legacy labels/stage notes. `packagingNeeds` and `targetNetwork` use the existing project columns, not parallel fields.

All three detail screens expose the shared editor. Project list, IP list, sourcing list and Active Development show standardized classification. Wanted-list counts use standardized fields only and support format/engine/primary/secondary/pipeline filters; Not recorded is explicit. Counts show the entire active slate while project filters clearly report matching/total rows. Legacy genre, descriptor tags, blank buyer fields and absent IP links do not establish gaps or clearance. Six workflow statuses control active membership; eight pipeline stages describe milestones without changing workflow or reading state.

## Mutation contract

Session-authenticated, same-origin JSON PATCH `/api/classification/{project|lead|ip}/{id}`. Body: all five shared fields, `version` equal to the record's exact `updatedAt.toISOString()`. Project additionally requires pipelineStage, packagingNeeds and targetNetwork (null clears). Unknown keys, unsupported enum choices, invalid tag payloads and any notes/read/rights/decision/status fields are rejected. Database enum types also reject invalid taxonomy values. Serializable transactions plus conditional updatedAt writes reject stale or concurrent changes with 409. Project/IP writes audit attributed before/after classification state in ActivityLog; lead writes append attributed SourcingEvent and advance the existing lead version so stale research/decision editors also conflict. No legal data is read into these histories.

Legacy generic project and MCP project writers keep existing supported fields. They explicitly reject standardized fields instead of silently pretending to save them. New entities are created by existing workflows and then classified on their detail page; taxonomy is not inferred at creation. There is no automatic linked-record propagation. A sourcing lead's taxonomy edit never changes its decision, rights, links or reading basis. Existing exact-principal sourcing-brief approval remains unchanged.

## Migration and rollback

Additive migration `20261113163000_classification`: four enum types and nullable/default-empty columns; no legacy row rewrite or mapping. Deploy after verified backup/restore; regenerate Prisma and build before rollout. Roll back the application to the prior image while retaining these additive columns and data. Do not drop populated classification columns or restore a predeploy database over later writes. A future destructive schema rollback requires separate reviewed data export/restoration.

`test-classification-migration.cjs` rehearses additive migration over populated synthetic legacy rows inside a rollback-only transaction and checks all prior columns/rows survive exactly. Existing incomplete blank-database migration history is not repaired here.

## Checks

- `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-classification.ts`
- `DATABASE_URL=postgresql://mildred@localhost/hawco_sourcing_dev_20261112 npm run test:sourcing:db` seeds isolated synthetic fixtures (destructive only to that guarded fixture DB).
- Same local DB with `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-classification-db.ts` for persistence, invalid input, stale/concurrent writers, retained unrelated state and actor audits.
- Same local DB with `node scripts/test-classification-migration.cjs` for rollback-only migration rehearsal.
- `npx next build --webpack`, then same local DB with `node scripts/test-classification-http.cjs` for local3375 authentication/forgery/origin, legacy rejection, three editors' save/reload/stale-error paths, filters and desktop/mobile layouts.
- `npm test`, `npx tsc --noEmit`, scoped ESLint and diff checks.

Buyer-demand and combined weekly-shortlist workflows remain future work; no new jobs, schedules, automatic research/imports, outreach or approval authority is activated. Initial labels, pipeline stages and backfill decisions require separately sourced human direction. Import audit attribution must identify the actual operator and source; never impersonate Philip as the writer of assistant imports.
