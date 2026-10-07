# Hawco CRM improvements — October 6, 2026

Status: implemented and verified locally; production unchanged. User authorized audit recommendations. Scope is the first reliability/workflow/interface release, not completion of every longer-term product concept.

## Implemented

- Transactional material/project/writer intake with idempotency/fingerprint conflict detection and explicit per-document reading state. Project stage/verdict never imply reading; reading does not overwrite development stage.
- Unread drafts on reviewed projects remain visible. Coverage shown for a reviewed material must belong to that exact material.
- Material families, predecessor chains, current approval, approval audit events, serializable updates and uniqueness guard. Existing records not auto-classified or approved.
- Submission release state, evidence and reviewer; defaults to needs review without inferring legal status.
- Dated/owned project/contact follow-ups, waiting-on, edit, completion/undo. Toronto business-day handling, including late-evening UTC boundary.
- Today decision/follow-up/rights/reading sections, secondary statistics, priority preservation, real grouped search, mobile drawer, keyboard board-stage move, accessible material dialogs and labels.
- URL-preserving material filters/exact search destinations, race cancellation, visible failures/retry.
- Explicit source-email/Drive vs uploaded-document links. Local development uploads private/authenticated; production fails closed when durable storage is absent.

## Evidence

- npm test passes existing contracts + executable global search, follow-up/version validation, and intake rollback/retry tests.
- npm run lint -- --max-warnings=0 passes.
- npx tsc --noEmit --incremental false passes. Next config historically skips type validation during build; the independent TypeScript gate was executed.
- npm run build passes from an isolated snapshot with cloned dependencies. First attempt with a node_modules symlink failed at Turbopack filesystem-root validation; cloned dependencies resolved the tooling issue without application changes.
- Additive migration applied successfully to an isolated baseline PostgreSQL schema at 127.0.0.1:55439/hawco_qa. No production DB commands.
- Actual authenticated local HTTP tests cover replay/conflict, reading independence, draft approval replacement, release validation, task project/contact visibility + undo, upload/download authorization, search and Today output.
- Actual PostgreSQL constraint tests cover concurrent approval uniqueness, project-only follow-up and required context. Approval event readback confirmed displaced approval retained.
- Browser proof: 390px and 1440px Today with no horizontal overflow; 390px project header fixed and measured; real form upload marked read; exact-material search navigation; modal Escape/focus restore; mobile nav focus restore; keyboard stage selector saved; version/release changes persist on reload; simulated material load failure shows error/retry rather than a false empty state.
- Screenshots and readable PDF under workspace audits/hawco-crm-2026-10-06/implementation/.

## Not claimed / release boundaries

- Not deployed or pushed. Existing production data was not changed.
- Existing Gmail/Drive material references were NOT converted to hosted files. Bulk binary ingestion, version classification and release verification remain a separate evidence-backed data pass; never infer from filename.
- Private production object-store upload/download/delete and authenticated live workflow proof remain required before declaring the document library ready.
- Upload is a separate storage write; cancelling after upload can leave an unreferenced object. No cleanup daemon or storage deletion lifecycle implemented in this release.
- No AI summaries, automatic responses, buyer-fit AI, or automated reading/approval backfill. Source-cited AI remains later work, conditional on verified documents.
- PROJECT.md and work-queue files contained pre-existing damaged modifications; preserved, excluded from this implementation commit. This file records the current implementation truth.

## Rollout sequence

Review this concrete local release; confirm production authorization and secure authenticated browser availability; take DB backup; apply additive migration; push approved release branches; trigger Coolify; verify deployed SHA, auth boundary and exact workflows. No credential in chat or docs. Do not treat local browser evidence as production proof.
