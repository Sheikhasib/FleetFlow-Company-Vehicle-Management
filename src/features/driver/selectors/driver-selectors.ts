import {
  User,
  Driver,
  Vehicle,
  VehicleRequest,
  TripLeg,
  Assignment,
  Passenger,
  ActivityLog,
  TripLegStatus,
} from '@/types/domain';
import {
  DriverTripCardViewModel,
  DriverDashboardOverview,
  DriverTripDetailViewModel,
  DRIVER_NEXT_ACTIONS,
} from '../types/view-models';

export interface DriverSelectorState {
  users: readonly User[];
  drivers: readonly Driver[];
  vehicles: readonly Vehicle[];
  requests: readonly VehicleRequest[];
  tripLegs: readonly TripLeg[];
  assignments: readonly Assignment[];
  passengers?: readonly Passenger[];
  activityLogs?: readonly ActivityLog[];
}

/**
 * Resolves the Driver domain entity associated with an authenticated User.id.
 */
export function resolveDriverForUser(
  state: DriverSelectorState,
  userId: string
): Driver | null {
  if (!userId || !state.drivers || !Array.isArray(state.drivers)) return null;
  return state.drivers.find((d) => d.userId === userId) || null;
}

/**
 * Checks whether a trip leg status represents an in-progress operational journey
 * (ACCEPTED through DROPPED_OFF).
 */
export function isActiveDriverTripStatus(status: TripLegStatus): boolean {
  return [
    'ACCEPTED',
    'ARRIVED_AT_PICKUP',
    'PICKED_UP',
    'IN_PROGRESS',
    'DROPPED_OFF',
  ].includes(status);
}

/**
 * Date helper: checks if two dates fall on the same calendar day (local time).
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Date helper: checks if date1 is strictly before the calendar day of date2 (local time).
 */
function isBeforeDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1.getTime() < d2.getTime();
}

/**
 * Selects all trips assigned to a specific driver, constructed into DriverTripCardViewModel.
 * Excludes unassigned or cancelled intake states.
 */
export function selectDriverTrips(
  state: DriverSelectorState,
  driverUserId: string
): DriverTripCardViewModel[] {
  const driver = resolveDriverForUser(state, driverUserId);
  if (!driver) return [];

  const driverUser = state.users.find((u) => u.id === driver.userId);
  const driverName = driverUser?.name || 'Driver';

  // Find all active or completed assignments for this driver
  const assignments = (state.assignments || []).filter(
    (a) => a.driverId === driver.id && (a.status === 'ACTIVE' || a.status === 'COMPLETED')
  );

  const asgMap = new Map(assignments.map((a) => [a.tripLegId, a]));
  const reqMap = new Map((state.requests || []).map((r) => [r.id, r]));
  const userMap = new Map((state.users || []).map((u) => [u.id, u]));
  const vehMap = new Map((state.vehicles || []).map((v) => [v.id, v]));

  const results: DriverTripCardViewModel[] = [];

  for (const leg of state.tripLegs || []) {
    const asg = asgMap.get(leg.id);
    if (!asg) continue; // Not assigned to this driver

    const req = reqMap.get(leg.requestId);
    // Suppress orphaned trip leg if parent request is missing, CANCELLED, or REJECTED
    if (!req || req.status === 'CANCELLED' || req.status === 'REJECTED') {
      continue;
    }

    const requester = userMap.get(req.requesterId);
    const vehicle = vehMap.get(asg.vehicleId);

    results.push({
      legId: leg.id,
      requestId: leg.requestId,
      legType: leg.legType,
      status: leg.status,
      pickupLocation: leg.pickupLocation,
      destination: leg.destination,
      scheduledDeparture: leg.scheduledDeparture,
      scheduledArrival: leg.scheduledArrival,
      passengerCount: req.passengerCount || 1,
      requesterName: requester?.name || 'Authorized Employee',
      requesterDepartment: requester?.department || 'Department Staff',
      requesterPhone: requester?.phone,
      purpose: req.purpose || 'Official transportation',
      notes: req.notes,
      vehicleId: vehicle?.id || asg.vehicleId,
      vehicleModel: vehicle?.model || 'Assigned Vehicle',
      vehiclePlate: vehicle?.registrationNumber || 'Registration Pending',
      vehicleCapacity: vehicle?.capacity || 4,
      driverId: driver.id,
      driverUserId: driver.userId,
      driverName,
      assignmentId: asg.id,
      assignmentStatus: asg.status,
    });
  }

  // Sort: Active trips first, then upcoming by departure ascending, then completed descending
  return results.sort((a, b) => {
    const aIsActive = isActiveDriverTripStatus(a.status);
    const bIsActive = isActiveDriverTripStatus(b.status);

    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;

    const aIsCompleted = a.status === 'COMPLETED';
    const bIsCompleted = b.status === 'COMPLETED';

    if (!aIsCompleted && bIsCompleted) return -1;
    if (aIsCompleted && !bIsCompleted) return 1;

    const timeA = new Date(a.scheduledDeparture).getTime() || 0;
    const timeB = new Date(b.scheduledDeparture).getTime() || 0;

    if (aIsCompleted) {
      // Completed trips newest first
      return timeB - timeA || a.legId.localeCompare(b.legId);
    }

    // Active or assigned trips earliest departure first
    return timeA - timeB || a.legId.localeCompare(b.legId);
  });
}

