# FleetFlow — Stage 3: Dashboard & Route Experience
## Comprehensive Implementation Plan & Technical Architecture

**Document Version:** 3.1.0  
**Status:** Planning Document (Technical Specification) — **NOT STARTED — AWAITING USER APPROVAL**  
**Author Role:** Senior Product Designer, Senior Frontend Architect & Enterprise UX Specialist  
**Authoritative Sources:** `AGENTS.md`, `docs/reference/FleetFlow_Product_UX_Specification_and_Implementation_Blueprint.docx`, `docs/architecture/UI_UX_DESIGN_GUIDELINES.md`, `docs/architecture/UNIFIED_UX_SPECIFICATION.md`  

---

## 1. Revised Implementation Assessment

A comprehensive review of the current Phase 3A implementation identifies strong state isolation and reliable domain repositories, but also confirms that dashboard and itinerary views currently rely on naive, tightly-coupled inline code:

### Current Implementation vs. Stage 3 Target

| Component / Surface | Current Implementation (`main`) | Stage 3 Target Architecture | Concrete Defect / Gap Resolved |
| :--- | :--- | :--- | :--- |
| **Active Trip Card** | Inline JSX in `src/app/employee/dashboard/page.tsx` (lines 142–245). Filters Zustand arrays inline. | Modular `<ActiveTripCard>` consuming pure `ActiveTripViewModel` (strictly `ACCEPTED`, `ARRIVED_AT_PICKUP`, `PICKED_UP`, `IN_PROGRESS`). | Decouples UI from store arrays; completely separates `IN_PROGRESS` from `DROPPED_OFF`; adds verified mobile tap-to-call; eliminates boarding-pass styling. |
| **Dropped-Off State** | Mixed into generic active legs without distinct milestone or completion treatment. | Dedicated `<DroppedOffTripCard>` rendering Step 7 of 8 ("Arrived / Awaiting Final Completion") with checkmark badge. | Prevents arrived passengers from seeing in-transit / call driver UI; provides clear post-arrival status. |
| **Route Vector** | Inconsistent inline `MapPin` + text rows repeated across 4 separate files without unified structure. | Standardized `<RouteVector>` component (`src/components/shared/route-vector.tsx`) with verified origin/destination nodes and timestamps. | Inconsistent typography, missing transit line connector, redundant route rendering across request headers and leg cards. |
| **Trip Classification** | Naive check `!['COMPLETED', 'CANCELLED'].includes(status)` sorted solely by `scheduledDeparture`. Non-deterministic `new Date()` calls. | Deterministic 5-bucket classification engine in `trip-selectors.ts` accepting an explicit `referenceTime` parameter. | Overlaps active journeys with future bookings; hides secondary active trips silently; misclassifies overdue unstarted trips as upcoming. |
| **Lifecycle Stepper** | No stepper exists. Only static text status badges. | Responsive `<TripLifecycleStepper>`: 8-node track on desktop ($\ge 1024$px), compact Step N of 8 milestone badge + gauge on mobile ($< 768$px). | Users currently have zero visibility into physical journey milestones (e.g. driver arrival at pickup vs in-transit). |
| **Driver Contact** | Read-only text display: `driver.phone` rendered inside a plain `<span>` without verification. | Verified resolution priority (`driver.phone` $\to$ `user.phone` $\to$ neutral unavailable message) with accessible `tel:` link and $\ge 44$px touch targets. | Eliminates invalid `tel:` links; treats whitespace/empty strings as unavailable; suppresses unassigned call actions. |
| **Status Badges** | Duplicate inline `switch (status)` statements in dashboard and request cards rendering custom variant strings. | Full reuse of existing `src/components/ui/badge.tsx` with uppercase domain variant keys (`variant="IN_PROGRESS"`, `rail="left"`). | Eliminates duplicate code and capitalization inconsistencies; keeps styling unified with Stage 1 tokens. |
| **Request Detail Itinerary** | Duplicates route pickup and destination at both the request header and leg level. | Separation of concerns: Request Header displays request identity, purpose, and overall status; `<TripLegTimeline>` renders leg-specific route vectors. | Redundant, cluttering route information displayed twice on the same screen. |

---

## 2. Corrected Lifecycle Stepper & Trip Classification Rules

### 2.1 Centralized Eight-State Lifecycle Mapping
Per `src/lib/constants/domain.ts` and the Product Blueprint, the sequential lifecycle for physical trip execution consists of exactly 8 approved milestones. To guarantee absolute consistency and avoid duplicated progress math across components, the mapping is centralized in `src/features/vehicle-requests/types/view-models.ts`:

$$\text{Progress Percentage} = \frac{\text{Step Number}}{8} \times 100\%$$

