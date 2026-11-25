# FleetFlow — Enterprise SaaS UI/UX Design Guidelines

**Document Status:** Mandatory Design System Standard  
**Target Audience:** Frontend Engineers, Product Designers, QA Engineers, AI Implementation Agents  
**Source of Truth:** `docs/reference/FleetFlow_Product_UX_Specification_and_Implementation_Blueprint.docx`

---

## 1. Enterprise SaaS Visual Design Principles

FleetFlow is a mission-critical corporate vehicle request and trip coordination platform. Its visual language communicates **operational confidence, clarity, administrative efficiency, and trust**.

1. **Clarity Over Novelty:** Visual flair must never compromise scanability, legibility, or operational workflow speed. Interfaces must be clean, spacious, and uncluttered.
2. **Neutral Foundations with Purposeful Color:** Use calm slate and light neutral backdrops (`#F8FAFC`, `#FFFFFF`) to let data, actionable controls, and operational status indicators take visual priority.
3. **Information Density with Breathing Room:** Dense data tables and stat grids must maintain disciplined padding (`py-3`, `px-4`) and clear visual grouping to prevent cognitive fatigue.
4. **Predictable Interaction Models:** Standardized button placements, form controls, and dialog patterns across all employee, administrator, and driver interfaces.
5. **Role-Tailored Density:**
   - **Employee Portal:** Guided, consumer-grade simplicity; optimized for fast request submission, itinerary tracking, and mobile readability.
   - **Administrator Portal:** High information density, comprehensive filters, side-by-side verification panels, and fast batch operations.
   - **Driver Portal:** Mobile-first, high-contrast, large touch targets ($\ge 44\text{px}$), rapid odometer and trip state transitions.

---

## 2. Visual Hierarchy & Information Architecture

Every screen must present an unambiguous visual hierarchy using the **F-pattern** and **Z-pattern** layout structures:

```text
[ Global Demo Toolbar / Environment Alert ]
[ Top Navigation Bar: Brand | Role Links | Primary CTA | User Profile ]
[ Page Header: Breadcrumb / Back Link | H1 Title | Subtitle | Secondary Actions ]
[ Top KPI Metric Cards (3-4 columns) ]
[ Primary Content Area: Data Table / Multi-Section Form / Card Grid ]
[ Auxiliary Sidebar / Details Pane (if applicable) ]
```

### Hierarchy Rules
1. **Single H1 per Page:** Every view has exactly one `<h1>` containing the primary view title (`text-2xl` to `text-3xl`, `font-bold`, `tracking-tight`).
2. **Section Titles (H2/H3):** Card groupings and list segments use `<h2>` or `<h3>` (`text-base` to `text-lg`, `font-semibold`), accompanied by a functional icon (e.g., `<Car className="h-5 w-5 text-primary" />`).
3. **Metadata & Micro-Labels:** Field captions, timestamps, and secondary descriptions use uppercase tracking or muted slate styling (`text-xs`, `text-muted-foreground`, `tracking-wider`, `uppercase font-semibold`).
4. **Primary vs. Secondary Action Dominance:** A page should feature at most **one primary button** (`bg-primary text-primary-foreground`). Supporting actions must use `variant="outline"`, `variant="secondary"`, or `variant="ghost"`.

---

## 3. Typography, Font Sizing & Readability

FleetFlow standardizes on modern system sans-serif typography (`Inter` / `Geist` / `system-ui`) with strict optical sizing and line-height pairing.

### Typography Scale

| Role | Tailwind Class | Font Size | Line Height | Weight | Usage |
|---|---|---|---|---|---|
| **Display Title** | `text-3xl` | 30px / 1.875rem | 36px | `font-bold` | Landing hero, major portal headings |
| **Page Title (H1)** | `text-2xl` | 24px / 1.5rem | 32px | `font-bold` | Dashboard and form page headings |
| **Section Title (H2)** | `text-lg` | 18px / 1.125rem | 28px | `font-semibold` | Card headers, table titles |
| **Card / Subhead (H3)**| `text-base` | 16px / 1.0rem | 24px | `font-semibold` | Form group titles, modal headers |
| **Body (Default)** | `text-sm` | 14px / 0.875rem | 20px | `font-normal` | Form inputs, descriptions, details |
| **Table / Dense UI** | `text-xs` | 12px / 0.75rem | 16px | `font-medium` | Table rows, badges, itinerary items |
| **Microcopy / Caption**| `text-[11px]` | 11px / 0.6875rem| 14px | `font-semibold` | Monospace IDs, status pills, timestamps |

