# Hawco CRM — Visual Redesign Spec v2
**Author:** Mildred | **Status:** AWAITING PHILIP APPROVAL  
**Scope:** Surface-level visual refresh. Layout unchanged. No functional changes.

---

## Design Direction

**Reference:** Attio, Linear, Vercel dashboard  
**Feeling:** Sophisticated internal tool. Dark sidebar, clean light content area. Confident, not flashy.  
**What changes:** Typography weight, color palette, card treatment, spacing, interactive states  
**What stays:** All layouts, all data structures, all navigation

---

## Color Palette

### Current (replace all of these)
- Accent: `amber-500` (#f59e0b) — feels dated, warm-yellow
- Background: `#f8fafc` (slate-50) — washed out
- Card borders: `border-slate-100` — almost invisible
- Active nav: `bg-amber-500/10` — too subtle

### New Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#F2F4F7` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-raised` | `#F8F9FB` | Hover states, nested cards |
| `--color-border` | `#E4E7EC` | Card borders, dividers |
| `--color-border-strong` | `#CDD2DB` | Input borders, table lines |
| `--color-text-primary` | `#101828` | Headings, primary text |
| `--color-text-secondary` | `#475467` | Labels, secondary text |
| `--color-text-muted` | `#98A2B3` | Placeholders, hints |
| `--color-accent` | `#2563EB` | Primary actions, active states (blue) |
| `--color-accent-light` | `#EFF6FF` | Accent backgrounds, badges |
| `--color-accent-text` | `#1D4ED8` | Accent text on light bg |
| `--color-success` | `#12B76A` | RECOMMEND verdict |
| `--color-warning` | `#F79009` | CONSIDER verdict |
| `--color-danger` | `#F04438` | PASS verdict, delete actions |
| `--color-sidebar-bg` | `#0F172A` | Sidebar background (stays dark) |
| `--color-sidebar-active` | `#1E293B` | Active nav item bg |
| `--color-sidebar-accent` | `#3B82F6` | Active nav icon color |

**Why blue instead of amber:** Blue reads as "professional tool." Amber reads as "consumer app." Attio, Linear, Vercel all use blue accents on dark sidebars.

---

## Typography

### Current issues
- Body text too light (font-weight: 400 throughout)
- Headings not strong enough
- Inconsistent sizing

### New type scale

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title (h1) | `text-2xl` (24px) | `font-bold` (700) | `--color-text-primary` |
| Section heading (h2) | `text-lg` (18px) | `font-semibold` (600) | `--color-text-primary` |
| Card title | `text-sm` (14px) | `font-semibold` (600) | `--color-text-primary` |
| Body / list items | `text-sm` (14px) | `font-normal` (400) | `--color-text-secondary` |
| Labels / metadata | `text-xs` (12px) | `font-medium` (500) | `--color-text-muted` |
| Badge text | `text-xs` (12px) | `font-semibold` (600) | varies by badge |

---

## Global CSS Changes (`globals.css`)

Replace entire file with:

```css
@import "tailwindcss";

:root {
  --color-bg: #F2F4F7;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F8F9FB;
  --color-border: #E4E7EC;
  --color-border-strong: #CDD2DB;
  --color-text-primary: #101828;
  --color-text-secondary: #475467;
  --color-text-muted: #98A2B3;
  --color-accent: #2563EB;
  --color-accent-light: #EFF6FF;
  --color-accent-text: #1D4ED8;
  --color-success: #12B76A;
  --color-warning: #F79009;
  --color-danger: #F04438;
}

body {
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.card {
  @apply bg-white rounded-xl border border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.06)];
}

.card-hover {
  @apply transition-all duration-150 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] hover:border-[#CDD2DB];
}

.btn-primary {
  @apply px-4 py-2 bg-[#2563EB] text-white font-semibold text-sm rounded-lg hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_2px_rgba(16,24,40,0.08)];
}

.btn-secondary {
  @apply px-4 py-2 bg-white text-[#344054] font-semibold text-sm rounded-lg border border-[#D0D5DD] hover:bg-[#F9FAFB] transition-colors shadow-[0_1px_2px_rgba(16,24,40,0.05)];
}

.btn-danger {
  @apply px-4 py-2 bg-[#F04438] text-white font-semibold text-sm rounded-lg hover:bg-[#D92D20] transition-colors;
}

.input {
  @apply w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-sm text-[#101828] placeholder-[#98A2B3]
         focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors
         shadow-[0_1px_2px_rgba(16,24,40,0.05)];
}

.badge {
  @apply inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold;
}

.pinned-card {
  @apply bg-white rounded-2xl border border-[#E4E7EC] shadow-[0_1px_4px_rgba(16,24,40,0.06)] overflow-hidden;
}
```

---

## Sidebar Component (`Sidebar.tsx`)

### Changes
- Background: keep `bg-slate-900` → change to `bg-[#0F172A]` (same, just explicit)
- Active state: change from `bg-amber-500/10 text-white` → `bg-[#1E293B] text-white`
- Active icon: change from `text-amber-500` → `text-[#3B82F6]`
- Inactive icon: change from `text-slate-500 group-hover:text-amber-500/70` → `text-slate-500 group-hover:text-[#3B82F6]`
- User avatar gradient: change from `from-amber-600 to-yellow-500` → `from-blue-600 to-blue-400`
- User role text: change from `text-amber-500/60` → `text-blue-400/60`
- Search `focus:ring-amber-500 focus:border-amber-500` → `focus:ring-blue-500 focus:border-blue-500`

### Exact class replacements in Sidebar.tsx

```
FIND:    bg-amber-500/10 text-white
REPLACE: bg-[#1E293B] text-white

FIND:    text-amber-500
REPLACE: text-[#3B82F6]

FIND:    text-slate-500 group-hover:text-amber-500/70
REPLACE: text-slate-500 group-hover:text-[#3B82F6]

FIND:    from-amber-600 to-yellow-500
REPLACE: from-blue-600 to-blue-400

FIND:    text-amber-500/60
REPLACE: text-blue-400/60

FIND:    focus:ring-amber-500 focus:border-amber-500  (in search input)
REPLACE: focus:ring-blue-500 focus:border-blue-500
```

---

## PinnedCard Component

Find all PinnedCard usages across the app. The color index system uses amber. Change to blue.

In whatever file defines PinnedCard (likely inline in ProjectDetailClient or a shared component), find the colorIndex → color mapping and replace amber entries:

```
colorIndex 0: border-t-blue-500   (was amber)
colorIndex 1: border-t-violet-500 (keep)
colorIndex 2: border-t-emerald-500 (keep)
colorIndex 3: border-t-sky-500    (was amber/slate)
colorIndex 4: border-t-indigo-500 (keep or adjust)
colorIndex 5: border-t-rose-500   (keep)
colorIndex 6: border-t-blue-400   (new for CoverageIQ)
```

PinnedCard header background: change from current amber-tinted to:
- Header bg: `bg-[#F8F9FB]`
- Header border-bottom: `border-b border-[#E4E7EC]`
- Title text: `text-sm font-semibold text-[#101828]`

---

## Button / Badge Replacements (global find & replace)

These are used throughout many pages. Do a global search-and-replace across all `.tsx` files:

| Find | Replace |
|---|---|
| `bg-amber-500` | `bg-[#2563EB]` |
| `bg-amber-600` | `bg-[#1D4ED8]` |
| `hover:bg-amber-600` | `hover:bg-[#1D4ED8]` |
| `text-amber-600` | `text-[#2563EB]` |
| `text-amber-700` | `text-[#1D4ED8]` |
| `text-amber-500` | `text-[#2563EB]` |
| `bg-amber-500/10` | `bg-[#EFF6FF]` |
| `bg-amber-500/20` | `bg-[#DBEAFE]` |
| `hover:bg-amber-500/20` | `hover:bg-[#DBEAFE]` |
| `ring-amber-500` | `ring-[#2563EB]` |
| `focus:ring-amber-500` | `focus:ring-[#2563EB]` |
| `border-amber-500` | `border-[#2563EB]` |
| `border-amber-200` | `border-[#E4E7EC]` |
| `border-amber-100` | `border-[#E4E7EC]` |
| `bg-amber-50` | `bg-[#F8F9FB]` |
| `bg-amber-100` | `bg-[#EFF6FF]` |
| `text-amber-800` | `text-[#1E40AF]` |

**Exceptions — do NOT replace amber in these contexts:**
- Coverage verdict badges (PASS/CONSIDER/RECOMMEND) — these use semantic colors, handle separately
- Any place amber is intentional brand color in the logo area

---

## Verdict Badges (Coverage pages)

Replace current amber-based verdict colors with semantic palette:

```
RECOMMEND: bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]
CONSIDER:  bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]
PASS:      bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]
```

---

## Card / Page Background

Global find and replace:
```
bg-slate-50  → bg-[#F2F4F7]
bg-slate-100 → bg-[#F2F4F7]  (where used as page bg)
border-slate-100 → border-[#E4E7EC]
border-slate-200 → border-[#E4E7EC]
shadow-sm → shadow-[0_1px_3px_rgba(16,24,40,0.06)]
```

---

## Inputs & Forms (global)

All inputs: ensure they use the `.input` class or equivalent:
- Border: `border-[#D0D5DD]`
- Focus ring: `ring-[#2563EB]/20 border-[#2563EB]`
- Background: `bg-white`
- Shadow: `shadow-[0_1px_2px_rgba(16,24,40,0.05)]`

---

## Typography & Font

Inter is already loaded — good. Make it actually do its job:

### Font weight upgrades (global)
The current app uses `font-medium` (500) almost everywhere. Modern tools use sharper contrast between heading and body weights.

| Element | Current | New |
|---|---|---|
| Page titles (h1) | `font-medium` | `font-bold` (700) |
| Section headings (h2) | `font-medium` | `font-semibold` (600) |
| Card headers / PinnedCard titles | `font-medium` | `font-semibold` (600) |
| Nav items (inactive) | `font-medium` | `font-medium` (500) — keep |
| Nav items (active) | `font-medium` | `font-semibold` (600) |
| Table column headers | `font-normal` | `font-medium` (500) |
| Buttons | `font-medium` | `font-semibold` (600) |
| Badge text | `font-medium` | `font-semibold` (600) |
| Body / list text | `font-normal` | `font-normal` (400) — keep |
| Metadata / labels | `font-normal` | `font-medium` (500) |

### Letter spacing
Add to globals.css:
```css
h1, h2, h3 { letter-spacing: -0.02em; }
.badge { letter-spacing: 0.01em; }
button { letter-spacing: -0.01em; }
```

Tight letter spacing on headings is a signature of modern tool design (Linear, Vercel). Makes text feel crisp rather than loose.

---

## Buttons — Geometry & Spacing

### Current problems
- Buttons have inconsistent padding
- Border radius too uniform (everything is `rounded-lg` = 8px)
- No visual hierarchy between primary, secondary, ghost actions
- Missing subtle shadows that give buttons tactile feel

### New button system

**Primary button** (blue, for main actions like Save, Create, Submit)
```css
padding: px-4 py-2 (16px / 8px)
border-radius: rounded-lg (8px)
font: text-sm font-semibold
shadow: shadow-[0_1px_2px_rgba(16,24,40,0.08)]
border: none
hover: brightness-110, translate-y-[-1px], shadow-[0_2px_4px_rgba(37,99,235,0.25)]
active: translate-y-0, shadow-none
transition: all 150ms ease
```

**Secondary button** (white with border, for secondary actions)
```css
padding: px-4 py-2
border-radius: rounded-lg (8px)
font: text-sm font-semibold text-[#344054]
background: bg-white
border: border border-[#D0D5DD]
shadow: shadow-[0_1px_2px_rgba(16,24,40,0.05)]
hover: bg-[#F9FAFB], border-[#CDD2DB]
transition: all 150ms ease
```

**Ghost button** (no background, for tertiary/inline actions like Edit, View)
```css
padding: px-3 py-1.5
border-radius: rounded-md (6px)
font: text-sm font-medium text-[#475467]
background: transparent
border: none
hover: bg-[#F2F4F7] text-[#101828]
transition: all 100ms ease
```

**Danger button** (red, for delete/destructive)
```css
Same geometry as primary, but bg-[#F04438] hover:bg-[#D92D20]
shadow: shadow-[0_1px_2px_rgba(240,68,56,0.15)]
```

**Icon button** (square, for icon-only actions)
```css
padding: p-2 (8px all sides)
border-radius: rounded-lg (8px)
hover: bg-[#F2F4F7]
```

### Exact class replacements for btn-primary in globals.css
```css
.btn-primary {
  @apply px-4 py-2 bg-[#2563EB] text-white text-sm font-semibold rounded-lg
         border border-transparent
         shadow-[0_1px_2px_rgba(16,24,40,0.08)]
         hover:bg-[#1D4ED8] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(37,99,235,0.25)]
         active:translate-y-0 active:shadow-none
         transition-all duration-150
         disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none;
}

.btn-secondary {
  @apply px-4 py-2 bg-white text-[#344054] text-sm font-semibold rounded-lg
         border border-[#D0D5DD]
         shadow-[0_1px_2px_rgba(16,24,40,0.05)]
         hover:bg-[#F9FAFB] hover:border-[#CDD2DB]
         transition-all duration-150;
}

.btn-ghost {
  @apply px-3 py-1.5 bg-transparent text-[#475467] text-sm font-medium rounded-md
         hover:bg-[#F2F4F7] hover:text-[#101828]
         transition-all duration-100;
}
```

---

## Spacing & Layout Rhythm

### Page content area
```
Current: px-8 py-8 (inconsistent)
New: px-8 py-8 — keep, but ensure it's consistent across ALL pages
```

### Card internal spacing
```
Card padding: p-5 (20px) — current p-4 is slightly cramped
Card header padding: px-5 py-4 — slightly more breathing room
Gap between cards in a column: gap-5 (20px) — current gap-4 is tight
```

### Section spacing
```
Between major page sections: mb-8 (32px)
Between related items in a card: space-y-3 (12px)
Between unrelated items in a card: space-y-4 (16px)
```

### Table rows
```
Current: py-3 (too cramped for a development tool — data gets lost)
New: py-4 px-4 — slightly more air, data reads easier
Table header: py-3 px-4 bg-[#F8F9FB] border-b border-[#E4E7EC]
```

---

## Card Treatment (PinnedCard)

### Current
- Barely-visible border
- No shadow
- Flat header

### New
```css
.pinned-card {
  background: #FFFFFF;
  border: 1px solid #E4E7EC;
  border-radius: 16px;  /* rounded-2xl */
  box-shadow: 0 1px 4px rgba(16,24,40,0.06);
  overflow: hidden;
}

/* Card header */
.pinned-card-header {
  background: #F8F9FB;
  border-bottom: 1px solid #E4E7EC;
  padding: 14px 20px;
}

.pinned-card-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: #101828;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

The all-caps small header label (like "COVERAGE", "CONTACTS", "MATERIALS") is a Linear/Attio pattern that instantly elevates the feel of a card.

---

## Form Inputs

```css
.input {
  background: #FFFFFF;
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  color: #101828;
  box-shadow: 0 1px 2px rgba(16,24,40,0.05);
  transition: border-color 150ms, box-shadow 150ms;
}

.input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 4px rgba(37,99,235,0.12), 0 1px 2px rgba(16,24,40,0.05);
  outline: none;
}