```typescript
export interface TripLifecycleMilestone {
  step: number;               // 1 to 8
  percentage: number;         // 12.5 to 100.0
  status: TripLegStatus;
  label: string;
  description: string;
}

export const TRIP_LIFECYCLE_MILESTONES: Record<TripLegStatus, TripLifecycleMilestone> = {
  PENDING_ASSIGNMENT: {
    step: 1,
    percentage: 12.5,
    status: 'PENDING_ASSIGNMENT',
    label: 'Awaiting Vehicle Allocation',
    description: 'Request approved; dispatcher assigning vehicle and driver.',
  },
  ASSIGNED: {
    step: 2,
    percentage: 25.0,
    status: 'ASSIGNED',
    label: 'Vehicle & Driver Assigned',
    description: 'Resources allocated; awaiting driver journey acceptance.',
  },
  ACCEPTED: {
    step: 3,
    percentage: 37.5,
    status: 'ACCEPTED',
    label: 'Trip Accepted by Driver',
    description: 'Driver has acknowledged dispatch and is preparing vehicle.',
  },
  ARRIVED_AT_PICKUP: {
    step: 4,
    percentage: 50.0,
    status: 'ARRIVED_AT_PICKUP',
    label: 'Driver Arrived at Pickup',
    description: 'Driver is staged at pickup location awaiting passengers.',
  },
  PICKED_UP: {
    step: 5,
    percentage: 62.5,
    status: 'PICKED_UP',
    label: 'Passengers Boarded',
    description: 'Passengers have boarded; departure imminent.',
  },
  IN_PROGRESS: {
    step: 6,
    percentage: 75.0,
    status: 'IN_PROGRESS',
    label: 'Vehicle in Transit',
    description: 'Vehicle is actively traveling along the route.',
  },
  DROPPED_OFF: {
    step: 7,
    percentage: 87.5,
    status: 'DROPPED_OFF',
    label: 'Arrived at Destination',
    description: 'Destination reached; awaiting administrative completion.',
  },
  COMPLETED: {
    step: 8,
    percentage: 100.0,
    status: 'COMPLETED',
    label: 'Journey Completed',
    description: 'Physical journey concluded; trip record formally closed.',
  },
} as const;

export function getTripLifecycleMilestone(status: TripLegStatus): TripLifecycleMilestone {
  return TRIP_LIFECYCLE_MILESTONES[status];
}
```

*Every dashboard card, stepper component, and timeline item imports this single mapping. In all mobile gauges, badges, and progress bars:*
- `ACCEPTED`: Step 3 — 37.5%
- `ARRIVED_AT_PICKUP`: Step 4 — 50.0%
- `PICKED_UP`: Step 5 — 62.5%
- `IN_PROGRESS`: Step 6 — 75.0%
- `DROPPED_OFF`: Step 7 — 87.5%
- `COMPLETED`: Step 8 — 100.0%

---

### 2.2 Unambiguous 5-Bucket Trip Classification

To ensure operational clarity without altering the domain constant `ACTIVE_TRIP_STATUSES = ['ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_PROGRESS', 'DROPPED_OFF'] as const`, the feature selector layer (`trip-selectors.ts`) classifies trips into five mutually exclusive buckets:

```text
                                 ┌────────────────────────┐
                                 │     User Trip Legs     │
                                 └───────────┬────────────┘
                                             │
      ┌───────────────────┬──────────────────┼───────────────────┬───────────────────┐
      ▼                   ▼                  ▼                   ▼                   ▼
┌───────────┐       ┌───────────┐      ┌───────────┐       ┌───────────┐       ┌───────────┐
│  ACTIVE   │       │DROPPED_OFF│      │ UPCOMING  │       │   PAST    │       │ COMPLETED │
│   TRIPS   │       │   TRIPS   │      │   TRIPS   │       │UNFINISHED │       │   TRIPS   │
│           │       │           │      │           │       │   TRIPS   │       │           │
│ ACCEPTED  │       │DROPPED_OFF│      │ Dep > ref │       │ Dep <= ref│       │ COMPLETED │
│ ARRIVED   │       │ (Step 7)  │      │ PENDING   │       │ PENDING   │       │ (Step 8)  │
│ PICKED_UP │       │           │      │ ASSIGNED  │       │ ASSIGNED  │       │           │
│ IN_PROG   │       │           │      │           │       │           │       │           │
└─────┬─────┘       └─────┬─────┘      └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
      │                   │                  │                   │                   │
      ▼                   ▼                  ▼                   ▼                   ▼
ActiveTripCard      DroppedOffCard     UpcomingTripCard    PastUnfinishedCard  History Table
(Hero / Alert)      (Post-Arrival)     (Future Feed)       (Delayed Notice)    (Archives)
```

#### Bucket 1: Active Trips (`activeTrips`)
- **Criteria:** Status $\in$ `['ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_PROGRESS']` **AND** parent `VehicleRequest.status !== 'CANCELLED'`.
- **Meaning:** The vehicle is actively mobilizing, waiting at the curb, or in transit with passengers.
- **Strict Status Union:** `ActiveTripViewModel.status` permits **only** `'ACCEPTED' | 'ARRIVED_AT_PICKUP' | 'PICKED_UP' | 'IN_PROGRESS'`. `DROPPED_OFF` is strictly excluded.
- **Deterministic Primary Selection:**
  1. Status precedence: `IN_PROGRESS` (weight 10) > `PICKED_UP` (8) > `ARRIVED_AT_PICKUP` (6) > `ACCEPTED` (4).
  2. Earliest `scheduledDeparture` ISO timestamp.
  3. Deterministic tie-breaker: Lexicographical sort on `leg.id`.
