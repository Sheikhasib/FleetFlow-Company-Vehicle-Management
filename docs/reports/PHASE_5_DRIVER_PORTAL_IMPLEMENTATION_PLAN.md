# FleetFlow Phase 5 — Driver Portal: Architecture Audit & Implementation Plan

**Document Date:** November 25, 2026  
**Target Phase:** Phase 5 — Driver Portal (Driver Execution & Trip Progression)  
**Document Status:** Architecture Audit & Implementation-Ready Plan (Planning Only)  
**Latest Baseline Commit:** `5511857 feat: implement Phase 4 admin portal`  
**Authoritative References:**  
- `AGENTS.md` (Rules 1–11)
- `docs/reference/FleetFlow_Product_UX_Specification_and_Implementation_Blueprint.docx`
- `docs/architecture/UNIFIED_UX_SPECIFICATION.md`
- `docs/architecture/UI_UX_DESIGN_GUIDELINES.md`
- `docs/reports/PHASE_4_ADMIN_PORTAL_VERIFICATION_REPORT.md`

---

## 1. Technical Review Corrections & Architecture Audits

This section provides the rigorous architectural audit and formal resolution for the six technical review areas mandated prior to implementation.

### 1.1 Driver Ownership Validation Audit
- **Current Behavior:**
  Audit of `src/services/trip-service.ts` (`advanceTripStatus`) reveals that while `driverId` is accepted as a parameter, the service currently performs:
  1. `tripLegRepository.getById(tripLegId)`
  2. `this.validateTransition(leg.status, nextStatus)`
  3. `activityLogRepository.create({ actorId: driverId, ... })`
  4. Operational resource synchronization via `assignmentRepository.getByTripLegId(leg.id)`
  *Critical Audit Finding:* `TripService` does **not** currently verify that the acting `driverId` matches the `driverId` on the active `Assignment`. The existing implementation relied on UI-level selector filtering to hide unauthorized trips from the driver. Selectors provide view presentation filtering, not authoritative business-rule enforcement.
- **Service-Level Ownership Resolution (Stage 5.1 Mandate):**
  A service-level guard will be added directly into `TripService.advanceTripStatus()`:
  ```ts
  // Stage 5.1 Service-Level Driver Ownership Guard:
  const assignment = await assignmentRepository.getByTripLegId(leg.id);
  if (!assignment || assignment.status !== 'ACTIVE') {
    throw new Error(`Cannot advance trip leg ${tripLegId}: No active assignment found.`);
  }

  // Resolve acting driver identity (supporting both Driver.id 'drv_01' and User.id 'usr_drv_01')
  const driver = (await driverRepository.getById(driverId)) || (await driverRepository.getByUserId(driverId));
  const resolvedDriverId = driver ? driver.id : driverId;

  if (assignment.driverId !== resolvedDriverId) {
    throw new Error(
      `Unauthorized: Driver (${driverId}) is not assigned to trip leg ${tripLegId}. Assigned driver is ${assignment.driverId}.`
    );
  }
  ```
  This guarantees that even if a malformed or unauthorized request reaches `TripService`, state transitions are rejected with an explicit error.

### 1.2 Mutually Exclusive Dashboard Categories
Per Blueprint Section 5.11, the Driver Dashboard displays:
- Active Trip
- Today's Assignments
- Upcoming Trips
- Completed Trips

To prevent duplicate card rendering and cognitive clutter, these four categories are strictly mutually exclusive:

```text
                               ┌───────────────────────────────────┐
                               │     Assigned Driver Trip Legs     │
                               └─────────────────┬─────────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  ▼                              ▼                              ▼
      ┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
      │      ACTIVE TRIP      │      │   SCHEDULED QUEUES    │      │    COMPLETED TRIPS    │
      │                       │      │                       │      │                       │
      │  ACCEPTED             │      │  ASSIGNED             │      │  COMPLETED            │
      │  ARRIVED_AT_PICKUP    │      │  (Excludes active)    │      │  (Terminal status)    │
      │  PICKED_UP            │      └───────────┬───────────┘      └───────────────────────┘
      │  IN_PROGRESS          │                  │
      │  DROPPED_OFF          │        ┌─────────┴─────────┐
      │                       │        ▼                   ▼
      │ (Max 1 Hero on Dash)  │ ┌─────────────┐     ┌─────────────┐
      └───────────────────────┘ │   TODAY'S   │     │  UPCOMING   │
                                │  SCHEDULE   │     │    TRIPS    │
                                │             │     │             │
                                │ Dep is Today│     │ Dep > Today │
                                └─────────────┘     └─────────────┘
```

