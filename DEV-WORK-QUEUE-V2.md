# Hawco CRM — Dev Work Queue V2 (Feb 24)

**Priority:** HIGH — These are blocking Philip's workflow
**Source:** Philip's direct feedback from testing
**Deploy after each fix** — So Philip can test progressively

---

## 🎯 CORE WORKFLOW CHANGE

**The data model must enforce this flow:**
1. **Project** is created first
2. **Material** (script) is uploaded and linked to the Project
3. **Coverage** can then be created for that Project/Material

This ensures every Coverage has a Project and Material. No orphaned data.

---

## 🔴 CRITICAL BUG FIXES

### 1. Scripts "Read/Need to Read" Toggle NOT WORKING
- **Location:** Dashboard "Scripts to Read" widget + anywhere read status appears
- **Issue:** Philip can't mark scripts as read or "need to read"
- **Expected:** Click toggles between states, saves immediately
- **Check:** Recent commit `5355c3a` supposedly added this — find out why it's broken
- **Files to check:** Dashboard page, Material model, API routes

### 2. "View All" on Scripts Widget Goes to WRONG PAGE
- **Location:** Dashboard "Scripts to Read" widget → "View All" link
- **Issue:** Takes Philip to an empty/wrong project page
- **Expected:** Should go to a filtered list of all materials/projects with status "To be Read"
- **Fix:** Update the link to go to `/materials?status=TO_BE_READ` or `/projects?status=TO_BE_READ`

---

## 🟡 CROSS-LINKING REQUIREMENTS

### 3. Materials Must Appear Everywhere They're Referenced

When a material (script, bible, etc.) is uploaded, it should appear on:
- ✅ **Materials page** (`/materials`) — the main list
- 📍 **Coverage page** (`/coverage/[id]`) — show what material the coverage is for
- 📍 **Project page** (`/projects/[id]`) — show all materials for that project
- 📍 **Writer's page** (`/contacts/[id]` for writers) — show their materials

**For each page, add a Materials widget if missing.**

### 4. Coverage Page Needs Materials Widget
- **Location:** `/coverage/[id]/page.tsx`
- **Add:** A widget showing the material(s) this coverage relates to
- **Behavior:** Clicking material name goes to material detail page
- **If no material linked:** Show "No material linked" with option to link one

### 5. Coverage Page Must Link to Project
- **Location:** `/coverage/[id]/page.tsx`  
- **Add:** Clear link/breadcrumb to the parent project
- **Display:** Project title, clickable, goes to `/projects/[id]`

---

## 🟢 WORKFLOW ENFORCEMENT

### 6. Coverage Creation Requires a Project
- **Location:** Coverage creation form/API
- **Current:** Might allow orphan coverage
- **Fix:** Project selection is REQUIRED before coverage can be created
- **UI:** Project dropdown first, then coverage form fields
- **API:** Reject coverage creation if projectId is missing

### 7. Material Upload Flow
- **Location:** Material creation form
- **Current behavior:** Unknown
- **Required behavior:**
  1. If coming from a Project page: Project is pre-selected
  2. If coming from Materials page: MUST select a project (required field)
  3. Cannot create materials without a project link

---

## 📋 VERIFICATION CHECKLIST

Before reporting done, verify this complete flow works:

1. [ ] Create a new Project called "Test Project V2"
2. [ ] Upload a material (any PDF) linked to that project
3. [ ] View the project page — material appears in Materials widget
4. [ ] View the materials page — new material appears in list
5. [ ] Create coverage for "Test Project V2"
6. [ ] View coverage page — shows linked material AND links to project
7. [ ] Go to Dashboard — "Scripts to Read" shows correct items
8. [ ] Click "Mark as Read" on dashboard — status changes
9. [ ] Click "View All" on Scripts widget — goes to filtered list (not empty page)
10. [ ] If material has a writer, check writer's page shows the material

**Delete test data when done.**

---

## 🛠️ TECHNICAL NOTES

### Project Path
`/Users/mildred/.openclaw/workspace/projects/hawco-dev-crm/`

### Git/Deploy
```bash
cd /Users/mildred/.openclaw/workspace/projects/hawco-dev-crm
npx tsc --noEmit
npm run build
git add -A && git commit -m "fix: [description]"
git push

# Deploy
curl -X POST "http://159.89.120.69:8000/api/v1/deploy?uuid=l48gsw4wg0004wssgsk80kg0&force=true" \
  -H "Authorization: Bearer 2|A2o1wJUePCL5l6IMpEDVgesbHBTkLQYoiwg7eOx1c014e2df"
```

### Key Files to Check
- `/src/app/page.tsx` — Dashboard
- `/src/app/materials/` — Materials pages
- `/src/app/coverage/` — Coverage pages
- `/src/app/projects/[id]/` — Project detail
- `/src/app/contacts/[id]/` — Contact detail (for writers)
- `/prisma/schema.prisma` — Data relationships

---

## ⚠️ DO NOT

- Don't break existing coverage data
- Don't remove existing project associations
- Don't change the schema in ways that lose data
- Don't skip the verification checklist

---

*Created: Feb 24, 2026 ~12:55 PM EST*
*Source: Philip's direct testing feedback*