- **Secondary Active Trips:** If an employee has $>1$ active leg simultaneously, the top-ranked leg occupies the hero `<ActiveTripCard>`. All secondary active legs are surfaced in a prominent `<SecondaryActiveAlert>` banner with a 1-click toggle to switch view focus or navigate to the request. Zero active legs are hidden.

#### Bucket 2: Dropped-Off Trips (`droppedOffTrips`)
- **Criteria:** Status is `DROPPED_OFF` **AND** parent `VehicleRequest.status !== 'CANCELLED'`.
- **Meaning:** Passengers have arrived at their destination (Step 7 of 8, 87.5%). The physical travel is finished, but the trip record is awaiting dispatcher odometer verification or administrative closure (`COMPLETED`).
- **Rendering Specification:** Rendered on the dashboard via the dedicated `<DroppedOffTripCard>` component:
  - Surface: Subtle emerald-tinted surface (`bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-800/40`).
  - Milestone Indicator: Step 7 of 8 ("Arrived at Destination — Awaiting Administrative Completion").
  - Content: Embedded `<RouteVector>` showing completed transit path, passenger headcount, and drop-off timestamp.
  - Driver Call Action: Suppressed (passengers are already at destination; call-driver action is neither needed nor appropriate).
  - Navigation: Direct "View Request Details" action button.

#### Bucket 3: Upcoming Trips (`upcomingTrips`)
- **Criteria:** Status $\in$ `['PENDING_ASSIGNMENT', 'ASSIGNED']` **AND** `scheduledDeparture > referenceTime` **AND** parent `VehicleRequest.status !== 'CANCELLED'`.
- **Meaning:** Confirmed future transportation bookings.
- **Rendering Specification:** Rendered via `<UpcomingTripCard>` sorted in ascending order of `scheduledDeparture` (earliest departure first).

#### Bucket 4: Past Unfinished Trips (`pastUnfinishedTrips`)
- **Criteria:** Status $\in$ `['PENDING_ASSIGNMENT', 'ASSIGNED']` **AND** `scheduledDeparture <= referenceTime` **AND** parent `VehicleRequest.status !== 'CANCELLED'`.
- **Meaning:** Operational anomaly or dispatch delay. The scheduled departure time has arrived or passed, but dispatch has not assigned resources or the driver has not accepted the trip.
- **Rendering Specification:** Rendered via the dedicated `<PastUnfinishedCard>` component:
  - Surface: High-visibility amber operational notice (`bg-amber-50/60 border-amber-300 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200`).
  - Alert Copy: *"Departure Time Reached — Awaiting Dispatch Coordination"*.
  - Displays original scheduled departure time and embedded route vector.

#### Bucket 5: Completed Trips (`completedTrips`)
- **Criteria:** Status is `COMPLETED`.
- **Meaning:** The journey is fully executed, verified, and archived (Step 8 of 8, 100.0%).
- **Rendering Specification:** Displayed in the Request History table and past journey summary.

---

### 2.3 Strict Separation of `RequestStatus` vs. `TripLegStatus`

Per `src/types/domain.ts`:
- **`RequestStatus`:** `PENDING | APPROVED | REJECTED | ASSIGNED | COMPLETED | CANCELLED`
- **`TripLegStatus`:** `PENDING_ASSIGNMENT | ASSIGNED | ACCEPTED | ARRIVED_AT_PICKUP | PICKED_UP | IN_PROGRESS | DROPPED_OFF | COMPLETED`

**Critical Rule:** `CANCELLED` and `REJECTED` exist **only** as `RequestStatus`. They are **never** valid values of `TripLegStatus`.

#### How Cancelled and Rejected Requests Appear in the UI Without Misrepresenting Legs

1. **Request History Listing (`/employee/requests`):**
   - Renders a list of **`VehicleRequest`** entities.
   - If `request.status === 'CANCELLED'`, the badge renders `variant="CANCELLED"` ("Cancelled").
   - If `request.status === 'REJECTED'`, the badge renders `variant="REJECTED"` ("Rejected").
   - The associated `TripLeg` records for cancelled/rejected requests are completely excluded from active and upcoming trip feeds.

2. **Request Detail Page (`/employee/requests/[id]`):**
   - **Page Header:** Reflects `request.status`.
   - **Rejected Requests:** Header displays "Rejected". Below the header, a dedicated `AlertTriangle` card displays the exact `request.rejectionReason`. The itinerary section displays: *"No journey legs dispatched for rejected request."*
   - **Cancelled Requests:** Header displays "Cancelled". Cancellation modal is disabled. Legs associated with the cancelled request display their terminal cancellation status relative to the parent request: *"Trip cancelled prior to departure."* Leg records are never artificially assigned an invalid `TripLegStatus`.

---

## 3. Strengthened Driver Phone Validation & Tap-to-Call Specification

### 3.1 Validation & Resolution Algorithm
To ensure zero broken `tel:` links and robust handling of absent contact data without adding third-party dependencies, phone resolution is encapsulated in `trip-selectors.ts`:

