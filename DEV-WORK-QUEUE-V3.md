# Hawco CRM — Dev Work Queue V3 (Feb 24)

**Priority:** HIGH — Philip testing now
**Deploy after each fix** — So Philip can test progressively

---

## ISSUE 1: Contact Editing (CRITICAL)

**Problem:** No way to edit a contact. The contact page needs to be fully editable.

**Also:** Can't add Company to existing contacts — contacts created before the Company feature was added need to be editable with new fields.

**Required:**
1. Add "Edit" button on contact detail page (`/contacts/[id]`)
2. Create edit page (`/contacts/[id]/edit`) OR make fields inline-editable
3. **All fields must be editable:**
   - Name
   - Type (Writer, Agent, Manager, Network Exec, etc.)
   - Email, Phone
   - Company (dropdown to select existing or create new)
   - Agent (for writers)
   - Manager (for writers)
   - Notes
   - Any other fields on the contact

**Files:**
- `/src/app/contacts/[id]/page.tsx` — Add edit button
- `/src/app/contacts/[id]/edit/page.tsx` — Create this
- `/src/app/api/contacts/[id]/route.ts` — Ensure PUT/PATCH works

---

## ISSUE 2: Managers Widget Missing

**Problem:** No Managers widget in the Contacts section. Managers should be a category people can be labeled as and searched for.

**Required:**
1. Add "Managers" as a contact type (if not already in schema)
2. Add Managers widget/section on Contacts page (like Agents, Writers, etc.)
3. Make Managers searchable/filterable
4. On Writer contacts, should be able to assign a Manager (dropdown)

**Files:**
- `/prisma/schema.prisma` — Ensure MANAGER is in ContactType enum
- `/src/app/contacts/page.tsx` — Add Managers section
- Contact forms — Add manager selection for writers

---

## ISSUE 3: Calendar Not Synced

**Problem:** Calendar still not syncing. Upcoming Meetings not showing.

**Investigation needed:**
- Is Google Calendar API configured?
- Are credentials valid?
- Is there an error in the API calls?

**If not configured:** Add clear messaging about what's needed.
**If broken:** Fix the API integration.

**Fallback:** If calendar can't be synced, at least allow manual meeting entry.

**Files:**
- `/src/app/meetings/page.tsx`
- `/src/lib/google-calendar.ts` (if exists)
- Check API routes for meetings

---

## ISSUE 4: Missing Status Tags on Projects Page

**Problem:** No "Packaging" or "Considering" tags on the projects page. Need to be able to view and search by these statuses.

**Required:**
1. Ensure PACKAGING and CONSIDERING are in the ProjectStatus enum
2. Add filter buttons/tabs for these statuses on projects page
3. Make them searchable

**Files:**
- `/prisma/schema.prisma` — Check ProjectStatus enum
- `/src/app/projects/page.tsx` — Add status filters

---

## ISSUE 5: Project Sorting

**Problem:** Need better sorting options for projects.

**Required:**
1. **Default sort:** Alphabetically by title
2. **Date column:** Add "Date Received" or "Submitted Date" column
3. **Sortable columns:** Click column header to sort
4. **Sort options:**
   - Alphabetical (A-Z, Z-A)
   - Date (newest first, oldest first)

**Implementation:**
- Add `receivedDate` or `submittedAt` field to Project if not present
- Add sortable column headers
- Persist sort preference (optional)

**Files:**
- `/prisma/schema.prisma` — Add date field if needed
- `/src/app/projects/page.tsx` — Add sorting UI and logic

---

## DEPLOYMENT

After each fix:
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

---

## PRIORITY ORDER

1. **Issue 1** — Contact editing (blocking Philip's workflow)
2. **Issue 2** — Managers widget
3. **Issue 4** — Status tags (Packaging, Considering)
4. **Issue 5** — Project sorting
5. **Issue 3** — Calendar (may need credentials/config)

---

*Created: Feb 24, 2026 ~2:30 PM EST*