#### Category Definitions & Exclusion Logic
1. **Active Trip (`selectDriverActiveTrip`):**
   - **Status Set:** $\in$ `['ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_PROGRESS', 'DROPPED_OFF']`.
   - **Exclusion Rule:** If present, rendered exclusively in the **Active Trip Hero Card** at the top of `/driver/dashboard`.
2. **Today's Schedule (`selectDriverTodayTrips`):**
   - **Status Set:** Strictly `'ASSIGNED'`.
   - **Temporal Scope:** `scheduledDeparture` falls on the same calendar date as `referenceTime` (evaluated deterministically).
   - **Strict Mutual Exclusion:** Any leg currently in an active status is **excluded** so it does not appear twice.
3. **Upcoming Trips (`selectDriverUpcomingTrips`):**
   - **Status Set:** Strictly `'ASSIGNED'`.
   - **Temporal Scope:** `scheduledDeparture` is on a future calendar date relative to `referenceTime` (`date > today`).
   - **Strict Mutual Exclusion:** Excludes active trips and today's schedule.
4. **Completed Trips (`selectDriverCompletedTrips`):**
   - **Status Set:** Strictly `'COMPLETED'`.
   - Displays finished shifts in historical review.

#### Determinism & Edge Case Handling
- **Pure Selectors with Explicit `referenceTime`:** Selectors receive mandatory `referenceTime: Date | string | number` to ensure 100% testability without hidden `Date.now()` calls.
- **Invalid Dates:** If `scheduledDeparture` is unparseable or missing, the selector logs a warning and isolates the record in an unscheduled triage bucket rather than throwing runtime exceptions.
- **Cancelled or Rejected Requests:** If the parent `VehicleRequest` has status `CANCELLED` or `REJECTED`, the trip leg is suppressed from active and scheduled driver queues.
- **Missing Assignments:** Trip legs without an active `Assignment` linking to the driver are strictly excluded.

### 1.3 Round-Trip Same-Driver Scenario
A common operational workflow is assigning the same driver and vehicle to both legs of a round-trip request (e.g. `req_002` with `leg_002_out` in the morning and `leg_002_ret` in the evening):
- **Outbound Execution:** Driver accepts and advances `leg_002_out` from `ASSIGNED` through `DROPPED_OFF` to `COMPLETED`.
- **Return Leg Status During Outbound:** `leg_002_ret` remains `ASSIGNED`. It is visible under Today's Schedule or Upcoming Trips as an unstarted assignment.
- **Parent Request Decoupling:** In `TripService.handleTripLegCompletion()`, parent completion evaluates:
  ```ts
  const allLegs = await tripLegRepository.getByRequestId(request.id);
  const allCompleted = allLegs.every((l) => l.id === completedLeg.id || l.status === 'COMPLETED');
  ```
  Because `leg_002_ret` is `ASSIGNED`, `allCompleted` is `false`. The parent request `req_002` remains `ASSIGNED`. It does **not** complete prematurely.
- **Resource Layover Release:** When `leg_002_out` completes, the concurrency check in `handleTripLegCompletion` inspects if `drv_03` or `veh_03` is concurrently in an *active* status (`ACCEPTED` through `DROPPED_OFF`). Because `leg_002_ret` is only `ASSIGNED`, the resources are safely released to `AVAILABLE` during the layover between trips.
- **Subsequent Return Execution:** Later in the shift, the driver opens `leg_002_ret` and accepts it (`acceptTrip`). `leg_002_ret` transitions to `ACCEPTED`, resources are marked `IN_USE` and `ON_TRIP`, and upon completing the return leg, both legs are `COMPLETED`, triggering parent request completion.
- **Testing:** This exact scenario will be validated by a dedicated end-to-end test in `src/features/driver/__tests__/driver-portal.test.ts`.

### 1.4 Notification Architecture Audit
- **Recipient Identity:** Inspection of `AssignmentService.createAssignment()` confirms that driver assignment notifications already set:
  ```ts
  recipientId: driver.userId // User.id (e.g. 'usr_drv_01')
  link: `/driver/trips/${leg.id}`
  ```
  Because all notifications in FleetFlow use `User.id` for `recipientId`, notifications are naturally routed to the authenticated driver session.
- **Deep Link Validation:** In `src/features/notifications/selectors/notification-selectors.ts`, `selectEmployeeNotifications` and `selectAdminNotifications` enforce strict route regex validation (`/employee/requests/req_*` and `/admin/requests/req_*` respectively).
- **Selector Extension Required:** To maintain recipient route security, a matching driver link validator will be added:
  ```ts
  export function isValidDriverTripLink(link?: string | null): boolean {
    if (!link || typeof link !== 'string') return false;
    return /^\/driver\/trips\/leg_[a-zA-Z0-9_\-]+$/.test(link.trim());
  }
  ```
  And `selectDriverNotifications()` will reuse existing sorting, tie-breaking, and pure `calculateRelativeTime()` helpers. Zero duplicate notification storage or formatting logic will be introduced.

