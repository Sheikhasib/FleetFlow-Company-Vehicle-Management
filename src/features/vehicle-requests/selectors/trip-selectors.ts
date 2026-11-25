import {
  VehicleRequest,
  TripLeg,
  Assignment,
  Vehicle,
  Driver,
  User,
  Passenger,
  TripLegStatus,
} from '@/types/domain';
import {
  ActiveTripStatus,
  ActiveTripViewModel,
  DroppedOffTripViewModel,
  UpcomingTripViewModel,
  PastUnfinishedTripViewModel,
  CompletedTripViewModel,
  TripLegTimelineItemViewModel,
  AssignedResourceViewModel,
  EmployeeTripOverview,
  getTripLifecycleMilestone,
} from '../types/view-models';

/**
 * Input data container for trip selectors.
 * Selectors receive immutable references and never mutate arrays or domain entities.
 */
export interface TripSelectorData {
  requests: readonly VehicleRequest[];
  tripLegs: readonly TripLeg[];
  assignments?: readonly Assignment[];
  vehicles?: readonly Vehicle[];
  drivers?: readonly Driver[];
  users?: readonly User[];
  passengers?: readonly Passenger[];
}

export interface ResolvedDriverContact {
  displayPhone: string;
  telUri: string;
}

/**
 * Validates whether a candidate phone string is structurally acceptable.
 * Rules:
 * - Empty string or whitespace-only is rejected.
 * - Non-phone placeholders (e.g. 'n/a', 'none', 'unknown') are rejected.
 * - Checks that string contains only valid phone characters and has 7-15 digits.
 */
function isValidPhoneCandidate(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;

  // Reject common non-phone placeholders
  const lower = trimmed.toLowerCase();
  if (['n/a', 'none', 'unknown', 'null', 'undefined', 'pending', '-'].includes(lower)) {
    return false;
  }

  // Structural sanity check: only digits, spaces, hyphens, plus at start, parentheses, dots
  if (!/^\+?[0-9\s\-().]{7,25}$/.test(trimmed)) {
    return false;
  }

  // Count digits: must be between 7 and 15 (standard ITU-T E.164 boundary)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }

  return true;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Safe Driver Phone Resolution
 * Priority: 1. driver.phone -> 2. linked user.phone -> 3. null
 *
 * Rules:
 * - Empty string or whitespace-only is treated as unavailable.
 * - Non-phone placeholders (e.g. 'n/a', 'none', 'unknown') are rejected.
 * - Checks that string contains only valid phone characters and has 7-15 digits.
 * - If driver.phone is missing or invalid, falls back to linked user.phone.
 * - Produces sanitized tel: URI (e.g. 'tel:+15550301' or 'tel:01712345678').
 * - Zero phone numbers are fabricated or guessed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function resolveDriverPhone(
  driver: Driver | null | undefined,
  users: readonly User[] = []
): ResolvedDriverContact | null {
  if (!driver) return null;

  let candidate: string | null = null;

  // 1. Primary: driver.phone if valid
  if (isValidPhoneCandidate(driver.phone)) {
    candidate = driver.phone!.trim();
  } else if (driver.userId) {
    // 2. Fallback: linked user.phone if driver.phone is missing or invalid
    const linkedUser = users.find((u) => u.id === driver.userId);
    if (isValidPhoneCandidate(linkedUser?.phone)) {
      candidate = linkedUser!.phone!.trim();
    }
  }

  if (!candidate) return null;

  // Produce standardized tel: URI (RFC 3966 global for + prefix, standard dialer for national)
  const digitsOnly = candidate.replace(/\D/g, '');
  const telUri = candidate.startsWith('+') ? `tel:+${digitsOnly}` : `tel:${digitsOnly}`;

  return {
    displayPhone: candidate,
    telUri,
  };
}

/**
 * Parses and validates an explicit referenceTime without side effects.
 * Throws a descriptive error if invalid, guaranteeing determinism.
 */
export function parseReferenceTime(referenceTime: Date | string): number {
  if (referenceTime instanceof Date) {
    const t = referenceTime.getTime();
    if (isNaN(t)) {
      throw new Error('Invalid Date object provided as referenceTime');
    }
    return t;
  }
  if (typeof referenceTime === 'string') {
    const t = new Date(referenceTime).getTime();
    if (isNaN(t)) {
      throw new Error(`Invalid ISO date string provided as referenceTime: "${referenceTime}"`);
    }
    return t;
  }
  throw new Error('referenceTime must be an explicit Date instance or ISO date string');
}

/**
 * Safely parses a leg ISO departure string to timestamp ms.
 * Returns null if the string is empty, missing, or unparseable.
 */
function parseIsoMs(val: string | undefined | null): number | null {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return null;
  }
  const t = new Date(val).getTime();
  return isNaN(t) ? null : t;
}