### Readability Guardrails
- **Max Line Width:** Prose and descriptions must never exceed `max-w-2xl` (~65 characters per line).
- **Tabular Numerals & Monospace IDs:** All entity identifiers (`req_001`, `leg_004_out`, `FLT-1010`), currency, and odometer readings must use `font-mono font-medium`.
- **Text Truncation:** Long addresses and purposes in tables must use `line-clamp-1` or `truncate` with full text available on hover (`title="..."`) or detail click.

---

## 4. Color Palette, Semantic Status Colors & Contrast

FleetFlow adheres to **WCAG 2.1 AA** standards (minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text and UI components).

### Core Brand & Surface Palette

```text
--background: 210 20% 98%      (#F8FAFC) - Slate 50 light neutral backdrop
--foreground: 222 47% 11%      (#0F172A) - Slate 900 high-contrast text
--card:       0 0% 100%        (#FFFFFF) - Pure white elevated surface
--border:     214.3 31.8% 91.4%(#E2E8F0) - Slate 200 crisp divider border
--primary:    222 47% 16%      (#0F172A) - Deep Corporate Navy
--primary-fg: 210 40% 98%      (#F8FAFC) - Off-white primary button text
```

### Semantic Operational Status Palette

Operational transportation states must use strict semantic colors. **Rule:** Color must never be the sole indicator of state; always pair with text labels and semantic icons.

| Entity Status | Badge Background | Badge Text | Border Color | Icon | Semantic Meaning |
|---|---|---|---|---|---|
| `PENDING` | `bg-amber-100` (`#FEF3C7`) | `text-amber-800` (`#92400E`) | `border-amber-200` | `<Clock>` | Awaiting managerial review |
| `APPROVED` | `bg-blue-100` (`#DBEAFE`) | `text-blue-800` (`#1E40AF`) | `border-blue-200` | `<CheckCircle2>` | Reviewed, awaiting dispatch |
| `ASSIGNED` | `bg-indigo-100` (`#E0E7FF`) | `text-indigo-800` (`#3730A3`) | `border-indigo-200` | `<Car>` | Vehicle & driver allocated |
| `IN_PROGRESS` / `EN_ROUTE` | `bg-violet-100` (`#EDE9FE`) | `text-violet-800` (`#5B21B6`) | `border-violet-200` | `<Navigation>` | Active trip in transit |
| `COMPLETED` | `bg-emerald-100` (`#D1FAE5`) | `text-emerald-800` (`#065F46`) | `border-emerald-200` | `<CheckCircle2>` | Successfully finished journey |
| `REJECTED` | `bg-red-100` (`#FEE2E2`) | `text-red-800` (`#991B1B`) | `border-red-200` | `<AlertTriangle>` | Declined by administrator |
| `CANCELLED` | `bg-slate-100` (`#F1F5F9`) | `text-slate-700` (`#334155`) | `border-slate-200` | `<XCircle>` | Cancelled by employee |

---

## 5. Spatial Grid, Sizing, Alignment & Layout

FleetFlow implements an **8px harmonic spatial grid** (4px for micro-spacing):

```text
Space Token:   gap-1 (4px)  gap-2 (8px)  gap-3 (12px) gap-4 (16px) gap-6 (24px) gap-8 (32px)
Usage:         Micro-gaps   Icon-text    List items   Card padding Page sections Grid gaps
```

### Layout Guardrails
- **Max Width Container:** Default application layout is constrained to `container max-w-6xl mx-auto px-4 sm:px-6`. Forms are restricted to `max-w-3xl`.
- **Card Padding Consistency:** All `<CardHeader>` and `<CardContent>` use `p-6` on desktop, adapting to `p-4` on mobile (`p-4 sm:p-6`).
- **Vertical Rhythm:** Page sections maintain consistent `space-y-6` or `space-y-8`. Form fields maintain `space-y-1.5`.