/**
 * Builds the Driver Dashboard Overview with mutually exclusive queues and metrics.
 */
export function selectDriverDashboardOverview(
  state: DriverSelectorState,
  driverUserId: string,
  referenceTime: Date = new Date()
): DriverDashboardOverview {
  const allTrips = selectDriverTrips(state, driverUserId);

  let activeTrip: DriverTripCardViewModel | null = null;
  const todayTrips: DriverTripCardViewModel[] = [];
  const upcomingTrips: DriverTripCardViewModel[] = [];
  const completedTrips: DriverTripCardViewModel[] = [];

  for (const trip of allTrips) {
    if (trip.status === 'COMPLETED') {
      completedTrips.push(trip);
      continue;
    }

    if (isActiveDriverTripStatus(trip.status)) {
      if (!activeTrip) {
        activeTrip = trip;
      }
      // Guarantee strict category integrity: active trips are rendered exclusively in
      // activeTrip (Hero) and must never leak into todayTrips, upcomingTrips, or completedTrips.
      // Any secondary active trip is suppressed from scheduled queues.
      continue;
    }

    // Status is ASSIGNED (pending driver acceptance)
    const departureDate = new Date(trip.scheduledDeparture);
    const isValidDate = !isNaN(departureDate.getTime());

    if (isValidDate) {
      if (isSameDay(departureDate, referenceTime) || isBeforeDay(departureDate, referenceTime)) {
        // Scheduled for today or past unaccepted assignment
        todayTrips.push(trip);
      } else {
        // Future date
        upcomingTrips.push(trip);
      }
    } else {
      // Fallback for invalid date -> keep in today queue
      todayTrips.push(trip);
    }
  }

  const assignedCount = allTrips.filter((t) => t.status === 'ASSIGNED').length;
  const activeCount = allTrips.filter((t) => isActiveDriverTripStatus(t.status)).length;
  const todayCount =
    todayTrips.length +
    allTrips.filter(
      (t) => isActiveDriverTripStatus(t.status) && isSameDay(new Date(t.scheduledDeparture), referenceTime)
    ).length;
  const completedCount = completedTrips.length;

  return {
    activeTrip,
    todayTrips,
    upcomingTrips,
    completedTrips,
    stats: {
      assignedCount,
      activeCount,
      todayCount,
      completedCount,
    },
  };
}

/**
 * Resolves full trip execution details for a specific TripLeg.
 * Returns null if the trip is not found or does not belong to the acting driver.
 */
export function selectDriverTripDetail(
  state: DriverSelectorState,
  tripLegId: string,
  driverUserId: string
): DriverTripDetailViewModel | null {
  const allTrips = selectDriverTrips(state, driverUserId);
  const trip = allTrips.find((t) => t.legId === tripLegId);
  if (!trip) return null;

  const passengers = (state.passengers || []).filter(
    (p) => p.requestId === trip.requestId
  );

  const activityLogs = (state.activityLogs || [])
    .filter((l) => l.tripLegId === trip.legId || l.requestId === trip.requestId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const nextAction =
    trip.status !== 'COMPLETED' && trip.status !== 'PENDING_ASSIGNMENT'
      ? DRIVER_NEXT_ACTIONS[trip.status] || null
      : null;

  return {
    ...trip,
    passengers,
    activityLogs,
    nextAction,
    isCompleted: trip.status === 'COMPLETED',
  };
}