### 1.5 UX Requirement Classification
To ensure transparency and prevent unapproved feature creep, every proposed UX element is strictly classified:

| UX Element | Classification | Source / Reference | Description & Constraint |
|---|:---:|---|---|
| **Driver Dashboard (`/driver/dashboard`)** | **Explicit Blueprint Requirement** | Blueprint Section 4 & 5.11 | Dashboard showing today's assignments, upcoming trips, active trip, and completed trips. |
| **Driver Trip Execution (`/driver/trips/[id]`)** | **Explicit Blueprint Requirement** | Blueprint Section 4 & 5.12 | Dedicated view providing only the next valid action at each stage with confirmation. |
| **Trip Cards Manifest** | **Explicit Blueprint Requirement** | Blueprint Section 5.11 | Displays Request ID, employee, route, departure, passenger count, vehicle, status, and details action. |
| **Mandatory Confirmation Dialogs** | **Explicit Blueprint Requirement** | Blueprint Section 5.12 | Every state advancement requires an explicit confirmation step before committing. |
| **Four Category Buckets** | **Explicit Blueprint Requirement** | Blueprint Section 5.11 | Active, Today's Schedule, Upcoming, and Completed categories. |
| **Sunlight Cockpit Readability** | **Existing Unified UX Specification Requirement** | `UNIFIED_UX_SPECIFICATION.md` Section 4.3 | High contrast visual hierarchy, bold typography, and slate neutral surfaces for cab mounts. |
| **Oversized Action Buttons ($\ge 56\text{px}$)** | **Existing Unified UX Specification Requirement** | `UNIFIED_UX_SPECIFICATION.md` Section 4.3 & 5.5 | `h-14` (56px) touch target for primary in-vehicle action controls. |
| **Fixed Mobile Action Bar** | **Existing Unified UX Specification Requirement** | `UNIFIED_UX_SPECIFICATION.md` Section 4.3 | Docked execution control on mobile viewports (`< 768px`). |
| **Fixed Bottom Nav Clearance** | **Existing Unified UX Specification Requirement** | `UI_UX_DESIGN_GUIDELINES.md` | Content container `<main>` must feature `pb-20` (80px) on mobile to clear the 64px `DriverBottomNav`. On execution view (`/driver/trips/[id]`), bottom nav is suppressed to grant full focus to the docked action panel. |
| **Search & Route Filter Input** | **Recommended Implementation Decision** | Architecture Planning Recommendation | Optional text filter on `/driver/trips` to assist drivers as trip history accumulates. |
| **Quick Stats Ribbon** | **Recommended Implementation Decision** | Architecture Planning Recommendation | Compact numerical counters (Active, Today, Completed) summarizing shift load. |

