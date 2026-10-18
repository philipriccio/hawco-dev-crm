# Buyers & Companies — local review, October 18, 2026

## Scope

- `/buyers` remains the buyer landing page with existing buyer order, cards, detail destinations and Research docs.
- Second URL-backed tab `/buyers?tab=companies` lists `PRODUCTION_COMPANY` and `DISTRIBUTOR` records; supports company/contact-name search and type filtering.
- Existing `/companies/[id]` pages now show website, region/type, sourced relationship notes, linked contacts with their relevant notes, and linked Hawco projects/roles.
- Dual-role companies retain access to buyer mandates/slate. Sidebar remains active on company details.
- Notes remain escaped text with HTTP(S) hyperlinks; no HTML execution. No schema, API, auth, cron, CMF, funding or follow-up changes.
- No contact import here: parent owns evidence-based email reconciliation independently.

## Verification

- `npx tsc --noEmit`: passed.
- `npm run lint -- --max-warnings=0`: passed.
- `npm test`: passed all existing suites. Updated one old sidebar exact-label assertion for the requested rename.
- `npm run build -- --webpack`: passed production build. Existing workspace-root/middleware/prisma configuration deprecation warnings remain.
- Real production-server browser proof against isolated local PostgreSQL `hawco_companies_20261018`; no production connection/configuration read or used.
- Synthetic fixtures: producer + contact + project, distributor with empty notes/contacts, buyer, dual-role distributor/buyer. No real people or business content.
- Browser widths 1440, 390, 320: buyer Research docs preserved; tab navigation, company/contact search, type filters, clear filters, no-match state, detail notes/source links, escaped HTML, project link, empty detail and dual-role buyer navigation all passed. No page errors or horizontal overflow. Desktop directory and narrow-mobile detail screenshots visually inspected.
- `agent-browser` initial launch found no bundled Chromium; existing installed Chrome used for browser QA (no installation).
- Knowledge graph rebuilt locally; remains uncommitted.

## Boundaries / review

No push, deploy, email, production writes or schema migration. Local proof is not production proof. Existing company fields are used as-is: classification is a single Company type, not a new multi-role model. User-authored notes are never changed. Editing contacts uses existing contact forms; no new company editing surface was added.

Preview: `http://127.0.0.1:3218/buyers` (synthetic DB only; authenticated browser session required). Screenshots in this directory are synthetic QA evidence, not business data.
