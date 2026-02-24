# Hawco CRM - Dev Work Queue V4

**Created:** Feb 24, 2026
**Priority:** High — Philip tested and found issues

---

## Context

When uploading a script via the Materials page:
- User can select/create a writer ✅
- User can create a new project if none exists ✅
- BUT the writer isn't linked to the project as a team member ❌
- AND Philip wants to add more project info during upload (one-step flow)

---

## Issue 1: Writer Not Linked to Project

**Problem:** When uploading a material with a writer and creating a new project, the writer is saved on the material but NOT added to the project's team members.

**Root cause:** The materials page creates the project via `/api/projects` but doesn't create a `ProjectContact` record linking the writer.

**File:** `/src/app/materials/page.tsx` — `handleSubmit` function

**Fix:**
After creating the project, also create a ProjectContact if there's a writer:

```typescript
// After project creation, link writer as team member
if (finalWriterId && finalProjectId) {
  await fetch(`/api/projects/${finalProjectId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contactId: finalWriterId,
      role: 'WRITER',
    }),
  })
}
```

---

## Issue 2: "Add Team Member" Link Not Working

**Problem:** On the project detail page, the "Add Team Member" link doesn't work.

**Check:** Navigate to `/projects/[someId]/contacts/add` — does it 404 or error?

**File to check:** `/src/app/projects/[id]/contacts/add/page.tsx`

The page exists. Check if:
1. The link href is correct (should be `/projects/${project.id}/contacts/add`)
2. The page renders without errors
3. Suspense boundary needed?

---

## Issue 3: Expand Upload Modal for Full Project Info

**Request:** When uploading a script that creates a new project, show additional fields so user can enter all project info in one step.

**Current flow:**
1. Upload script → create material + barebones project
2. Go to project page → add more info

**Desired flow:**
1. Upload script → create material + full project (with source contact, origin, logline, etc.)

**Implementation:**

When "Create new project" is selected in the Materials upload modal, show additional optional fields:

```
[ ] Create new project (checkbox or dropdown selection)

--- If checked, show these fields: ---
• Logline (textarea)
• Origin: ○ Solicited  ○ Unsolicited (radio)
• Source Contact (dropdown - who brought it to us)
• Genre (dropdown)
• Format: ○ Film  ○ Series (radio)
```

Then pass these to the project creation API.

**Files to modify:**
- `/src/app/materials/page.tsx` — Add form fields, update handleSubmit
- `/src/app/api/projects/route.ts` — Already supports these fields

---

## Checklist Before Done

1. [ ] Upload a script with a new writer + new project → Writer shows in project team
2. [ ] "Add Team Member" link works from project page
3. [ ] Upload modal shows extra fields when creating new project
4. [ ] Test the full flow end-to-end
5. [ ] `npx tsc --noEmit` passes
6. [ ] Commit, push to main AND stable-deploy, trigger deploy

---

## Deployment

```bash
git add -A && git commit -m "feat: Link writer to project, fix team member link, expand upload modal"
git push origin main
git push origin main:stable-deploy

curl -X POST "http://159.89.120.69:8000/api/v1/deploy?uuid=l48gsw4wg0004wssgsk80kg0&force=true" \
  -H "Authorization: Bearer 2|A2o1wJUePCL5l6IMpEDVgesbHBTkLQYoiwg7eOx1c014e2df"
```