### 1.6 Lifecycle Stepper & Milestone Data Reuse
- **Operational Stepper Sequence:**
  The Driver Portal visual stepper strictly reflects the **7 operational driver statuses**:
  $$\text{ASSIGNED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{ARRIVED\_AT\_PICKUP} \longrightarrow \text{PICKED\_UP} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{DROPPED\_OFF} \longrightarrow \text{COMPLETED}$$
- **Zero Constant Duplication:**
  The driver stepper imports `TRIP_LIFECYCLE_MILESTONES` directly from `src/features/vehicle-requests/types/view-models.ts`.
- **Exclusion of `PENDING_ASSIGNMENT`:**
  In the domain model, `PENDING_ASSIGNMENT` represents an unassigned intake state in the dispatcher queue. A driver is only assigned after a leg reaches `ASSIGNED`. The driver stepper maps exclusively over the 7 driver statuses, ensuring `PENDING_ASSIGNMENT` is never displayed as a driver action.

---

## 2. Blueprint Requirements Mapping

| Blueprint Section | Requirement Description | Classification in Blueprint | FleetFlow Architecture Response |
|---|---|:---:|---|
| **Section 3.3 (Driver Role)** | Primary objective: execute assigned transportation. View assigned trips, accept assignment, mark arrival at pickup, confirm pickup, start trip, confirm drop-off, complete trip, view completed trips. | **Explicit Functional Requirement** | Dedicated Driver Portal views backed directly by `TripService`. |
| **Section 4 (Sitemap)** | Route definitions: `/driver/dashboard`, `/driver/trips`, `/driver/trips/[id]`. | **Explicit Functional Requirement** | Implementation of all 3 required Next.js App Router routes under `src/app/driver/`. |
| **Section 5.11 (Driver Dashboard)** | Show today's assignments, upcoming trips, active trip, and completed trips. Keep interface simpler than administrator dashboard. | **Explicit Functional Requirement** | `/driver/dashboard` featuring Active Trip Hero Card, Today's Schedule, Upcoming Queue, and Completed History. |
| **Section 5.12 (Driver Trip Execution)** | Route: `/driver/trips/[id]`. Provide only the next valid action at each stage with mandatory confirmation dialog and activity record generation. Completed trips cannot progress further. | **Explicit Functional Requirement** | Dedicated trip execution console providing single-action buttons ($\ge 56\text{px}$), confirmation modal, route itinerary, and activity log history. |
| **Section 5.13 (Notifications)** | In-app notifications for driver assignment, acceptance, pickup, start, drop-off, and completion. | **Explicit Functional Requirement** | Driver notification integration in top header popover; automatic employee notifications dispatched on every transition. |
| **Section 6.3 (Driver Journey)** | 5-step operational journey: Sign in $\rightarrow$ Accept assignment $\rightarrow$ Arrive & pickup $\rightarrow$ Start journey $\rightarrow$ Drop-off & complete. | **Core User Journey** | Validated via end-to-end integration tests and Playwright browser scenarios. |
| **Section 7.2 (Request vs Trip)** | A request represents demand; a trip represents execution. Independent outbound and return scheduling, assignment, and completion. | **Domain Architecture Rule** | Each trip leg progresses independently; round-trip parent request completes only when both legs reach `COMPLETED`. |
| **Section 11 (Core Services)** | `tripService.acceptTrip`, `markArrivedAtPickup`, `confirmPickup`, `startTrip`, `confirmDropoff`, `completeTrip`. | **Architecture Mandate** | Reused directly from `src/services/trip-service.ts`. |
| **Section 13 (Responsive UX)** | Driver experience must be mobile-first with touch-friendly actions ($\ge 44\text{px}$ standard, $\ge 56\text{px}$ primary action). | **UI/UX Design Guideline** | Mobile-first responsive layout with fixed bottom navigation and high-contrast cockpit styling. |
| **Section 15 (Business Rules)** | Driver cannot complete trip before pickup/drop-off; trip cannot be completed twice; driver can only progress valid assigned trips. | **Enforced Business Rule** | Central state validation in `tripService.validateTransition()` and service-level ownership validation. |
| **Section 19 (Acceptance Criteria)** | Evaluator can access Driver demo role; Driver can progress through trip lifecycle; pickup/drop-off updates visible to Admin. | **Release Acceptance Gate** | End-to-end verification across Driver, Admin, and Employee personas. |

---

## 3. Existing Architecture Audit & Code Reuse Matrix

### 3.1 Existing Architecture Review
- **`src/types/domain.ts`:** Fully defines `User`, `Driver`, `TripLeg`, `Assignment`, and `Vehicle`.
- **`src/lib/constants/domain.ts`:** Fully defines `VALID_TRIP_TRANSITIONS` and `ACTIVE_TRIP_STATUSES`.
- **`src/services/trip-service.ts`:** Fully implements all 6 sequential transitions, operational resource state sync (`IN_USE`, `ON_TRIP`), safe release on `COMPLETED`, audit logs, and notifications.
- **`src/stores/fleetflow-store.ts`:** Single centralized store managing all entities with localStorage persistence.
- **`src/data/seed/seed-data.ts`:** Contains 3 drivers (`drv_01`, `drv_02`, `drv_03`) with trips in `ARRIVED_AT_PICKUP`, `IN_PROGRESS`, `ACCEPTED`, `ASSIGNED`, and `COMPLETED` states.

### 3.2 Code Reuse Matrix

| Module / Artifact | Reusability Scope | Planned Integration in Phase 5 |
|---|:---:|---|
| `src/services/trip-service.ts` | **Reuse with Ownership Guard** | Core execution engine for all 6 driver status advancements. Enhanced with Stage 5.1 ownership check. |
| `src/lib/constants/domain.ts` | **100% Direct Reuse** | State machine transition table, active status helpers, company location constants. |
| `src/features/vehicle-requests/types/view-models.ts` | **100% Direct Reuse** | `TRIP_LIFECYCLE_MILESTONES`, milestone labels, percentage metrics, and step numbers. |
| `src/stores/fleetflow-store.ts` | **100% Direct Reuse** | State store and persistence. Read/write operations conducted via store selectors and services. |
| `src/components/ui/*` | **100% Direct Reuse** | `Button`, `Card`, `Badge`, `Dialog`, `Table`, `Input` primitives. |
| `src/components/shared/empty-state.tsx` | **100% Direct Reuse** | Clean empty states for empty schedules or completed queues. |
| `src/components/shared/global-demo-toolbar.tsx` | **Minor Modification** | Update role switch target for `DRIVER` from `/demo/preview` to `/driver/dashboard`. |
| `src/app/(auth)/login/page.tsx` | **Minor Modification** | Update persona card CTA for `DRIVER` to route directly to `/driver/dashboard`. |
| `src/components/shared/session-redirect.tsx` | **Minor Modification** | Update root session redirection for `role === 'DRIVER'` to `/driver/dashboard`. |
| `src/features/notifications/components/notification-bell.tsx` | **100% Direct Reuse** | Driver header notification bell popover. |
| `src/features/notifications/selectors/notification-selectors.ts` | **Extension** | Add `isValidDriverTripLink()` and `selectDriverNotifications()`. |

---

## 4. Driver Routes & Information Architecture

### 4.1 Route Structure
```text
/driver
├── layout.tsx                # Driver root layout: header, bottom nav, DriverAuthGuard
├── dashboard/
│   └── page.tsx              # Operations dashboard: Active Trip Hero, Today's queue, Stats
├── trips/
│   ├── page.tsx              # Comprehensive trip list with search and tab filters
│   └── [id]/
│       └── page.tsx          # Dedicated trip execution console & sequential action engine
```

### 4.2 Information Architecture by Screen

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        GLOBAL DEMO TOOLBAR                             │
├────────────────────────────────────────────────────────────────────────┤
│ DRIVER TOP HEADER: FleetFlow Logo | Driver Persona Badge | Bell Popover│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ /driver/dashboard ]                                                │
│   ├── 1. Cockpit Header: Driver Name, Shift Date, Status Pill          │
│   ├── 2. Active Trip Hero Card (Single Prominent Card if En Route)    │
│   │      - Status Badge, Origin → Destination, Dep Time, Pax Count     │
│   │      - Assigned Vehicle Model & Plate                             │
│   │      - High-Contrast Primary CTA (>= 56px) -> Open Trip Execution  │
│   ├── 3. Quick Stats Ribbon (Assigned, In Progress, Completed Today)   │
│   ├── 4. Today's Scheduled Assignments (Cards for Today's Departures) │
│   └── 5. Upcoming & Recent Trips Quick Links                           │
│                                                                        │
│   [ /driver/trips ]                                                    │
│   ├── 1. Filter Tabs: ALL | ACTIVE | UPCOMING | COMPLETED              │
│   ├── 2. Search Field: Search by Route Location or Request ID          │
│   └── 3. Stacked Trip Cards List (Optimized for Mobile Touch)          │
│                                                                        │
│   [ /driver/trips/[id] ]                                               │
│   ├── 1. Back Link: "← Return to Trips"                                │
│   ├── 2. Milestone Stepper: Visual Horizontal 7-Milestone Indicator    │
│   ├── 3. Journey Manifest Card: Pickup, Destination, Departure Time    │
│   ├── 4. Passenger Details: Requester Name, Dept, Headcount, Notes     │
│   ├── 5. Vehicle Allocation: Model, Plate, Capacity                    │
│   ├── 6. Action Execution Console (Fixed Bottom Floating Bar on Mobile)│
│   │      - Single Next Valid Action Button (>= 56px height)            │
│   │      - Triggers Confirmation Dialog prior to state transition      │
│   └── 7. Activity Audit History: Timestamped log of driver updates     │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ FIXED DRIVER BOTTOM NAV (Mobile < 768px): Dashboard | My Trips | Switch│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Detailed Trip Lifecycle Workflow

