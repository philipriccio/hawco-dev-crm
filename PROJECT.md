# Hawco Development CRM — Project Overview

## 🎯 Vision
A development tracking CRM for Hawco Productions (Allan Hawco's production company). Track scripts in development, writers, agents, managers, buyers, coverage reports, and meetings — everything needed to manage an active TV development slate.

## 👤 For Whom
Philip Riccio — Development Executive at Hawco Productions. Uses this daily to track submissions, coverage, contacts, and project status.

## 🏗️ Current State (Feb 21, 2026)
**Status:** Deployed and in active use
**URL:** https://hawco.companytheatre.ca
**Login:** philip@hawcoproductions.com / hawco2026

### What's Built
- **Dashboard** — Overview of projects, recent coverage, quick stats
- **Projects** — Full development slate tracking (Submitted → Released pipeline)
- **Contacts** — Writers, Agents, Managers, Buyers, Network Execs, Producers
- **Coverage** — Script assessments with scoring (1-10 scale, /50 total), verdicts
- **Materials** — Scripts, bibles, pitch decks linked to projects and writers
- **Meetings** — Calendar integration (planned)
- **Market Intel** — Industry news/notes
- **Settings** — App configuration

### Recent Features (Feb 21)
- Contact edit page with Agent/Manager dropdowns
- Writer linking on materials (create writer inline if needed)
- Manager & Buyer contact types
- Buyer "What They're Looking For Now" field
- Materials section on Writer profiles

### Known Issues
- Google Calendar integration pending (awaiting Philip's Google Cloud setup)

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
```bash
# Always commit and push FIRST
git add -A && git commit -m "description" && git push

# THEN deploy via Coolify API
curl -X POST "http://159.89.120.69:8000/api/v1/deploy?uuid=l48gsw4wg0004wssgsk80kg0&force=true" \
  -H "Authorization: Bearer 2|A2o1wJUePCL5l6IMpEDVgesbHBTkLQYoiwg7eOx1c014e2df"
```

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
*Last updated: 2026-02-21 by Mildred*