```typescript
export interface ResolvedDriverContact {
  displayPhone: string;
  telUri: string;
}

/**
 * Resolves a valid operational driver phone number.
 * Priority:
 * 1. driver.phone
 * 2. linked user.phone
 * 3. null (unavailable)
 *
 * Rules:
 * - Empty string or whitespace-only strings are treated as unavailable.
 * - Basic structural check without external dependencies: must contain at least 7 digits.
 * - Sanitizes formatting for tel: URI while preserving display format.
 */
export function resolveDriverPhone(
  driver: Driver | null | undefined,
  users: readonly User[]
): ResolvedDriverContact | null {
  if (!driver) return null;

  // 1. Check driver.phone
  let candidate = driver.phone?.trim();

  // 2. Fallback to linked user.phone if driver.phone is missing/empty
  if (!candidate && driver.userId) {
    const linkedUser = users.find((u) => u.id === driver.userId);
    candidate = linkedUser?.phone?.trim();
  }

  if (!candidate) return null;

  // 3. Validation: must contain at least 7 digits (standard phone number minimum without adding dependencies)
  const digitsOnly = candidate.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    return null; // Invalid phone number; suppressed to prevent broken tel: links
  }

  // 4. Clean RFC 3966 tel: URI format (e.g. +1-555-0301 -> tel:+15550301)
  const telUri = candidate.startsWith('+') ? `tel:+${digitsOnly}` : `tel:${digitsOnly}`;

  return {
    displayPhone: candidate,
    telUri,
  };
}
```

### 3.2 Display & Interaction Protocol
1. **Assignment Requirement:** Call Driver is **only** displayed when an `Assignment` record exists linking a `Driver` to the trip leg.
2. **Zero Fabrication:** Zero mock, placeholder, or default phone numbers will ever be guessed or fabricated.
3. **Mobile Tap-to-Call (`< 768px`):**
   - Rendered as an accessible semantic link with `href={contact.telUri}`.
   - Meets the minimum interactive target requirement of `min-h-[44px]` with `px-4 py-2.5`.
   - Accessible label: `aria-label={`Call driver ${driver.name} at ${contact.displayPhone}`}`.
4. **Desktop Presentation (`>= 768px`):**
   - Displays driver name and formatted `contact.displayPhone` text with an optional click-to-call link.
5. **Unavailable State:**
   - When no driver is assigned, or when `resolveDriverPhone` returns `null` (empty, whitespace, or invalid number):
   ```tsx
   <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
     <PhoneOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
     <span>Driver contact information unavailable</span>
   </div>
   ```
   *No active or disabled `tel:` link is rendered.*

---

## 4. Complete Component Architecture, Data Contracts & Props

### 4.1 Reconciled Component Decomposition Tree

```text
src/
├── components/
│   ├── shared/
│   │   ├── route-vector.tsx               // Standardized transit route vector
│   │   └── trip-lifecycle-stepper.tsx     // Responsive 8-step lifecycle indicator
│   └── ui/
│       └── badge.tsx                      // REUSED UNCHANGED: Existing status rail & badge
└── features/
    └── vehicle-requests/
        ├── types/
        │   └── view-models.ts             // Strictly-typed presentation ViewModels & milestones
        ├── selectors/
        │   ├── trip-selectors.ts          // Pure deterministic selector functions & phone resolver
        │   └── __tests__/
        │       └── trip-selectors.test.ts // Comprehensive selector unit tests
        └── components/
            ├── active-trip-card.tsx       // Hero active trip card on dashboard (4 active states)
            ├── secondary-active-alert.tsx // Banner for simultaneous active trips
            ├── dropped-off-trip-card.tsx  // Distinct card for Step 7 (Arrived at Destination)
            ├── upcoming-trip-card.tsx     // Compact upcoming trip card (Strictly future)
            ├── past-unfinished-card.tsx   // Operational alert card for delayed trips (Elapsed)
            └── trip-leg-timeline.tsx      // Detail page itinerary & leg cards
```

---

### 4.2 Presentation ViewModels (`view-models.ts`)