```mermaid
stateDiagram-v2
    [*] --> ASSIGNED: Dispatcher Assigns Driver & Vehicle
    
    ASSIGNED --> ACCEPTED: Driver Action: [ Accept Trip Assignment ]
    note right of ACCEPTED: Vehicle marked IN_USE<br/>Driver marked ON_TRIP<br/>Employee notified
    
    ACCEPTED --> ARRIVED_AT_PICKUP: Driver Action: [ Mark Arrived at Pickup ]
    note right of ARRIVED_AT_PICKUP: Driver on site at origin<br/>Employee notified: Driver waiting
    
    ARRIVED_AT_PICKUP --> PICKED_UP: Driver Action: [ Confirm Passenger Boarding ]
    note right of PICKED_UP: Passengers aboard<br/>Employee notified: Departure imminent
    
    PICKED_UP --> IN_PROGRESS: Driver Action: [ Start Journey ]
    note right of IN_PROGRESS: Vehicle in transit<br/>Employee notified: En route
    
    IN_PROGRESS --> DROPPED_OFF: Driver Action: [ Confirm Drop-off at Destination ]
    note right of DROPPED_OFF: Arrived at destination<br/>Resources remain IN_USE / ON_TRIP<br/>Employee notified: Arrived
    
    DROPPED_OFF --> COMPLETED: Driver Action: [ Complete Trip Leg ]
    note right of COMPLETED: Assignment marked COMPLETED<br/>Vehicle & Driver released to AVAILABLE<br/>Parent Request checked for completion
    
    COMPLETED --> [*]: Terminal State (No further progression)
```