---

## 6. Component Design Specifications

### 6.1 Buttons (`<Button>`)
- **Default (Primary):** `h-9 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 font-medium text-sm`.
- **Destructive:** `bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm`.
- **Outline:** `border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm`.
- **Ghost:** `hover:bg-accent hover:text-accent-foreground`.
- **Size Standards:** `sm` (`h-8 px-3 text-xs`), `default` (`h-9 px-4 text-sm`), `lg` (`h-10 px-8`), `icon` (`h-9 w-9` or `h-8 w-8`).
- **Touch Target:** Minimum tap area on touch screens is `44x44px` (using padding or touch bounds).

### 6.2 Form Inputs (`<Input>`, `<Textarea>`, `<Select>`)
- Height `h-9` (`h-10` on mobile for tap ergonomics), `rounded-md border border-input bg-background px-3 py-1 text-sm`.
- Focus state: `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`.
- Error state: `border-destructive focus-visible:ring-destructive text-foreground`.
- Labels: Always pair `<label>` with `htmlFor` matching the input `id`. Asterisk (`*`) in `text-destructive` indicates mandatory fields.

### 6.3 Badges (`<Badge>`)
- Pill styling: `rounded-full px-2.5 py-0.5 text-xs font-semibold border`.
- Must use predefined variants (`pending`, `approved`, `active`, `completed`, `rejected`, `cancelled`, `outline`, `secondary`).

### 6.4 Cards (`<Card>`)
- Clean white elevated box: `rounded-xl border bg-card text-card-foreground shadow-sm`.
- Interactive cards: Add `hover:border-primary/50 transition-colors cursor-pointer`.

### 6.5 Tables (`<Table>`)
- Header row: `bg-muted/40 font-medium text-muted-foreground text-xs h-10 px-4`.
- Rows: `hover:bg-muted/30 transition-colors border-b`.
- Cells: `p-4 align-middle text-xs`.
- Responsive pattern: Table view on desktop (`hidden md:block`); stacked card view on mobile (`grid grid-cols-1 md:hidden`).