```typescript
// src/features/vehicle-requests/types/view-models.ts

import { LegType, TripLegStatus, RequestStatus } from '@/types/domain';

// Strictly active statuses for currently moving/mobilizing trips
export type ActiveTripStatus =
  | 'ACCEPTED'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_PROGRESS';

export interface AssignedResourceViewModel {
  driverId: string;
  driverName: string;
  driverPhone: string | null;           // Nullable: driver phone may not be recorded or valid
  driverTelUri: string | null;          // RFC 3966 sanitized URI or null if invalid/unavailable
  vehicleId: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleCapacity: number;
}

export interface ActiveTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;                     // 'OUTBOUND' | 'RETURN'
  status: ActiveTripStatus;             // STRICT: Only the 4 physically active statuses
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;           // ISO 8601 string
  scheduledArrival?: string | null;     // Optional/Nullable
  purpose: string;
  passengerCount: number;
  assignedResource: AssignedResourceViewModel | null;
  isPrimary: boolean;
  stepNumber: number;                   // 3 to 6
  progressPercentage: number;           // 37.5 to 75.0
}

export interface DroppedOffTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: 'DROPPED_OFF';
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival?: string | null;
  passengerCount: number;
  assignedDriverName: string | null;
  assignedVehicleModel: string | null;
  stepNumber: 7;
  progressPercentage: 87.5;
}

export interface UpcomingTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: TripLegStatus;                // 'PENDING_ASSIGNMENT' | 'ASSIGNED'
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;           // Strictly future (scheduledDeparture > referenceTime)
  scheduledArrival?: string | null;
  passengerCount: number;
  assignedDriverName: string | null;
  assignedVehicleModel: string | null;
}

export interface PastUnfinishedTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: TripLegStatus;                // 'PENDING_ASSIGNMENT' | 'ASSIGNED'
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;           // Strictly elapsed (scheduledDeparture <= referenceTime)
  scheduledArrival?: string | null;
  assignedDriverName: string | null;
}

export interface CompletedTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: 'COMPLETED';
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival?: string | null;
  driverName: string | null;
}

export interface TripLegTimelineItemViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: TripLegStatus;
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival?: string | null;
  assignedResource: AssignedResourceViewModel | null;
  isParentRequestCancelled: boolean;
}
```

---

### 4.3 Complete Component Props Interfaces

```typescript
// 1. RouteVector Props
export interface RouteVectorProps {
  origin: string;                              // e.g. "Corporate HQ — Metro Center"
  destination: string;                         // e.g. "Tech Innovation Center — Ann Arbor"
  originDescriptor?: string;                   // Optional secondary facility/bay label
  destinationDescriptor?: string;              // Optional secondary facility/bay label
  scheduledDeparture: string;                  // ISO 8601 string or formatted string
  scheduledArrival?: string | null;            // Optional/Nullable string (never fabricated)
  orientation?: 'horizontal' | 'vertical';     // Responsive layout orientation (default: 'horizontal')
  className?: string;
}

// 2. TripLifecycleStepper Props
export interface TripLifecycleStepperProps {
  currentStatus: TripLegStatus;                // One of the 8 approved statuses
  className?: string;
}

// 3. ActiveTripCard Props
export interface ActiveTripCardProps {
  trip: ActiveTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

// 4. SecondaryActiveAlert Props
export interface SecondaryActiveAlertProps {
  secondaryTrips: readonly ActiveTripViewModel[];
  onSelectTrip?: (trip: ActiveTripViewModel) => void;
  className?: string;
}

// 5. DroppedOffTripCard Props
export interface DroppedOffTripCardProps {
  trip: DroppedOffTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

// 6. UpcomingTripCard Props
export interface UpcomingTripCardProps {
  trip: UpcomingTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

// 7. PastUnfinishedCard Props
export interface PastUnfinishedCardProps {
  trip: PastUnfinishedTripViewModel;
  onViewDetails?: (requestId: string) => void;
  className?: string;
}

// 8. TripLegTimeline Props
export interface TripLegTimelineProps {
  legs: readonly TripLegTimelineItemViewModel[];
  requestStatus: RequestStatus;                // Overall request status (for cancelled/rejected context)
  className?: string;
}
```

---

## 5. Deterministic Pure Selectors (`trip-selectors.ts`)