### Action Button Specifications Matrix

| Current Status | Primary Action Button Label | Icon | Action Narrative / Confirmation Prompt | Next Status |
|---|---|---|---|---|
| `ASSIGNED` | **Accept Trip Assignment** | `<CheckCircle2 />` | "Accept dispatch for this trip leg? This confirms your availability to the dispatcher." | `ACCEPTED` |
| `ACCEPTED` | **Mark Arrived at Pickup** | `<MapPin />` | "Confirm arrival at pickup location? This alerts passengers that you are staged outside." | `ARRIVED_AT_PICKUP` |
| `ARRIVED_AT_PICKUP` | **Confirm Passenger Boarding** | `<Users />` | "Confirm that all passengers have boarded the vehicle?" | `PICKED_UP` |
| `PICKED_UP` | **Start Journey** | `<Navigation />` | "Begin transit to destination? This marks the journey as active and in progress." | `IN_PROGRESS` |
| `IN_PROGRESS` | **Confirm Drop-off at Destination** | `<MapPinCheck />` | "Confirm arrival and passenger drop-off at the destination address?" | `DROPPED_OFF` |
| `DROPPED_OFF` | **Complete Trip Leg** | `<Check />` | "Finalize and complete this trip leg? This releases vehicle and driver resources back to fleet inventory." | `COMPLETED` |
| `COMPLETED` | *(Disabled / Completed State)* | `<CheckCircle />` | "This trip leg has been formally completed and closed." | *(Terminal)* |

---

## 6. Proposed File-Level Implementation Map

```text
src/
├── app/
│   └── driver/
│       ├── layout.tsx                                # Driver layout shell with bottom nav & guard
│       ├── dashboard/
│       │   └── page.tsx                              # Driver dashboard with Active Hero & Schedule
│       └── trips/
│           ├── page.tsx                              # Driver trips list with search and filter tabs
│           └── [id]/
│               └── page.tsx                          # Driver trip execution console & actions
├── components/
│   └── shared/
│       ├── driver-auth-guard.tsx                     # Role guard for /driver/* routes
│       └── driver-bottom-nav.tsx                     # Fixed mobile bottom navigation bar
├── features/
│   └── driver/
│       ├── types/
│       │   └── view-models.ts                        # DriverTripCardViewModel, DriverDashboardOverview
│       ├── selectors/
│       │   ├── driver-selectors.ts                   # Pure deterministic selectors for driver trips
│       │   └── __tests__/
│       │       └── driver-selectors.test.ts          # Unit tests for driver trip selectors
│       ├── components/
│       │   ├── driver-active-trip-hero.tsx           # High-contrast hero card for active trip
│       │   ├── driver-trip-card.tsx                  # Standardized driver trip list card
│       │   ├── driver-trip-execution-panel.tsx       # Next-action button (>= 56px) and confirmation
│       │   ├── driver-milestone-stepper.tsx          # 7-milestone visual progression stepper
│       │   └── driver-trip-info-cards.tsx            # Route, passenger, and vehicle detail cards
│       └── __tests__/
│           └── driver-portal.test.ts                 # Full end-to-end driver workflow test suite
└── features/
    └── notifications/
        └── selectors/
            └── notification-selectors.ts             # Extend with isValidDriverTripLink & selectDriverNotifications
```

---

## 7. Stage-by-Stage Implementation Plan

### Stage 5.1: Architecture & Foundation Enhancements
- **Objective:** Implement service-level driver ownership validation, driver authentication guards, and role routing.
- **Existing Files to Reuse:** `src/components/shared/admin-auth-guard.tsx`, `src/services/trip-service.ts`, `src/types/domain.ts`.
- **Files to Create / Modify:**
  - Enhance `src/services/trip-service.ts` with service-level driver ownership verification in `advanceTripStatus()`.
  - Create `src/components/shared/driver-auth-guard.tsx`.
  - Update `src/app/(auth)/login/page.tsx` (route Driver cards to `/driver/dashboard`).
  - Update `src/components/shared/global-demo-toolbar.tsx` (route Driver selection to `/driver/dashboard`).
  - Update `src/components/shared/session-redirect.tsx` (route `role === 'DRIVER'` to `/driver/dashboard`).
