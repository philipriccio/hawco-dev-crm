# Project Overview and Manage

Local candidate, 2026-11-13. No API, schema, authorization or data migration changes.

- The project route defaults to a read-only, server-rendered Overview of saved facts. Story, attached writers and linked IP, packaging, buyer targets, pipeline stage and next steps are distinct. Longer synopses and reference material use native disclosures.
- Explicit IP links do not imply rights clearance. Considered writers are separate from attached writers; buyer targets are separate from linked companies. Read history preserves recorded uncertainty and is independent of workflow status.
- Manage retains the existing project workspace and every existing control. Section links help navigate its longer content.
- The `tab=manage` query parameter survives reloads and save refreshes. The native history API integrates with Next's search parameters without a route transition. Both panels remain mounted so a tab switch does not discard edits. Arrow keys, Home/End, labelled panels and roving focus implement accessible tabs.
- Overview receives persisted server props, not local draft state. Navigating away or reloading still follows existing editor behavior; this change does not add a global unsaved-navigation guard.

## Verification

`node scripts/test-project-overview.cjs` uses only the existing isolated loopback `hawco_sourcing_dev_20261112` database. It upserts clearly named `overview-synthetic-*` fixtures, starts an ephemeral production preview at 127.0.0.1:3377, creates a random in-memory signing key, and shuts the preview down afterward. It requires the local Chrome/Playwright installation and a completed production build. It never accesses production.

Checks cover read-only Overview, explicit uncertainty/relationship semantics, dense/sparse records, keyboard/history/reload, title and classification draft preservation, actual title save and refreshed Overview, stale classification conflict, coverage navigation, material record link, and 1440/390/320 layouts. Screenshots/results are written to `../../audits/hawco-project-page-20261113/`.

Passed: full `npm test`, TypeScript, webpack production build, new-component/page ESLint, diff check, synthetic browser checks. Existing `ProjectDetailClient` has a pre-existing `react-hooks/set-state-in-effect` lint error and a `no-location-assign-relative-destination` warning in unchanged code; those are not reported as passing.

The existing management workflows are preserved structurally. This UI-only pass does not execute external AI coverage, file uploads, agreement creation or every destructive management action.