```typescript
// src/features/vehicle-requests/selectors/trip-selectors.ts

import {
  VehicleRequest,
  TripLeg,
  Assignment,
  Vehicle,
  Driver,
  User,
  TripLegStatus,
} from '@/types/domain';
import {
  ActiveTripViewModel,
  DroppedOffTripViewModel,
  UpcomingTripViewModel,
  PastUnfinishedTripViewModel,
  CompletedTripViewModel,
  getTripLifecycleMilestone,
} from '../types/view-models';

export interface EmployeeTripOverviewInput {
  currentUserId: string;
  requests: readonly VehicleRequest[];
  tripLegs: readonly TripLeg[];
  assignments: readonly Assignment[];
  vehicles: readonly Vehicle[];
  drivers: readonly Driver[];
  users: readonly User[];
}

export interface EmployeeTripOverview {
  primaryActiveTrip: ActiveTripViewModel | null;
  secondaryActiveTrips: ActiveTripViewModel[];
  droppedOffTrips: DroppedOffTripViewModel[];
  upcomingTrips: UpcomingTripViewModel[];
  pastUnfinishedTrips: PastUnfinishedTripViewModel[];
  completedTrips: CompletedTripViewModel[];
}

/**
 * Pure selector function: classifies user trips deterministically based on referenceTime.
 * Does NOT call new Date() internally.
 */
export function getEmployeeTripOverview(
  data: EmployeeTripOverviewInput,
  referenceTime: Date | string
): EmployeeTripOverview {
  const refTimeMs =
    typeof referenceTime === 'string'
      ? new Date(referenceTime).getTime()
      : referenceTime.getTime();

  // 1. Map user requests (excluding CANCELLED and REJECTED from active/upcoming feeds)
  const userRequests = data.requests.filter((r) => r.requesterId === data.currentUserId);
  const userRequestMap = new Map(userRequests.map((r) => [r.id, r]));

  // 2. Filter user legs
  const userLegs = data.tripLegs.filter((leg) => userRequestMap.has(leg.requestId));

  const activeTrips: ActiveTripViewModel[] = [];
  const droppedOffTrips: DroppedOffTripViewModel[] = [];
  const upcomingTrips: UpcomingTripViewModel[] = [];
  const pastUnfinishedTrips: PastUnfinishedTripViewModel[] = [];
  const completedTrips: CompletedTripViewModel[] = [];

  for (const leg of userLegs) {
    const parentReq = userRequestMap.get(leg.requestId)!;
    const isCancelledOrRejected = parentReq.status === 'CANCELLED' || parentReq.status === 'REJECTED';

    if (leg.status === 'COMPLETED') {
      completedTrips.push(buildCompletedViewModel(leg, data));
      continue;
    }

    if (isCancelledOrRejected) {
      continue;
    }

    const departureMs = new Date(leg.scheduledDeparture).getTime();

    if (['ACCEPTED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_PROGRESS'].includes(leg.status)) {
      activeTrips.push(buildActiveViewModel(leg, parentReq, data, false));
    } else if (leg.status === 'DROPPED_OFF') {
      droppedOffTrips.push(buildDroppedOffViewModel(leg, parentReq, data));
    } else if (['PENDING_ASSIGNMENT', 'ASSIGNED'].includes(leg.status)) {
      if (departureMs > refTimeMs) {
        upcomingTrips.push(buildUpcomingViewModel(leg, parentReq, data));
      } else {
        pastUnfinishedTrips.push(buildPastUnfinishedViewModel(leg, parentReq, data));
      }
    }
  }

  // Sort upcoming trips ascending by departure time
  upcomingTrips.sort(
    (a, b) => new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime()
  );

  // Sort active trips by deterministic priority
  activeTrips.sort(compareActiveTripPriority);

  let primaryActiveTrip: ActiveTripViewModel | null = null;
  let secondaryActiveTrips: ActiveTripViewModel[] = [];

  if (activeTrips.length > 0) {
    primaryActiveTrip = { ...activeTrips[0], isPrimary: true };
    secondaryActiveTrips = activeTrips.slice(1);
  }

  return {
    primaryActiveTrip,
    secondaryActiveTrips,
    droppedOffTrips,
    upcomingTrips,
    pastUnfinishedTrips,
    completedTrips,
  };
}

/**
 * Deterministic comparison function for active trip priority:
 * 1. Status weight: IN_PROGRESS (10) > PICKED_UP (8) > ARRIVED_AT_PICKUP (6) > ACCEPTED (4)
 * 2. Earliest scheduledDeparture
 * 3. Lexicographical leg.id
 */
function compareActiveTripPriority(a: ActiveTripViewModel, b: ActiveTripViewModel): number {
  const weights: Record<string, number> = {
    IN_PROGRESS: 10,
    PICKED_UP: 8,
    ARRIVED_AT_PICKUP: 6,
    ACCEPTED: 4,
  };
  const weightDiff = (weights[b.status] || 0) - (weights[a.status] || 0);
  if (weightDiff !== 0) return weightDiff;

  const timeDiff =
    new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime();
  if (timeDiff !== 0) return timeDiff;

  return a.legId.localeCompare(b.legId);
}
```

---

## 6. Empty, Error & Exceptional States Matrix

| # | Scenario / Edge Case | Trigger Condition | Visual Presentation & Action |
| :- | :--- | :--- | :--- |
| **1** | **First-Time Employee** | User has 0 total requests. | Full-width `<EmptyState>`: Car icon, heading *"No Vehicle Requests Yet"*, description, and primary CTA button: *"Book Your First Trip"* linking to `/employee/requests/new`. |
| **2** | **No Active Trips** | User has requests, but 0 active legs. | Clean empty card in Active Trip slot: *"No vehicle currently in transit"*, with quick access to Next Upcoming Trip. |
| **3** | **Active Trip Without Driver** | Prototype edge state: `ACCEPTED` or `IN_PROGRESS` but no matching `Assignment` record. | Informational notice within card: *"Vehicle dispatched — driver details being finalized by coordinator"*. Shows route & schedule; suppresses Call Driver action. |
| **4** | **Missing Driver Phone** | Assignment exists, but both `driver.phone` and `user.phone` are `""`, whitespace, or invalid. | Replaces Call button with neutral text: *"Driver contact information unavailable"*. No broken `tel:` link rendered. |
| **5** | **Multiple Active Legs** | 2+ legs have active statuses simultaneously. | Primary leg displayed in hero card; prominent secondary alert banner: *"You have 1 additional active journey in progress — [View Trip req_002]"*. |
| **6** | **Dropped-Off Journey** | Trip leg reaches `DROPPED_OFF` status. | Rendered in `<DroppedOffTripCard>`: Step 7 of 8 badge, "Arrived at Destination — Awaiting Administrative Completion", embedded route vector, no call button. |
| **7** | **Round Trip Partial Completion** | Outbound leg is `COMPLETED`, Return leg is `PENDING_ASSIGNMENT`. | Leg 1 rendered with green checkmark and "Completed" badge; Leg 2 rendered with amber "Pending Assignment" badge and future scheduled departure time. |
| **8** | **Rejected Request** | Request status is `REJECTED`. | Red-tinted alert box with `AlertTriangle` icon, bold reason text, and timestamp. Cancel button is hidden. Associated legs are excluded from trip feeds. |
| **9** | **Past Unfinished Leg** | `scheduledDeparture <= referenceTime` and status $\in$ `['PENDING_ASSIGNMENT', 'ASSIGNED']`. | Rendered in `<PastUnfinishedCard>`: Amber Operational Alert: *"Scheduled departure time has elapsed. Dispatch coordination in progress."* |