/**
 * Resolves assigned vehicle and driver resources for a specific trip leg.
 */
function resolveAssignedResource(
  legId: string,
  assignments: readonly Assignment[] = [],
  vehicles: readonly Vehicle[] = [],
  drivers: readonly Driver[] = [],
  users: readonly User[] = []
): AssignedResourceViewModel | null {
  const assignment = assignments.find((a) => a.tripLegId === legId);
  if (!assignment) return null;

  const vehicle = vehicles.find((v) => v.id === assignment.vehicleId);
  const driver = drivers.find((d) => d.id === assignment.driverId);

  // If vehicle is missing, cannot formulate valid resource
  if (!vehicle) return null;

  const linkedUser = driver ? users.find((u) => u.id === driver.userId) : null;
  const contact = resolveDriverPhone(driver, users);

  return {
    driverId: driver ? driver.id : '',
    driverName: linkedUser?.name || (driver ? driver.id : 'Unassigned Driver'),
    driverPhone: contact?.displayPhone ?? null,
    driverTelUri: contact?.telUri ?? null,
    vehicleId: vehicle.id,
    vehicleModel: vehicle.model,
    vehiclePlate: vehicle.registrationNumber,
    vehicleCapacity: vehicle.capacity,
  };
}

/**
 * Resolves colleague passenger names for a request.
 */
function resolveColleagues(
  requestId: string,
  passengers: readonly Passenger[] = []
): readonly string[] {
  return passengers.filter((p) => p.requestId === requestId).map((p) => p.name);
}

/**
 * Deterministic comparator for active trip prioritization:
 * 1. Status weight: IN_PROGRESS (10) > PICKED_UP (8) > ARRIVED_AT_PICKUP (6) > ACCEPTED (4)
 * 2. Earliest scheduledDeparture
 * 3. Lexicographical leg.id
 */