- **Tests:** Unit tests verifying unauthorized driver rejection in `trip-service.test.ts` and role guard redirection in `driver-auth-guard.test.tsx`.
- **Acceptance Criteria:** `tripService.advanceTripStatus()` rejects actions if caller does not own the trip assignment. Accessing `/driver/*` without a Driver role displays the role switcher; switching to driver redirects cleanly to `/driver/dashboard`.

### Stage 5.2: Driver Selectors, ViewModels & Notification Pipeline
- **Objective:** Build pure, deterministic selectors with mutually exclusive categories, explicit `referenceTime`, and driver notification deep-link validation.
- **Existing Files to Reuse:** `src/lib/constants/domain.ts`, `src/features/vehicle-requests/types/view-models.ts`, `src/features/notifications/selectors/notification-selectors.ts`.
- **Files to Create / Modify:**
  - Create `src/features/driver/types/view-models.ts`.
  - Create `src/features/driver/selectors/driver-selectors.ts`:
    - `selectDriverActiveTrip(state, driverUserId)`: Resolves active leg (`ACCEPTED` through `DROPPED_OFF`).
    - `selectDriverTodayTrips(state, driverUserId, referenceTime)`: Scheduled today, strictly excluding active trip.
    - `selectDriverUpcomingTrips(state, driverUserId, referenceTime)`: Future scheduled trips, strictly excluding active trip.
    - `selectDriverCompletedTrips(state, driverUserId)`: Finished trips (`COMPLETED`).
    - `selectDriverTripById(state, tripLegId, driverUserId)`: Detailed viewmodel with manifest and vehicle.
  - Extend `src/features/notifications/selectors/notification-selectors.ts`:
    - `isValidDriverTripLink(link)`: Validates `/driver/trips/leg_[a-zA-Z0-9_\-]+`.
    - `selectDriverNotifications(notifications, recipientId, referenceTime)`.
  - Create `src/features/driver/selectors/__tests__/driver-selectors.test.ts`.
- **Tests:** 100% test coverage for selector categories, mutual exclusivity, edge cases (missing assignments, cancelled requests, invalid dates), and round-trip same-driver isolation.
- **Acceptance Criteria:** An active trip appears strictly in the Active Trip Hero and never in Today's Schedule or Upcoming Trips.

### Stage 5.3: Driver Application Shell & Navigation
- **Objective:** Implement mobile-first layout shell with dedicated driver header, fixed bottom navigation, and safe padding clearance.
- **Existing Files to Reuse:** `src/components/shared/admin-bottom-nav.tsx`, `src/features/notifications/components/notification-bell.tsx`.
- **Files to Create:**
  - Create `src/components/shared/driver-bottom-nav.tsx`: Fixed bottom bar (`h-16`) on mobile with Dashboard, My Trips, and Demo Switcher icons.
  - Create `src/app/driver/layout.tsx`: Top header with Driver persona badge, notification bell, and `<main className="pb-20 md:pb-8">` clearance.
- **Tests:** Render tests verifying bottom nav clearance and active tab highlighting.
- **Acceptance Criteria:** Zero layout overlap on 360×640 and 390×844 mobile viewports; responsive adaptation on tablet/desktop.

### Stage 5.4: Driver Dashboard (`/driver/dashboard`)
- **Objective:** Deliver the operational driver home screen with Active Trip Hero card, quick stats, and categorized trip feeds.
- **Existing Files to Reuse:** `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/shared/empty-state.tsx`.
- **Files to Create:**
  - Create `src/features/driver/components/driver-active-trip-hero.tsx`: High-contrast cockpit card with prominent next-action button.
  - Create `src/features/driver/components/driver-trip-card.tsx`: Touch-friendly card displaying Request ID, route, passenger count, vehicle, and departure time.
  - Create `src/app/driver/dashboard/page.tsx`: Combines Active Hero, Today's Schedule, and Stats.
- **Tests:** Dashboard component tests validating that when an active trip exists, the hero card is prioritized at the top and excluded from today's list.
- **Acceptance Criteria:** Driver can view their exact active trip immediately upon opening the app without navigating submenus.