### 6.6 Dialogs (`<Dialog>`)
- Backdrop: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50`.
- Panel: `max-w-lg bg-card rounded-xl p-6 shadow-xl border animate-in fade-in-0 zoom-in-95`.
- Header: Title (`text-lg font-semibold`), Description (`text-sm text-muted-foreground`).
- Footer: Cancel (`variant="outline"`) on left/top; Confirm action on right/bottom.
- Accessible close button in top right with `aria-label="Close"`.

---

## 7. Navigation & Role-Based Interaction Patterns

### 7.1 Global Demo Toolbar
- Fixed sticky toolbar (`sticky top-0 z-40 bg-slate-900 text-slate-100 text-xs px-4 py-2 border-b border-slate-800`).
- Provides 1-click persona switching grouped by role (`EMPLOYEE`, `ADMIN`, `DRIVER`).
- Provides "Reset Demo Data" button backed by confirmation modal.
- Shows live pulse indicator and demo environment version badge.

### 7.2 Main App Navigation
- Sticky header below demo toolbar (`sticky top-[41px] z-30 bg-background/95 backdrop-blur border-b`).
- Desktop: Logo + Brand + Active Portal badge (`Employee Portal`), Nav items (`Dashboard`, `My Requests`), Primary CTA (`+ New Request`), and User Profile chip with switch persona shortcut.
- Mobile: Compact hamburger toggle opening a clean drawer with full touch-friendly navigation links.

### 7.3 Role Route Protection
- Every protected route is wrapped in an auth guard.
- If not hydrated: Displays a centered spinner (`<Loader2 className="animate-spin" />`) and loading message.
- If unauthorized role visits an employee page: Renders an inline **Access Boundary Card** rather than causing an infinite redirect loop.

---

## 8. Responsive Breakpoints & Multi-Device Behavior

| Breakpoint | Width Range | Primary Target | Layout Adjustments |
|---|---|---|---|
| **Desktop** | $\ge 1024\text{px}$ (`lg`, `xl`, `2xl`) | Admin / Dispatch / Desktop Employee | Full multi-column grids, comprehensive tables, side-by-side forms |
| **Tablet** | $768\text{px} - 1023\text{px}$ (`md`) | Supervisor / Tablet Review | 2-column KPI grids, responsive table containers, wrapped header actions |
| **Mobile** | $< 768\text{px}$ (`sm`, default) | Driver / Mobile Requester | Single column, stacked table cards, mobile drawer menu, sticky CTAs |

### Touch & Mobile Rules
1. Never allow horizontal body scrolling (`overflow-x-hidden` on outer shell; horizontal scroll strictly on explicit container tables).
2. Input fields must have at least 16px font size or disable auto-zoom in mobile Safari.
3. Tables must seamlessly convert to mobile card lists (`md:hidden` / `hidden md:block`).

---

## 9. Form Usability, Validation & Error Messaging

1. **Logical Step Progression:** Forms are divided into thematic `<Card>` sections (Trip Configuration $\rightarrow$ Outbound Leg $\rightarrow$ Return Leg $\rightarrow$ Passenger Manifest $\rightarrow$ Business Purpose).
2. **Dynamic Conditional Rendering:** Return journey fields appear only when `tripType === 'ROUND_TRIP'`.
3. **Timezone-Safe Datetime Inputs:**
   - Input type `datetime-local` must be parsed using local browser calendar values (`new Date(y, m-1, d, h, min, 0, 0)`).
   - NEVER append `'Z'` to a local date string.
4. **Derived Manifest Headcount:**
   - Primary requester is locked as Passenger #1.
   - Total passenger count is derived strictly as `additionalColleagues.length + 1`. Never present an independent editable number input.
5. **Clear Error Presentation:**
   - Form-level banner at top (`border-destructive/50 bg-destructive/10 text-destructive`) summarizing correction needs.
   - Field-level red error text (`text-xs text-destructive mt-1`) placed immediately below the offending input.

---

## 10. System States (Loading, Empty, Success, Error, Confirmation)

1. **Loading State:** Centered layout with spinner, branded icon, and descriptive text (e.g. `"Loading FleetFlow session..."`).
2. **Empty State:** Reusable `<EmptyState>` featuring a rounded icon container (`bg-muted`), clear H3 heading, concise explanation, and a direct CTA button (e.g., `"Create New Request"`).
3. **Error State:** High-contrast alert card with `<AlertTriangle>`, actionable remediation steps, and safe fallback navigation.
4. **Confirmation Modal:** Consequential operations (resetting demo data, cancelling requests) require a 2-step confirmation modal with clear explanation of irreversibility.

---

## 11. Accessibility (a11y), Keyboard Navigation & ARIA

FleetFlow complies with international enterprise accessibility standards:

1. **Keyboard Operability:** Every interactive element must be reachable and triggerable via `Tab`, `Shift+Tab`, `Enter`, and `Space`.
2. **Visible Focus Rings:** All focusable controls must maintain an explicit, high-contrast focus indicator (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
3. **Semantic Landmarks:** Pages must utilize semantic landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`.
4. **ARIA Attributes:**
   - Modal dialogs use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and trap keyboard focus while open.
   - Collapsible drawers use `aria-expanded` and `aria-label`.
   - Data tables use semantic `<thead>`, `<tbody>`, `<th>` with `scope="col"`.
5. **Color Independence:** Status indicators must pair colors with readable badges and icons.

---

## 12. Motion, Transitions & Micro-Interactions

- **Subtle & Functional:** Animations must not exceed 200ms (`transition-colors duration-150`, `transition-transform duration-200`).
- **Modal Entrances:** Modals use lightweight CSS scale/fade transitions (`animate-in fade-in-0 zoom-in-95`).
- **Reduced Motion Support:** All animations must respect `prefers-reduced-motion: reduce`.

---

## 13. Quality Governance & Audit Compliance

All subsequent phases (Phase 3B, Phase 4, Phase 5) must pass review against these design guidelines. Any introduced UI component or screen must be verified across:
1. Desktop viewport ($1440 \times 900$).
2. Tablet viewport ($768 \times 1024$).
3. Mobile viewport ($390 \times 844$).
4. Keyboard navigation and contrast validation.