function compareActiveTrips(a: ActiveTripViewModel, b: ActiveTripViewModel): number {
  const weights: Record<ActiveTripStatus, number> = {
    IN_PROGRESS: 10,
    PICKED_UP: 8,
    ARRIVED_AT_PICKUP: 6,
    ACCEPTED: 4,
  };
  const weightDiff = (weights[b.status] || 0) - (weights[a.status] || 0);
  if (weightDiff !== 0) return weightDiff;

  const timeDiff = (parseIsoMs(a.scheduledDeparture) ?? 0) - (parseIsoMs(b.scheduledDeparture) ?? 0);
  if (timeDiff !== 0) return timeDiff;

  return a.legId.localeCompare(b.legId);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Selectors
 * Pure, deterministic functions with zero side effects or Date.now() calls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Selects all active trips for an employee.
 * Strictly includes: ACCEPTED, ARRIVED_AT_PICKUP, PICKED_UP, IN_PROGRESS.
 * Excludes DROPPED_OFF and legs belonging to CANCELLED or REJECTED requests.
 * Never silently discards additional active legs.
 */
export function selectActiveTrips(
  data: TripSelectorData,
  currentUserId: string
): ActiveTripViewModel[] {
  const userRequests = data.requests.filter((r) => r.requesterId === currentUserId);
  const activeReqMap = new Map(
    userRequests
      .filter((r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED')
      .map((r) => [r.id, r])
  );

  const activeStatuses: readonly ActiveTripStatus[] = [
    'ACCEPTED',
    'ARRIVED_AT_PICKUP',
    'PICKED_UP',
    'IN_PROGRESS',
  ];

  const matchingLegs = data.tripLegs.filter(
    (leg) =>
      activeReqMap.has(leg.requestId) &&
      (activeStatuses as readonly string[]).includes(leg.status)
  );

  const viewModels: ActiveTripViewModel[] = matchingLegs.map((leg) => {
    const parentReq = activeReqMap.get(leg.requestId)!;
    const milestone = getTripLifecycleMilestone(leg.status);
    const assignedResource = resolveAssignedResource(
      leg.id,
      data.assignments,
      data.vehicles,
      data.drivers,
      data.users
    );
    const colleagues = resolveColleagues(parentReq.id, data.passengers);

    return {
      legId: leg.id,
      requestId: parentReq.id,
      legType: leg.legType,
      status: leg.status as ActiveTripStatus,
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival || null,
      purpose: parentReq.purpose,
      passengerCount: parentReq.passengerCount,
      colleagues,
      assignedResource,
      isPrimary: false, // Assigned deterministically after sorting
      stepNumber: milestone.step,
      progressPercentage: milestone.percentage,
    };
  });

  viewModels.sort(compareActiveTrips);

  // Mark the highest-ranked active trip as primary
  if (viewModels.length > 0) {
    viewModels[0].isPrimary = true;
  }

  return viewModels;
}

/**
 * Selects dropped-off trips for an employee.
 * Strictly includes DROPPED_OFF status (passengers arrived, awaiting admin closure).
 * Kept separate from physically active trips.
 */
export function selectDroppedOffTrips(
  data: TripSelectorData,
  currentUserId: string
): DroppedOffTripViewModel[] {
  const userRequests = data.requests.filter((r) => r.requesterId === currentUserId);
  const activeReqMap = new Map(
    userRequests
      .filter((r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED')
      .map((r) => [r.id, r])
  );

  const matchingLegs = data.tripLegs.filter(
    (leg) => activeReqMap.has(leg.requestId) && leg.status === 'DROPPED_OFF'
  );

  const viewModels: DroppedOffTripViewModel[] = matchingLegs.map((leg) => {
    const parentReq = activeReqMap.get(leg.requestId)!;
    const assignedResource = resolveAssignedResource(
      leg.id,
      data.assignments,
      data.vehicles,
      data.drivers,
      data.users
    );
    const colleagues = resolveColleagues(parentReq.id, data.passengers);

    return {
      legId: leg.id,
      requestId: parentReq.id,
      legType: leg.legType,
      status: 'DROPPED_OFF',
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival || null,
      purpose: parentReq.purpose,
      passengerCount: parentReq.passengerCount,
      colleagues,
      assignedResource,
      stepNumber: 7,
      progressPercentage: 87.5,
    };
  });

  // Sort descending by scheduledDeparture (most recent first)
  viewModels.sort((a, b) => (parseIsoMs(b.scheduledDeparture) ?? 0) - (parseIsoMs(a.scheduledDeparture) ?? 0));

  return viewModels;
}

/**
 * Selects upcoming trips for an employee.
 * Criteria:
 * - status is PENDING_ASSIGNMENT or ASSIGNED
 * - scheduledDeparture > referenceTime (strictly future)
 * - parent request is NOT CANCELLED or REJECTED
 * Sorted in ascending order of scheduledDeparture (earliest departure first).
 */
export function selectUpcomingTrips(
  data: TripSelectorData,
  currentUserId: string,
  referenceTime: Date | string
): UpcomingTripViewModel[] {
  const refTimeMs = parseReferenceTime(referenceTime);

  const userRequests = data.requests.filter((r) => r.requesterId === currentUserId);
  const validReqMap = new Map(
    userRequests
      .filter((r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED')
      .map((r) => [r.id, r])
  );

  const matchingLegs = data.tripLegs.filter((leg) => {
    if (!validReqMap.has(leg.requestId)) return false;
    if (leg.status !== 'PENDING_ASSIGNMENT' && leg.status !== 'ASSIGNED') return false;
    const depMs = parseIsoMs(leg.scheduledDeparture);
    if (depMs === null) return false;
    return depMs > refTimeMs; // Strictly future
  });

  const viewModels: UpcomingTripViewModel[] = matchingLegs.map((leg) => {
    const parentReq = validReqMap.get(leg.requestId)!;
    const milestone = getTripLifecycleMilestone(leg.status);
    const assignedResource = resolveAssignedResource(
      leg.id,
      data.assignments,
      data.vehicles,
      data.drivers,
      data.users
    );
    const colleagues = resolveColleagues(parentReq.id, data.passengers);

    return {
      legId: leg.id,
      requestId: parentReq.id,
      legType: leg.legType,
      status: leg.status as 'PENDING_ASSIGNMENT' | 'ASSIGNED',
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival || null,
      purpose: parentReq.purpose,
      passengerCount: parentReq.passengerCount,
      colleagues,
      assignedResource,
      stepNumber: milestone.step,
      progressPercentage: milestone.percentage,
    };
  });

  // Sort ascending by departure time (earliest first), then leg.id
  viewModels.sort((a, b) => {
    const timeDiff = (parseIsoMs(a.scheduledDeparture) ?? 0) - (parseIsoMs(b.scheduledDeparture) ?? 0);
    if (timeDiff !== 0) return timeDiff;
    return a.legId.localeCompare(b.legId);
  });

  return viewModels;
}

/**
 * Selects past unfinished trips for an employee.
 * Criteria:
 * - status is PENDING_ASSIGNMENT or ASSIGNED
 * - scheduledDeparture <= referenceTime (departure time reached or elapsed)
 * - parent request is NOT CANCELLED or REJECTED
 * Represents delayed dispatch or unstarted past schedules.
 */
export function selectPastUnfinishedTrips(
  data: TripSelectorData,
  currentUserId: string,
  referenceTime: Date | string
): PastUnfinishedTripViewModel[] {
  const refTimeMs = parseReferenceTime(referenceTime);

  const userRequests = data.requests.filter((r) => r.requesterId === currentUserId);
  const validReqMap = new Map(
    userRequests
      .filter((r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED')
      .map((r) => [r.id, r])
  );

  const matchingLegs = data.tripLegs.filter((leg) => {
    if (!validReqMap.has(leg.requestId)) return false;
    if (leg.status !== 'PENDING_ASSIGNMENT' && leg.status !== 'ASSIGNED') return false;
    const depMs = parseIsoMs(leg.scheduledDeparture);
    if (depMs === null) return false;
    return depMs <= refTimeMs; // Departure reached or elapsed
  });

  const viewModels: PastUnfinishedTripViewModel[] = matchingLegs.map((leg) => {
    const parentReq = validReqMap.get(leg.requestId)!;
    const milestone = getTripLifecycleMilestone(leg.status);
    const assignedResource = resolveAssignedResource(
      leg.id,
      data.assignments,
      data.vehicles,
      data.drivers,
      data.users
    );
    const colleagues = resolveColleagues(parentReq.id, data.passengers);

    return {
      legId: leg.id,
      requestId: parentReq.id,
      legType: leg.legType,
      status: leg.status as 'PENDING_ASSIGNMENT' | 'ASSIGNED',
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival || null,
      purpose: parentReq.purpose,
      passengerCount: parentReq.passengerCount,
      colleagues,
      assignedResource,
      stepNumber: milestone.step,
      progressPercentage: milestone.percentage,
    };
  });

  // Sort descending by scheduledDeparture (most recently overdue first), then leg.id
  viewModels.sort((a, b) => {
    const timeDiff = (parseIsoMs(b.scheduledDeparture) ?? 0) - (parseIsoMs(a.scheduledDeparture) ?? 0);
    if (timeDiff !== 0) return timeDiff;
    return a.legId.localeCompare(b.legId);
  });

  return viewModels;
}

/**
 * Selects completed trips for an employee.
 * Criteria:
 * - status is COMPLETED
 * - parent request is NOT CANCELLED or REJECTED
 * Sorted in descending order of scheduledDeparture (most recently completed first).
 */
export function selectCompletedTrips(
  data: TripSelectorData,
  currentUserId: string
): CompletedTripViewModel[] {
  const userRequests = data.requests.filter((r) => r.requesterId === currentUserId);
  const validReqMap = new Map(
    userRequests
      .filter((r) => r.status !== 'CANCELLED' && r.status !== 'REJECTED')
      .map((r) => [r.id, r])
  );

  const matchingLegs = data.tripLegs.filter(
    (leg) => validReqMap.has(leg.requestId) && leg.status === 'COMPLETED'
  );

  const viewModels: CompletedTripViewModel[] = matchingLegs.map((leg) => {
    const parentReq = validReqMap.get(leg.requestId)!;
    const assignedResource = resolveAssignedResource(
      leg.id,
      data.assignments,
      data.vehicles,
      data.drivers,
      data.users
    );
    const colleagues = resolveColleagues(parentReq.id, data.passengers);

    return {
      legId: leg.id,
      requestId: parentReq.id,
      legType: leg.legType,
      status: 'COMPLETED',
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival || null,
      purpose: parentReq.purpose,
      passengerCount: parentReq.passengerCount,
      colleagues,
      assignedResource,
      stepNumber: 8,
      progressPercentage: 100.0,
    };
  });

  viewModels.sort((a, b) => {
    const timeDiff = (parseIsoMs(b.scheduledDeparture) ?? 0) - (parseIsoMs(a.scheduledDeparture) ?? 0);
    if (timeDiff !== 0) return timeDiff;
    return a.legId.localeCompare(b.legId);
  });

  return viewModels;
}

/**
 * Aggregate overview selector returning all classified trip categories for an employee.
 * Pure and deterministic, accepting an explicit referenceTime.
 */
export function selectEmployeeTripOverview(
  data: TripSelectorData,
  currentUserId: string,
  referenceTime: Date | string
): EmployeeTripOverview {
  const activeTrips = selectActiveTrips(data, currentUserId);
  const droppedOffTrips = selectDroppedOffTrips(data, currentUserId);
  const upcomingTrips = selectUpcomingTrips(data, currentUserId, referenceTime);
  const pastUnfinishedTrips = selectPastUnfinishedTrips(data, currentUserId, referenceTime);
  const completedTrips = selectCompletedTrips(data, currentUserId);

  const primaryActiveTrip = activeTrips.length > 0 ? activeTrips[0] : null;
  const secondaryActiveTrips = activeTrips.length > 1 ? activeTrips.slice(1) : [];

  return {
    activeTrips,
    primaryActiveTrip,
    secondaryActiveTrips,
    droppedOffTrips,
    upcomingTrips,
    pastUnfinishedTrips,
    completedTrips,
  };
}

/**
 * Selects the complete itinerary timeline items for a specific request detail view.
 * Accurately reflects parent request cancellation and rejection context without
 * inventing invalid TripLegStatus values.
 */
export function selectTripLegTimeline(
  data: TripSelectorData,
  requestId: string
): TripLegTimelineItemViewModel[] {
  const parentRequest = data.requests.find((r) => r.id === requestId);
  const isCancelled = parentRequest?.status === 'CANCELLED';
  const isRejected = parentRequest?.status === 'REJECTED';

  const matchingLegs = data.tripLegs.filter((leg) => leg.requestId === requestId);

  const viewModels: TripLegTimelineItemViewModel[] = matchingLegs.map((leg) => {
    const milestone = getTripLifecycleMilestone(leg.status);
    const assignedResource = resolveAssignedResource(
      leg.id,
      data.assignments,
      data.vehicles,
      data.drivers,
      data.users
    );

    return {
      legId: leg.id,
      requestId,
      legType: leg.legType,
      status: leg.status,
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival || null,
      assignedResource,
      isParentRequestCancelled: isCancelled,
      isParentRequestRejected: isRejected,
      stepNumber: milestone.step,
      progressPercentage: milestone.percentage,
    };
  });

  // Sort chronologically by scheduled departure, Outbound first
  viewModels.sort((a, b) => {
    if (a.legType === 'OUTBOUND' && b.legType === 'RETURN') return -1;
    if (a.legType === 'RETURN' && b.legType === 'OUTBOUND') return 1;
    return (parseIsoMs(a.scheduledDeparture) ?? 0) - (parseIsoMs(b.scheduledDeparture) ?? 0);
  });

  return viewModels;
}
