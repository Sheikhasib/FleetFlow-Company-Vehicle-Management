import { TripLegStatus, LegType, RequestStatus, UserRole } from '@/types/domain';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Lifecycle Milestone Configuration
 * Single canonical source of truth for physical trip execution lifecycle.
 * Strictly maps the 8 TripLegStatus states; CANCELLED and REJECTED are RequestStatus
 * values and are never included here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface TripLifecycleMilestone {
  status: TripLegStatus;
  step: number;               // 1 to 8
  percentage: number;         // 12.5 to 100.0
  label: string;
  shortLabel: string;
  description: string;
}

export const TRIP_LIFECYCLE_MILESTONES = {
  PENDING_ASSIGNMENT: {
    status: 'PENDING_ASSIGNMENT',
    step: 1,
    percentage: 12.5,
    label: 'Awaiting Vehicle Allocation',
    shortLabel: 'Requested',
    description: 'Request approved; dispatcher assigning vehicle and driver.',
  },
  ASSIGNED: {
    status: 'ASSIGNED',
    step: 2,
    percentage: 25.0,
    label: 'Vehicle & Driver Assigned',
    shortLabel: 'Assigned',
    description: 'Resources allocated; awaiting driver journey acceptance.',
  },
  ACCEPTED: {
    status: 'ACCEPTED',
    step: 3,
    percentage: 37.5,
    label: 'Trip Accepted by Driver',
    shortLabel: 'Accepted',
    description: 'Driver has acknowledged dispatch and is preparing vehicle.',
  },
  ARRIVED_AT_PICKUP: {
    status: 'ARRIVED_AT_PICKUP',
    step: 4,
    percentage: 50.0,
    label: 'Driver Arrived at Pickup',
    shortLabel: 'At Pickup',
    description: 'Driver is staged at pickup location awaiting passengers.',
  },
  PICKED_UP: {
    status: 'PICKED_UP',
    step: 5,
    percentage: 62.5,
    label: 'Passengers Boarded',
    shortLabel: 'Boarded',
    description: 'Passengers have boarded; departure imminent.',
  },
  IN_PROGRESS: {
    status: 'IN_PROGRESS',
    step: 6,
    percentage: 75.0,
    label: 'Vehicle in Transit',
    shortLabel: 'In Transit',
    description: 'Vehicle is actively traveling along the route.',
  },
  DROPPED_OFF: {
    status: 'DROPPED_OFF',
    step: 7,
    percentage: 87.5,
    label: 'Arrived at Destination',
    shortLabel: 'Dropped Off',
    description: 'Destination reached; awaiting administrative completion.',
  },
  COMPLETED: {
    status: 'COMPLETED',
    step: 8,
    percentage: 100.0,
    label: 'Journey Completed',
    shortLabel: 'Completed',
    description: 'Physical journey concluded; trip record formally closed.',
  },
} as const satisfies Record<TripLegStatus, TripLifecycleMilestone>;

/**
 * Ordered immutable list of the eight milestones (Step 1 to Step 8)
 * for direct injection into TripLifecycleStepper or other milestone consumers.
 */
export const TRIP_LIFECYCLE_STEPS: readonly TripLifecycleMilestone[] = [
  TRIP_LIFECYCLE_MILESTONES.PENDING_ASSIGNMENT,
  TRIP_LIFECYCLE_MILESTONES.ASSIGNED,
  TRIP_LIFECYCLE_MILESTONES.ACCEPTED,
  TRIP_LIFECYCLE_MILESTONES.ARRIVED_AT_PICKUP,
  TRIP_LIFECYCLE_MILESTONES.PICKED_UP,
  TRIP_LIFECYCLE_MILESTONES.IN_PROGRESS,
  TRIP_LIFECYCLE_MILESTONES.DROPPED_OFF,
  TRIP_LIFECYCLE_MILESTONES.COMPLETED,
] as const;

/**
 * Lookup helper returning milestone metadata for any given TripLegStatus.
 */
