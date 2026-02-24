# Hawco CRM — Dev Work Queue (Feb 23-24 Overnight)

**Priority:** HIGH — Philip needs this working for a full day of Hawco work tomorrow
**Deadline:** Before Philip wakes up (~8 AM EST, Feb 24)
**Deploy after each major section** — So Philip can test progressively

---

## 🚨 COMPLETED ITEMS (as of Feb 23 23:xx)

✓ Section 1.1: Calendar - Already has error handling for credentials
✓ Section 1.2: Company creation - Working (in settings)
✓ Section 1.3: Edit Project Button - Now links to /projects/[id]/edit page
✓ Section 1.4: Origin toggle - Already implemented as clickable toggle
✓ Section 2.1: Materials add page - Created at /projects/[id]/materials/add
✓ Section 2.2: Add Team Member page - Created at /projects/[id]/contacts/add
✓ Section 3: Tag categories - Added category field to schema, updated API
✓ Section 4.1: Reading -> To be Read - Renamed in all UI
✓ Section 4.3: Development Board - Added "Add from Submissions" button
✓ Section 5.1: Projects search bar - Added to projects page
✓ Section 5.2: Global search - Added Cmd+K search in sidebar
✓ Section 6: Coverage column - Added to projects list
✓ Section 8: UI polish - Added global styles in globals.css

---

## 🚨 CRITICAL RULES

1. **Run `npx tsc --noEmit` before reporting done** — No TypeScript errors
2. **Test every change locally** before committing
3. **Deploy frequently** — After each major section
4. **Don't break existing data** — This has real production data
5. **Commit often** — Small, focused commits

---

## SECTION 1: BUG FIXES (Do First)

### 1.1 Calendar Not Syncing
- **File:** `/src/app/meetings/page.tsx`, `/src/lib/google-calendar.ts`
- **Issue:** Philip's meetings not showing
- **Check:** Is Google Calendar API configured? Is token refreshing?
- **Note:** May need Philip's Google Cloud credentials — if blocked, add a clear error message and manual meeting add form

### 1.2 Company Creation Broken
- **File:** `/src/app/api/companies/route.ts`, company form components
- **Issue:** Philip tried to add a company, it didn't work
- **Fix:** Debug the POST endpoint, check form submission, add error handling

### 1.3 Edit Project Button Doesn't Work
- **File:** `/src/app/projects/[id]/ProjectDetailClient.tsx`
- **Issue:** Edit button non-functional
- **Decision:** Either fix the button OR make each widget on the page inline-editable (Philip prefers the latter)

### 1.4 Project Origin Toggle (Hawco Original/External)
- **File:** `/src/app/projects/[id]/ProjectDetailClient.tsx`
- **Issue:** Buttons don't work, should be toggleable like the "Developing" status widget
- **Fix:** Make it a clickable toggle that saves immediately (like status widget)

---

## SECTION 2: MISSING PAGES (Build These)

### 2.1 Development Board +Materials Page
- **Route:** `/src/app/projects/[id]/materials/new/page.tsx` (or modal)
- **Features:** 
  - Upload file (script, bible, pitch deck, etc.)
  - Select material type from dropdown
  - Link to project automatically
  - Optional: Link to writer

### 2.2 Add Team Member Page
- **Route:** `/src/app/projects/[id]/team/add/page.tsx` (or modal)
- **Features:**
  - Search existing contacts
  - Assign role (Writer, Producer, Attached Talent, Source)
  - Create new contact inline if needed

### 2.3 Inside Project +Materials
- Same as 2.1, ensure it works from both Development Board and Project Detail pages

---

## SECTION 3: GENRE/TAG SYSTEM OVERHAUL

### 3.1 Genre Dropdown on Projects
- **File:** `/src/app/projects/[id]/ProjectDetailClient.tsx`
- **Current:** Static "Crime" text
- **Fix:** Make it a dropdown populated from Tags where category = "genre"
- **Behavior:** Click to open dropdown, select genre, saves immediately

### 3.2 Settings → Tag Management
- **File:** `/src/app/settings/page.tsx`
- **Current:** Basic tag creation exists
- **Enhance:**
  - List all existing tags grouped by category
  - Add/Edit/Delete tags
  - Color picker for each tag
  - **RULE:** Each category can only use a color once (validate this)
  - Categories: Genre, Contact Type, Project Status, etc.

### 3.3 Tag Schema Update (if needed)
- **File:** `/prisma/schema.prisma`
- **Add:** `category` field to Tag model if not present
- **Run:** `npx prisma migrate dev --name add-tag-categories`

---

## SECTION 4: STATUS & DASHBOARD FIXES