.input::placeholder {
  color: #98A2B3;
}
```

The 4px focus ring at 12% opacity is what modern inputs use (Figma, Linear, Vercel) — wide enough to be visible, subtle enough not to be jarring.

---

## Border Radius System

Consistent rounding matters. Right now everything is `rounded-lg` (8px) which makes the whole app feel the same density regardless of element size.

| Element | Radius | Class |
|---|---|---|
| Page-level cards | 16px | `rounded-2xl` |
| Buttons (primary/secondary) | 8px | `rounded-lg` |
| Ghost buttons | 6px | `rounded-md` |
| Inputs | 8px | `rounded-lg` |
| Badges / pills | 9999px | `rounded-full` |
| Table rows (hover state) | 8px | `rounded-lg` |
| Dropdown menus | 10px | `rounded-xl` |
| Tooltips | 6px | `rounded-md` |
| Icon buttons | 8px | `rounded-lg` |
| Avatars | 9999px | `rounded-full` |

---

## Sidebar Spacing Refinements

```
Nav item padding: px-3 py-2.5 (current py-3 is slightly too tall — makes list feel long)
Nav item gap (icon to label): gap-3 — keep
Nav item border-radius: rounded-xl — keep
Space between nav items: space-y-0.5 (current space-y-1 — tighter feels more like Linear)
Logo area padding: py-5 (current py-6 — slightly trim)
```

---

## Acceptance Criteria for Dev

1. ✅ `npx tsc --noEmit` passes with zero errors
2. ✅ All pages load without visual breakage
3. ✅ No amber/yellow accent colors visible anywhere except verdict badges and logo
4. ✅ Active sidebar nav item shows blue accent icon
5. ✅ All buttons use blue primary or white/border secondary style
6. ✅ Cards have subtle shadow + defined border (not faint)
7. ✅ Screenshot of dashboard, a project page, a contact page, and the sidebar provided
8. ✅ No layout regressions — column counts, widget positions unchanged
9. ✅ Committed with clear message + pushed to main + stable-deploy + deploy triggered

---

*Spec written: 2026-03-20 by Mildred. Awaiting Philip approval before Dev briefing.*