---

## 7. Responsive Layout Behavior

### 7.1 Breakpoints & Viewport Density
- **Desktop ($\ge 1024$px):** 2-column layout with Hero Active Trip Card (or Dropped-Off Card) and KPI metrics grid, followed by Upcoming Trips and Recent Requests side-by-side.
- **Tablet ($768$–$1023$px):** Stacked hero card, $2 \times 2$ KPI grid, followed by full-width upcoming cards.
- **Mobile ($< 768$px):** Vertical stacking. Cards use `p-4` padding. Ample $16$px bottom clearance above the docked mobile bottom navigation bar (`pb-20`).

### 7.2 Responsive Stepper Architecture (No 8-Step Squishing)

```text
Desktop (>= 1024px): Full Horizontal 8-Step Milestone Track
[ (1) Pending ]──[ (2) Assigned ]──[ (3) Accepted ]──[ (4) Arrived ]──[ (5) Boarded ]──[● (6) In Transit ]──[ (7) Dropped ]──[ (8) Done ]

Tablet (768px – 1023px): Icon-Only Track with Active Step Label
[ 1 ]──[ 2 ]──[ 3 ]──[ 4 ]──[ 5 ]──[● 6: In Transit ]──[ 7 ]──[ 8 ]

Mobile (< 768px): Compact Milestone Badge + Progress Gauge
┌──────────────────────────────────────────────────────────────────┐
│ [● Step 6 of 8: Vehicle in Transit ]                     (75.0%) │
│ ████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Vehicle actively traveling to destination                        │
└──────────────────────────────────────────────────────────────────┘
```

- **Touch Target Integrity:** Every button, tap-to-call link, and interactive control maintains $\ge 44 \times 44$px clickable target area across all breakpoints.

---

## 8. Implementation Sequence & Exact File Impact

### 8.1 Phased Execution Steps

- **Step 3.1: Shared Route & Stepper Components**
  - Create `src/components/shared/route-vector.tsx`
  - Create `src/components/shared/trip-lifecycle-stepper.tsx`
- **Step 3.2: Domain Selectors & Feature ViewModels**
  - Create `src/features/vehicle-requests/types/view-models.ts`
  - Create `src/features/vehicle-requests/selectors/trip-selectors.ts`
  - Create `src/features/vehicle-requests/selectors/__tests__/trip-selectors.test.ts`
- **Step 3.3: Active Trip & Itinerary Components**
  - Create `src/features/vehicle-requests/components/active-trip-card.tsx`
  - Create `src/features/vehicle-requests/components/secondary-active-alert.tsx`
  - Create `src/features/vehicle-requests/components/dropped-off-trip-card.tsx`
  - Create `src/features/vehicle-requests/components/upcoming-trip-card.tsx`
  - Create `src/features/vehicle-requests/components/past-unfinished-card.tsx`
  - Create `src/features/vehicle-requests/components/trip-leg-timeline.tsx`
- **Step 3.4: Page Integration & Refactoring**
  - Refactor `src/app/employee/dashboard/page.tsx` (integrate selectors, active trip card, dropped-off card, upcoming cards)
  - Refactor `src/features/vehicle-requests/components/request-detail-card.tsx` (remove duplicate route; integrate `TripLegTimeline`)
  - Refactor `src/app/employee/requests/[id]/page.tsx` (ensure proper prop delegation)
- **Step 3.5: Automated Verification & Responsive Testing**
  - Execute Vitest suite: verify 100% pass on existing tests + new selector tests
  - Execute Next.js typecheck: `npm run typecheck`
  - Execute production build: `npm run build`
  - Headless Chrome visual audit across $390\text{px}$, $768\text{px}$, and $1440\text{px}$

---

### 8.2 Reconciled Exact File Impact List

