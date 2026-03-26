# Dev Brief: Hawco CRM Feature Updates

**Date:** 2026-03-26
**Priority:** HIGH
**Working directory:** /Users/mildred/.openclaw/workspace/projects/hawco-dev-crm

## Overview

9 features/fixes. Handle them in order — commit after each one.

---

## 1. Rename "Market Intel" → "Research"

**Files:**
- `src/components/Sidebar.tsx` — change name and href
- `src/app/market-intel/page.tsx` — move to `src/app/research/page.tsx`
- `src/app/api/market-intel/route.ts` — move to `src/app/api/research/route.ts` (if exists, or update fetch URLs)
- Update the page title from "Market Intel" to "Research"

---

## 2. PDF Upload in Research Section

Add ability to upload PDF research reports.

**Schema change (prisma/schema.prisma):**
```prisma
model ResearchDocument {
  id          String   @id @default(cuid())
  title       String
  description String?  @db.Text
  fileName    String
  fileUrl     String   // URL to stored file
  fileSize    Int?
  tags        String?  // Comma-separated tags
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Files:**
- Add upload UI to the Research page (above or below the existing shows grid)
- Create API route `src/app/api/research/documents/route.ts` for CRUD
- Store files locally in `public/uploads/research/` for now (or use existing file upload infra if available)

---

## 3. Buyer Notes in Research Section

Add tabs/cards for major Canadian buyers with free-form notes.

**Schema change:**
```prisma
model BuyerNote {
  id        String   @id @default(cuid())
  buyer     String   // "CBC Comedy", "CBC Drama", "Netflix Canada", etc.
  notes     String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Default buyers to seed:** CBC Comedy, CBC Drama, Netflix Canada, Disney+ Canada, CTV/Crave, Amazon Canada

**UI:** Add a "Buyer Notes" section to the Research page. Cards or tabs for each buyer. Click to expand and edit notes. Auto-save on blur.

**API:** `src/app/api/research/buyer-notes/route.ts`

---

## 4. Contact Card Uniformity — All Fields Editable

**Problem:** Agent and Manager fields may not be editable after creation in some paths.

**Fix:** Verify the contact edit page (`src/app/contacts/[id]/edit/page.tsx`) has ALL fields from the contact model editable:
- name, email, phone, imdbUrl, notes ✅ (already there)
- type ✅
- company ✅
- agent ✅ (already there — uses search/select)
- manager ✅ (already there)
- writerLevel, writerGenres, writerVoice, citizenship, isCanadian, unionMembership
- agentVibe, execTitle, execRole, lookingFor

Make sure the contact detail page (`src/app/contacts/[id]/page.tsx`) shows all populated fields and has an "Edit" button that goes to the edit page.

---

## 5. Coverage → Project Data Sync

When coverage is saved, sync overlapping fields back to the project.

**Overlapping fields:**
| Coverage Field | Project Field |
|---------------|--------------|
| logline | logline |
| synopsis | synopsis |
| format | format |
| comps | comps |
| targetNetwork | (no direct field — add if missing) |

**Implementation:** In the coverage save API (`src/app/api/coverage/route.ts` or similar), after saving coverage, check if a project is linked. If so, update the project's logline, synopsis, format, genre, comps if they're currently empty (don't overwrite existing values).

---

## 6. Contact Card Color Trim

Add a thin colored left border to each contact card matching their type color.

**File:** `src/app/contacts/page.tsx`

In the contact card element (around line 197), add a left border:
```tsx
style={{ borderLeft: `4px solid ${typeColorMap[contact.type]}` }}
```

Where `typeColorMap` maps ContactType to a solid color (not the bg-* class).

---

## 7. Distinct Tag Colors for All Contact Types

**Current (some too similar):**
- WRITER: purple ✅ distinct
- AGENT: blue
- MANAGER: indigo ← too close to blue
- NETWORK_EXEC: green
- PRODUCER: orange ✅ distinct
- BUYER: emerald ← too close to green
- OTHER: gray ✅ distinct

**New colors (all distinct):**
```typescript
const typeColors: Record<string, string> = {
  WRITER: 'bg-purple-100 text-purple-700',
  AGENT: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-pink-100 text-pink-700',        // Changed from indigo
  NETWORK_EXEC: 'bg-green-100 text-green-700',
  PRODUCER: 'bg-orange-100 text-orange-700',
  BUYER: 'bg-yellow-100 text-yellow-700',       // Changed from emerald
  OTHER: 'bg-[#F2F4F7] text-slate-700',
}
```

Also create a solid color map for the card trim borders:
```typescript
const typeBorderColors: Record<string, string> = {
  WRITER: '#9333ea',     // purple-600
  AGENT: '#2563eb',      // blue-600
  MANAGER: '#db2777',    // pink-600
  NETWORK_EXEC: '#16a34a', // green-600
  PRODUCER: '#ea580c',   // orange-600
  BUYER: '#ca8a04',      // yellow-600
  OTHER: '#64748b',      // slate-500
}
```

Update in `src/app/contacts/page.tsx` and anywhere else these colors are defined.

---

## 8. Remove "High Priority Writers" from Dashboard

**File:** `src/app/page.tsx`

Remove the "High Priority Writers" section (around line 197). Keep the rest of the dashboard.

---

## 9. Follow-up Items

**Schema change:**
```prisma
model FollowUp {
  id        String   @id @default(cuid())
  contactId String
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  note      String   @db.Text
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Add to Contact model: `followUps FollowUp[]`

**Contact detail page (`src/app/contacts/[id]/page.tsx`):**
- Add a "Follow-up Items" section
- Text input to add new follow-up
- List of existing follow-ups with checkbox to mark complete
- Delete button on each

**Dashboard (`src/app/page.tsx`):**
- Replace the removed "High Priority Writers" with a "Follow-up Items" widget
- Shows all incomplete follow-ups across all contacts
- Each item shows: contact name + note + date added
- Click contact name → goes to contact detail
- Checkbox to mark complete from dashboard

**API:** `src/app/api/follow-ups/route.ts` — CRUD for follow-ups

---

## After All Changes

1. Run `npx prisma migrate dev --name hawco-features-mar26` to apply schema changes
2. Run `npx prisma db seed` if buyer notes need seeding
3. Test locally: `npm run dev`
4. `npx tsc --noEmit` must be clean
5. Commit each feature separately with clear messages
6. Do NOT push to stable-deploy — Mildred reviews first
