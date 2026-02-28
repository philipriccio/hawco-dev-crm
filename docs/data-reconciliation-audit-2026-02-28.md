# Hawco CRM Data Reconciliation Audit (Post-Redesign)

Date: 2026-02-28  
Project: `hawco-dev-crm`  
Scope: read/unread, genre tags, Canadian flags

## Feasibility Answer

Short answer: **partially yes**.

- We can safely and deterministically reconcile core inconsistencies for:
  - `Project.status` vs script `Material.readAt`
  - `Project.genre` text vs linked `ProjectTag` genre tags
  - `Contact.isCanadian` where citizenship text clearly indicates Canada
- Full historical reconstruction to exact pre-redesign state is **not guaranteed** unless production has:
  - retained DB backups/snapshots from pre-redesign cutover, or
  - `ActivityLog` history populated for relevant period.

In this local environment, `ActivityLog` is empty (0 rows), so historical replay is not available here.

## What Changed in Semantics (from git history)

Relevant commits:

- `6c7b5a3` redesign workflow/UI changes (intake/dashboard)
- `5dbb428` adds workflow data fields/statuses
- `6c89cb2` read-state fix restoring reliable read/unread toggles
- `bc7f896` introduces `Contact.isCanadian`
- `86ea07c` switches Canadian UI from text-guessing to explicit boolean
- `fa249b1` introduces `ActivityLog`

Interpretation:

1. **Read semantics** now depend on both project status and material `readAt`, with bidirectional sync in APIs. Redesign period likely introduced temporary divergence that `6c89cb2` addresses.
2. **Genre semantics** are dual-represented (`Project.genre` text + `ProjectTag` links). These can drift without reconciliation.
3. **Canadian semantics** shifted from inferred text to explicit `isCanadian` boolean; legacy records may still rely on citizenship text.

## Recoverability / Provenance Findings

### Activity logs

- `ActivityLog` model exists and captures field-level `changes` for update routes.
- In this environment: **0 rows** (no historical replay possible locally).
- If production has rows, we can replay selected fields (`status`, `genre`, `isCanadian`, `readAt`) by timestamp/entity.

### Backups/snapshots

- No backup automation/runbook found in this repository itself.
- Production backup availability must be confirmed at platform level (Coolify/managed Postgres/provider snapshots).

## Deterministic Reconciliation Rules

Implemented with safety-first defaults:

1. **Read/unread reconciliation** (project status scope: `SUBMITTED`, `READING`, `READ` only)
   - If all linked script materials have `readAt`, set project status to `READ`.
   - If any linked script material is unread and status is `READ`, set status to `READING`.
   - Do not force changes for non-intake statuses (avoid overriding legitimate workflow states).

2. **Genre reconciliation**
   - Compute union of:
     - parsed `project.genre` tokens, and
     - currently linked tag names.
   - Normalize + sort; write canonical comma-separated `project.genre`.
   - Create missing tags (idempotent), then create missing `ProjectTag` links.
   - No deletions.

3. **Canadian reconciliation**
   - If `isCanadian=false` and `citizenship` clearly contains Canadian indicators, set `isCanadian=true`.
   - Conflicts (`isCanadian=true` but clearly non-Canadian citizenship text) are flagged as uncertain and not auto-overwritten.

## What Can / Cannot Be Reconstructed Confidently

### Confident

- Current-state consistency repairs using deterministic rules above.
- Canadian true-positives inferred from explicit citizenship text containing Canada terms.

### Not fully confident without historical data

- Exact prior read timestamps for materials if they were overwritten previously.
- Exact previous project status transitions outside current deterministic scope.
- Exact historical genre tag membership when both text and tags were edited over time without logs.
- Exact prior Canadian values when citizenship text is ambiguous or contradictory.

## Tooling Implemented

Added script:

- `scripts/reconcile-redesign-semantics.ts`
- npm command: `npm run reconcile:semantics -- [--sample=30] [--apply]`

Behavior:

- Default = dry-run, prints:
  - provenance summary (`ActivityLog` counts)
  - change counts by type
  - sample diffs
  - uncertain records
- `--apply` performs idempotent updates only (no destructive deletes).

## Local Run Results

Command run:

```bash
npx ts-node scripts/reconcile-redesign-semantics.ts --sample=30
```

Observed:

- `ActivityLog rows: 0`
- `Planned deterministic changes: total 0`
- `Uncertain records: 0`

This indicates the currently configured DB in this environment has no populated audit/activity history and no detected reconciliation candidates.

## Operator Runbook for Production

1. **Preflight**
   - Confirm target DB (`DATABASE_URL`) points to production clone or maintenance window target.
   - Take DB snapshot/backup before apply.

2. **Dry run first**

```bash
npm ci
npm run reconcile:semantics -- --sample=100
```

3. **Review output**
   - Validate counts and sample diffs with Philip.
   - Manually inspect uncertain records.

4. **Apply**

```bash
npm run reconcile:semantics -- --apply --sample=100
```

5. **Post-apply validation**
   - Re-run dry-run; expected total changes should be 0 or minimal.
   - Spot-check in UI: Intake, Project detail, Materials list, Contacts Canadian badges.

6. **Rollback plan**
   - Restore from pre-apply snapshot if unexpected broad drift appears.

## Verification

Executed:

- `npx tsc --noEmit`
- `npm run build`
- dry-run reconciliation script

All passed in local environment.
