# Hawco Development CRM — Project Overview

## 🎯 Vision
A development tracking CRM for Hawco Productions (Allan Hawco's production company). Track scripts in development, writers, agents, managers, buyers, coverage reports, and meetings — everything needed to manage an active TV development slate.

## 👤 For Whom
Philip Riccio — Development Executive at Hawco Productions. Uses this daily to track submissions, coverage, contacts, and project status.

## 🏗️ Current State (Mar 27, 2026)
**Status:** Live, deployed, and materially ahead of this document's previous Feb 21 state
**URL:** https://hawco.companytheatre.ca
**Login:** philip@hawcoproductions.com / hawco2026

### What’s Live Now
- **Dashboard** — Overview plus Follow-up Items widget replacing High Priority Writers
- **Projects** — Full development slate tracking (Submitted → Released pipeline)
- **Contacts** — Writers, Agents, Managers, Buyers, Network Execs, Producers, with color-coded trims and distinct type tags
- **Coverage** — Script assessments with scoring, plus sync of overlapping fields back to linked projects on save
- **Materials** — Scripts, bibles, pitch decks linked to projects and writers
- **Research** — renamed from Market Intel; now includes PDF research uploads and buyer notes
- **Settings** — App configuration

### Mar 26 Release (deployed)
Nine-feature release shipped live:
1. **Market Intel → Research** rename
2. **PDF upload in Research**
3. **Buyer Notes** for CBC Comedy/Drama, Netflix Canada, Disney+ Canada, CTV/Crave, Amazon Canada
4. **Contact uniformity** — all type-specific fields editable
5. **Coverage → Project sync** on save
6. **Contact card left color trim** by type
7. **Distinct type colors** — Manager = pink, Buyer = yellow, etc.
8. **High Priority Writers removed** from dashboard
9. **Follow-up Items** per contact + dashboard widget

### Current Known Issues / Next Work
- Google Calendar integration still pending
- Project doc had gone stale; source files + git were the truth until this refresh
- Continue refining Hawco workflow/features based on Philip's real usage

### Apr 30 Auth Boundary Repair
- Source/browser audit found `/login` rendered inside the authenticated CRM shell and most CRM API handlers lacked explicit route-level auth guards.
- Commit `9de550a` fixes the public/auth layout split with `AppShell`, adds shared API auth/admin helpers, guards CRM API handlers, disables deployed seed endpoints, and protects upload config/upload routes.
- Verification: API guard scan found no unguarded CRM API handlers outside intentional public exceptions; `npx tsc --noEmit` passed; `npm run test` passed; `npm run build` passed.
- Remaining quality note: strict lint has 0 errors but still fails on pre-existing warnings; clean separately.

## 📜 History

### Feb 17, 2026 — Project Started
- Initialized Next.js 16 + TypeScript + Tailwind CSS v4 + Prisma 6
- Basic CRUD for contacts, projects
- Deployed to DigitalOcean via Coolify

### Feb 20, 2026 — Coverage System
- Built coverage feature matching Philip's existing Google Drive template
- Imported 6 historical coverages from Philip's email
- Scoring: 1-10 per category (Concept, Characters, Structure, Dialogue, Market Fit)
- Mandate checklist with toggle buttons (✓/✗)
- Verdicts: PASS / CONSIDER / RECOMMEND

### Feb 21, 2026 — Contact Enhancements
- Added Manager and Buyer contact types
- Agent/Manager dropdowns on Writer forms (new + edit)
- Writer linking on Materials
- "What They're Looking For Now" on Buyer contacts
- Fixed dashboard score to show /50 (was /25)
- VPS: Added 2GB swap to prevent build OOM crashes

## 🔧 Technical Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Prisma 6
- **Hosting:** DigitalOcean droplet (4GB RAM, Toronto)
- **Deploy:** Coolify (auto-deploy from GitHub)

## 📁 Key Files
- `/prisma/schema.prisma` — Database schema
- `/src/app/page.tsx` — Dashboard
- `/src/app/contacts/` — Contact management
- `/src/app/coverage/` — Coverage system
- `/src/app/materials/` — Materials management
- `/src/app/projects/` — Project tracking

## 🚀 Deployment

**⚠️ IMPORTANT: Coolify deploys from `stable-deploy` branch, NOT `main`!**

```bash
# Always commit and push to BOTH branches
git add -A && git commit -m "description"
git push origin main
git push origin main:stable-deploy  # <-- THIS IS CRITICAL

# THEN deploy via Coolify API
curl -X POST "http://159.89.120.69:8000/api/v1/deploy?uuid=l48gsw4wg0004wssgsk80kg0&force=true" \
  -H "Authorization: Bearer 2|A2o1wJUePCL5l6IMpEDVgesbHBTkLQYoiwg7eOx1c014e2df"
```

**⚠️ NEVER do in-container rebuilds.** Doing `docker exec ... npm run build` + `docker restart` does NOT deploy new code. Coolify runs a Docker image baked at deploy time — restarting re-uses the old image. The only way to get new code live is triggering a Coolify deploy (above), which builds a fresh Docker image from the latest GitHub commit.

**Verify deploy succeeded:**
```bash
ssh root@159.89.120.69 "docker ps --filter name=l48gsw4wg0004wssgsk80kg0 --format '{{.Image}}'"
# Must show the new commit SHA, e.g. l48gsw4wg0004wssgsk80kg0:8f39367f...
```

**Build takes 5–8 minutes.** Don't check too early.

## ⚠️ Critical Constraints
1. **VPS has 4GB RAM** — Builds use swap, may be slow but won't crash
2. **Coolify pulls from GitHub** — Must push before deploying
3. **Basic auth on site** — Don't remove authentication

## 🚫 What NOT to Do
- Don't deploy without pushing first (Coolify pulls from repo)
- Don't change auth without Philip's approval
- Don't modify existing coverage scores/data without asking

## 📋 Pending Features
- [ ] Buyers → Project linking
- [ ] Google Calendar integration
- [ ] Project edit page improvements

---
*Last updated: 2026-03-27 by Mildred*

## 2026-04-30 — Connected-flow repair pass

Commit `abd5681` repairs the first connected-flow audit pass after Philip reported that Project Detail → Add Material → Upload New did not actually upload a file.

Fixed locally and pushed to both `main` and `stable-deploy`:
- Project Add Material now uses the real `/api/upload` file upload flow for PDF/DOC/DOCX/TXT instead of only requiring a pasted URL.
- Materials API supports `orphans=true` for Project Add Material → Link Existing.
- Whiteboard Add Project → Add from Submissions handles the actual `/api/projects` array response.
- Project Add Contact uses valid `NETWORK_EXEC` enum for Network Executive contacts and stops sending unsupported contact payload fields.
- Project Detail → Add Coverage now lets `/coverage/new?projectId=...&scriptId=...` prefill project/script context and persist `scriptId`.
- Project Detail now fetches and displays directly linked project coverages, not only material-linked coverage, and excludes direct coverages from the Link Coverage dropdown.
- Coverage page now honors `projectId` links and displays score totals on the stored `/25` scale.
- Added regression checks in `scripts/test.js` for connected project/material/coverage flows.

Verification before deploy:
- `npm run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test` passed.
- `npm run build` passed.
- `git diff --check` passed.

Deployment:
- `abd5681` was deployed and live-smoked. It repaired the connected project/material/coverage flows, but Philip’s live browser still experienced Upload New as broken.
- Follow-up commit `b31450a` changed Project Add Material upload to a submit-driven flow: selecting a file only stages it, and clicking Add Material performs upload + attach with visible status/errors. `b31450a` was deployed and verified live with a production test upload/delete on Halfyard.
- Follow-up commit `7a2501e` forced app routes dynamic/no-store to reduce stale route/client payload issues, but briefly broke `/login` because client page exports were invalid. Corrected by `0124a39`, which restored the login client page while preserving root no-store behavior.
- Live as of Apr 30 12:23 PM Cayman: Docker image `l48gsw4wg0004wssgsk80kg0:0124a39f2f1e8d368eccd531f69b241c71c0909b`; `/login` returns 200 with no authenticated shell strings; cache-control is `private, no-cache, no-store, max-age=0, must-revalidate`; invalid-cookie `/api/contacts` returns 401.
- Deploy reliability issue remains: Coolify/Nixpacks performs slow cold builds (`apt-get`, `npm ci`, `next build`, no build cache) and can fail at Docker image export despite successful app builds. Next infrastructure cleanup should move this app to a cache-aware Dockerfile/build setup before more rapid CRM iteration.