### 4.1 Rename "Reading" to "To be Read"
- **File:** `/prisma/schema.prisma` (enum), all status references
- **Change:** `READING` → `TO_BE_READ` (or just display as "To be Read")
- **Update:** Dashboard widget to show these in "Scripts to Read"

### 4.2 Dashboard "Scripts to Read" Widget
- **File:** `/src/app/page.tsx`
- **Fix:** Should show all projects with status "To be Read"
- **Link:** Each item links to the project detail page

### 4.3 Development Board +Project Logic
- **File:** Development board page (find it)
- **Current:** Creates new project
- **Fix:** Should open a modal/dropdown to select from EXISTING submitted projects and move them to development
- **Behavior:** Only shows projects with status SUBMITTED or CONSIDERING

---

## SECTION 5: SEARCH

### 5.1 Projects Page Search Bar
- **File:** `/src/app/projects/page.tsx`
- **Add:** Search bar at top
- **Search:** Title, logline, writer names, genre
- **Behavior:** Filter list as you type (debounced)

### 5.2 Global Search in Sidebar
- **File:** `/src/components/Sidebar.tsx`
- **Add:** Search widget that's always visible
- **Features:**
  - Search everything (projects, contacts, coverage, materials)
  - Show categorized results
  - Keyboard shortcut: Cmd+K (or Ctrl+K)

---

## SECTION 6: PROJECTS LIST ENHANCEMENTS

### 6.1 Coverage Column
- **File:** `/src/app/projects/page.tsx`
- **Add:** "Coverage" column showing Yes/No
- **Behavior:**
  - "Yes" = links to coverage page
  - "No" = not clickable (or opens "Add Coverage" modal)
- **Query:** Check if project has any Coverage records

---

## SECTION 7: CONTACTS ENHANCEMENTS

### 7.1 Managers Tag Support
- **File:** Contact forms, `/src/app/contacts/`
- **Ensure:** Manager type is fully supported (should be, verify)
- **Add:** Manager selection on Writer contacts (like Agent)

### 7.2 Company Linking for Non-Writers
- **Current:** Company field exists
- **Fix:** Ensure Network Execs, Agents, Managers can all have Company associations
- **Verify:** Company dropdown works on all contact type forms

### 7.3 Contact Materials Widget
- **File:** `/src/app/contacts/[id]/page.tsx`
- **Features:** 
  - Add new material
  - Delete material (with confirmation)
  - Edit material metadata

---

## SECTION 8: UI UPGRADE 🎨

### 8.1 Color Scheme Refresh
- **File:** `/src/app/globals.css`, Tailwind config
- **Current:** Basic/plain
- **Goal:** Sleek, professional, modern media company vibe
- **Suggestions:**
  - Darker sidebar (slate-900 or similar)
  - Accent color: Deep blue or teal
  - Better contrast ratios
  - Subtle shadows and borders
  - Hover states on all interactive elements

### 8.2 Typography Polish
- Better font sizing hierarchy
- Consistent spacing

### 8.3 Card/Widget Styling
- Rounded corners
- Subtle shadows
- Better separation between sections

### 8.4 Button Consistency
- Primary, secondary, danger button styles
- Consistent sizing
- Loading states

---

## SECTION 9: LINK AUDIT

Go through EVERY page and verify:
- [ ] All navigation links work
- [ ] All "View" / "Edit" / "Delete" buttons work
- [ ] All form submissions work
- [ ] All modals open/close properly
- [ ] Back buttons work
- [ ] Breadcrumbs are correct

---

## SECTION 10: POLISH (If Time)

### 10.1 Loading States
- Add loading spinners to all async operations
- Skeleton loaders for lists

### 10.2 Error Handling
- User-friendly error messages
- Toast notifications for success/failure

### 10.3 Empty States
- Nice messaging when lists are empty
- Call-to-action buttons

### 10.4 Keyboard Shortcuts
- Cmd+K: Global search
- Escape: Close modals

---

## DEPLOYMENT CHECKLIST

After each section:
```bash
# 1. Type check
npx tsc --noEmit

# 2. Build test
npm run build

# 3. Commit
git add -A && git commit -m "feat: [description]"

# 4. Push
git push

# 5. Deploy
curl -X POST "http://159.89.120.69:8000/api/v1/deploy?uuid=l48gsw4wg0004wssgsk80kg0&force=true" \
  -H "Authorization: Bearer 2|A2o1wJUePCL5l6IMpEDVgesbHBTkLQYoiwg7eOx1c014e2df"
```

---

## QUESTIONS FOR MILDRED

If you get stuck or need clarification:
1. Use `sessions_send` to ask me
2. Or leave a note in this file with [QUESTION] tag
3. Don't guess on business logic — ask

---

*Created: Feb 23, 2026 21:20 EST*
*Priority: Get as much done as possible before 8 AM*