### Stage 5.5: Driver Trips List (`/driver/trips`)
- **Objective:** Provide a comprehensive, searchable inventory of all assigned trips categorized by operational lifecycle status.
- **Existing Files to Reuse:** `src/components/ui/input.tsx`, `src/components/ui/button.tsx`, `driver-trip-card.tsx`.
- **Files to Create:**
  - Create `src/app/driver/trips/page.tsx`: Filter tabs (`ALL`, `ACTIVE`, `UPCOMING`, `COMPLETED`), search input for destination/pickup, and stacked card feed.
- **Tests:** Filtering and search tests verifying instantaneous reactive matching.
- **Acceptance Criteria:** Driver can toggle between upcoming and completed trips with single-tap tab switching.

### Stage 5.6: Driver Trip Details & Lifecycle Execution (`/driver/trips/[id]`)
- **Objective:** Build the core execution screen providing linear lifecycle progression, confirmation dialogs, and activity audit logging.
- **Existing Files to Reuse:** `src/services/trip-service.ts`, `src/components/ui/dialog.tsx`, `src/components/ui/badge.tsx`.
- **Files to Create:**
  - Create `src/features/driver/components/driver-milestone-stepper.tsx`: 7-milestone visual progression stepper reusing `TRIP_LIFECYCLE_MILESTONES`.
  - Create `src/features/driver/components/driver-trip-info-cards.tsx`: Route, passenger manifest, and vehicle allocation cards.
  - Create `src/features/driver/components/driver-trip-execution-panel.tsx`: Fixed floating action bar with $\ge 56\text{px}$ primary action button and confirmation modal.
  - Create `src/app/driver/trips/[id]/page.tsx`: Integrates stepper, manifests, execution panel, and activity history.
- **Tests:** State advancement integration tests verifying all 6 sequential actions from `ASSIGNED` through `COMPLETED`.
- **Acceptance Criteria:** Driver taps action $\rightarrow$ confirms dialog $\rightarrow$ status advances $\rightarrow$ audit log records $\rightarrow$ next valid action renders.

### Stage 5.7: Cross-Role Integration, Verification & Visual QA
- **Objective:** Execute full cross-role regression, real browser visual QA across 4 viewports, and audit report generation.
- **Existing Files to Reuse:** Seed data, `admin-portal.test.ts`, employee request tests.
- **Files to Create:**
  - Create `src/features/driver/__tests__/driver-portal.test.ts`: End-to-end tests covering complete cross-role workflow including round-trip same-driver execution.
  - Capture 20+ browser screenshots across 1440×900, 768×1024, 390×844, and 360×640 in `docs/reports/screenshots/phase_5/`.
  - Create `docs/reports/PHASE_5_DRIVER_PORTAL_VERIFICATION_REPORT.md`.
- **Tests:** Full test suite execution (`npm test`), strict typecheck (`npx tsc --noEmit`), and production build (`npm run build`).
- **Acceptance Criteria:** Zero test failures, zero TypeScript errors, 100% route generation, and verified cross-role state sync.

---

## 8. Acceptance Criteria Checklist

- [ ] **Service Ownership Enforcement:** `TripService.advanceTripStatus()` validates acting driver ownership against the assignment.
- [ ] **Role Access:** Evaluator can select Driver persona (`usr_drv_01`, `usr_drv_02`, `usr_drv_03`) via login page and global demo toolbar.
- [ ] **Route Protection:** Direct access to `/driver/*` by non-drivers displays `DriverAuthGuard` with 1-click switch.
- [ ] **Mutually Exclusive Dashboard:** Active trips appear strictly in the Active Trip Hero card and are excluded from Today's Schedule and Upcoming Trips.
- [ ] **Trip Cards Manifest:** Trip cards display Request ID, employee name, route, departure time, passenger count, vehicle model/plate, and status badge.
- [ ] **Linear Progression:** `/driver/trips/[id]` displays ONLY the single next valid action button ($\ge 56\text{px}$).
- [ ] **Confirmation Dialog:** Tapping action prompts confirmation dialog before advancing state.
- [ ] **Terminal Completion:** Completed trips display read-only milestone state with no further progression buttons.
- [ ] **Round-Trip Decoupling:** Outbound leg completion preserves unstarted return leg as `ASSIGNED` and holds parent request in `ASSIGNED`.
- [ ] **Cross-Role Coherence:** Administrator sees live trip monitoring advance; Employee passenger receives notifications.
- [ ] **Persistence:** Page refresh preserves driver progression state through Zustand persist; demo reset returns to seed state.

---

*This document represents the complete, verified architectural blueprint for Phase 5 incorporating all technical review corrections. No application code or dependencies have been modified. Ready for user authorization.*