export function getTripLifecycleMilestone(status: TripLegStatus): TripLifecycleMilestone {
  return TRIP_LIFECYCLE_MILESTONES[status];
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentation-Ready Trip ViewModels
 * Strictly typed interfaces designed specifically for future UI consumers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The 4 statuses that represent a vehicle actively in motion or staging.
 * DROPPED_OFF is strictly excluded from ActiveTripStatus.
 */
export type ActiveTripStatus =
  | 'ACCEPTED'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_PROGRESS';

/**
 * Resolved vehicle and driver resource details for a trip leg.
 */
export interface AssignedResourceViewModel {
  driverId: string;
  driverName: string;
  driverPhone: string | null;           // Display-formatted or original phone string
  driverTelUri: string | null;          // Sanitized RFC 3966 URI (e.g. 'tel:+15550301') or null
  vehicleId: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleCapacity: number;
}

/**
 * Active trip ViewModel (hero cards & active alerts).
 * Status is restricted strictly to ActiveTripStatus.
 */
export interface ActiveTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;                     // 'OUTBOUND' | 'RETURN'
  status: ActiveTripStatus;             // Strictly: 'ACCEPTED' | 'ARRIVED_AT_PICKUP' | 'PICKED_UP' | 'IN_PROGRESS'
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;           // ISO 8601 string
  scheduledArrival?: string | null;     // Optional/Nullable
  purpose: string;
  passengerCount: number;
  colleagues: readonly string[];        // Additional passenger colleague names
  assignedResource: AssignedResourceViewModel | null;
  isPrimary: boolean;
  stepNumber: number;                   // 3 to 6
  progressPercentage: number;           // 37.5 to 75.0
}

/**
 * Dropped-off trip ViewModel (passengers arrived, awaiting administrative completion).
 * Kept strictly separate from physically active trips.
 */
export interface DroppedOffTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: 'DROPPED_OFF';
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival?: string | null;
  purpose: string;
  passengerCount: number;
  colleagues: readonly string[];
  assignedResource: AssignedResourceViewModel | null;
  stepNumber: 7;
  progressPercentage: 87.5;
}

/**
 * Upcoming trip ViewModel (future-scheduled confirmed bookings).
 * Guaranteed to satisfy scheduledDeparture > referenceTime.
 */
export interface UpcomingTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: 'PENDING_ASSIGNMENT' | 'ASSIGNED';
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;           // Strictly future (scheduledDeparture > referenceTime)
  scheduledArrival?: string | null;
  purpose: string;
  passengerCount: number;
  colleagues: readonly string[];
  assignedResource: AssignedResourceViewModel | null;
  stepNumber: number;                   // 1 or 2
  progressPercentage: number;           // 12.5 or 25.0
}

/**
 * Past unfinished trip ViewModel (departure time has elapsed but trip was not started).
 * Guaranteed to satisfy scheduledDeparture <= referenceTime.
 */
export interface PastUnfinishedTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: 'PENDING_ASSIGNMENT' | 'ASSIGNED';
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;           // Strictly elapsed (scheduledDeparture <= referenceTime)
  scheduledArrival?: string | null;
  purpose: string;
  passengerCount: number;
  colleagues: readonly string[];
  assignedResource: AssignedResourceViewModel | null;
  stepNumber: number;                   // 1 or 2
  progressPercentage: number;           // 12.5 or 25.0
}

/**
 * Completed trip ViewModel (journey finished, verified, and archived).
 */
export interface CompletedTripViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: 'COMPLETED';
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival?: string | null;
  purpose: string;
  passengerCount: number;
  colleagues: readonly string[];
  assignedResource: AssignedResourceViewModel | null;
  stepNumber: 8;
  progressPercentage: 100.0;
}

/**
 * Item ViewModel for the request detail itinerary timeline.
 */
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
  isParentRequestRejected: boolean;
  stepNumber: number;
  progressPercentage: number;
}

/**
 * Aggregate summary overview for an employee's dashboard.
 */
export interface EmployeeTripOverview {
  activeTrips: readonly ActiveTripViewModel[];
  primaryActiveTrip: ActiveTripViewModel | null;
  secondaryActiveTrips: readonly ActiveTripViewModel[];
  droppedOffTrips: readonly DroppedOffTripViewModel[];
  upcomingTrips: readonly UpcomingTripViewModel[];
  pastUnfinishedTrips: readonly PastUnfinishedTripViewModel[];
  completedTrips: readonly CompletedTripViewModel[];
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Activity Timeline ViewModels
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type TimelineEventVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface ActivityTimelineItemViewModel {
  id: string;
  action: string;
  title: string;
  description: string;
  timestamp: string;
  isValidTimestamp: boolean;
  displayDateTime: string;
  relativeTime: string;
  actor: {
    id: string;
    name: string;
    role: UserRole | 'SYSTEM';
    roleLabel: string;
    department?: string;
  };
  leg?: {
    id: string;
    legType: LegType;
    label: string;
  };
  variant: TimelineEventVariant;
}