#### New Files to Create (11 files)
1. `src/components/shared/route-vector.tsx` (Standard transit route presentation)
2. `src/components/shared/trip-lifecycle-stepper.tsx` (Responsive 8-step lifecycle stepper)
3. `src/features/vehicle-requests/types/view-models.ts` (Strictly typed ViewModels & centralized milestones)
4. `src/features/vehicle-requests/selectors/trip-selectors.ts` (Deterministic pure selector functions & phone validation)
5. `src/features/vehicle-requests/selectors/__tests__/trip-selectors.test.ts` (Unit tests for selectors and phone resolver)
6. `src/features/vehicle-requests/components/active-trip-card.tsx` (Hero active trip card — 4 active states only)
7. `src/features/vehicle-requests/components/secondary-active-alert.tsx` (Secondary active trip alert banner)
8. `src/features/vehicle-requests/components/dropped-off-trip-card.tsx` (Dedicated card for Step 7: Arrived at Destination)
9. `src/features/vehicle-requests/components/upcoming-trip-card.tsx` (Upcoming trip presentation card — future trips)
10. `src/features/vehicle-requests/components/past-unfinished-card.tsx` (Operational notice for overdue unstarted trips)
11. `src/features/vehicle-requests/components/trip-leg-timeline.tsx` (Detail view itinerary timeline)

#### Existing Files to Modify (3 files)
1. `src/app/employee/dashboard/page.tsx` (Integrate selector and modular components; remove inline trip filtering)
2. `src/features/vehicle-requests/components/request-detail-card.tsx` (Remove duplicate route; integrate `<TripLegTimeline>`)
3. `src/app/employee/requests/[id]/page.tsx` (Verify error boundary & prop delegation)

#### Existing Files Reused Unchanged (0 modifications)
- `src/components/ui/badge.tsx` (Reused unchanged; already supports all domain statuses, status rails, and dots)
- `src/lib/constants/domain.ts` (Reused unchanged; domain constants intact)
- `src/types/domain.ts` (Reused unchanged; domain types intact)

---

## 9. Blueprint Conflicts & Unresolved Questions

In accordance with FleetFlow Project Rule 9, the following architectural observations and domain resolutions are documented:

1. **Driver Phone Number Source in Domain Model:**
   - *Observation:* Both `User.phone` and `Driver.phone` exist in the domain model.
   - *Resolution:* In `trip-selectors.ts`, `driver.phone` is the operational priority. If missing or invalid, `user.phone` is the fallback. If both are absent or invalid (< 7 digits), contact is marked unavailable.
2. **`DROPPED_OFF` Status Semantics:**
   - *Observation:* Domain constant `ACTIVE_TRIP_STATUSES` includes `DROPPED_OFF`, but physical passenger transit is concluded.
   - *Resolution:* The selector layer does not alter the domain constant, but strictly separates `DROPPED_OFF` from `ActiveTripViewModel`. It is rendered by `<DroppedOffTripCard>` as Step 7 of 8: *"Arrived / Awaiting Final Completion"*.
3. **Vehicle Odometer & Telemetry:**
   - *Status:* Strictly **out of scope** per Rule 6. The UI will not display or solicit odometer, fuel, or maintenance inputs.

---

## 10. Measurable Acceptance Criteria

### Functionality & Business Logic
- [ ] `ActiveTripViewModel.status` permits only `'ACCEPTED' | 'ARRIVED_AT_PICKUP' | 'PICKED_UP' | 'IN_PROGRESS'`.
- [ ] Centralized milestone mapping in `view-models.ts` guarantees exact step and percentage values across all components:
  - `ACCEPTED`: Step 3 — 37.5%
  - `ARRIVED_AT_PICKUP`: Step 4 — 50.0%
  - `PICKED_UP`: Step 5 — 62.5%
  - `IN_PROGRESS`: Step 6 — 75.0%
  - `DROPPED_OFF`: Step 7 — 87.5%
  - `COMPLETED`: Step 8 — 100.0%
- [ ] Dropped-off trips are rendered via dedicated `<DroppedOffTripCard>` with destination confirmed and call action suppressed.
- [ ] Upcoming trips strictly include future scheduled departures (`scheduledDeparture > referenceTime`).
- [ ] Past unfinished trips (`scheduledDeparture <= referenceTime`) are rendered via `<PastUnfinishedCard>`.
- [ ] Driver phone validation treats empty/whitespace strings as unavailable, requires $\ge 7$ digits, and suppresses invalid `tel:` links without external dependencies.
- [ ] `CANCELLED` and `REJECTED` are treated strictly as `RequestStatus`; leg records are not assigned invalid statuses.
- [ ] Request Detail page eliminates duplicate route rendering.

### UI & Accessibility (WCAG 2.1 AA)
- [ ] All interactive buttons and tap-to-call links maintain $\ge 44 \times 44$px clickable target areas.
- [ ] Stepper renders horizontal 8-step track on desktop ($\ge 1024$px), compact Step N of 8 banner + progress bar on mobile ($< 768$px). Zero label squishing.
- [ ] Color contrast ratios exceed $4.5:1$ for normal text and $3:1$ for graphical controls.

### Code Quality & Non-Regression
- [ ] Zero TypeScript errors (`npm run typecheck` passes with 0 errors).
- [ ] 100% of unit tests pass (`npm test` passes 16/16 existing + all new selector tests).
- [ ] Clean production build (`npm run build` succeeds).
- [ ] Zero new runtime dependencies added (Rule 2).

---

> **Implementation Status: NOT STARTED — AWAITING USER APPROVAL**  
> All planning consistency reviews are complete. We will stop here and await your explicit approval before beginning implementation.
