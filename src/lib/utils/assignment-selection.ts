import { isActiveTripStatus } from '@/lib/constants/domain';
import { Assignment, TripLeg } from '@/types/domain';

export interface ResourceActiveAssignment {
  assignmentId: string;
  tripLegId: string;
  requestId: string;
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  legStatus: string;
}

/**
 * Selects the primary ACTIVE assignment for a driver or vehicle, prioritizing
 * an assignment whose trip leg is genuinely in flight over one that is merely
 * scheduled/ASSIGNED, while falling back to the first valid ACTIVE assignment.
 */
export function selectPrioritizedActiveAssignment(
  assignments: Assignment[],
  legMap: Map<string, TripLeg>
): ResourceActiveAssignment | undefined {
  if (assignments.length === 0) return undefined;

  const selected =
    assignments.find((assignment) => {
      const leg = legMap.get(assignment.tripLegId);
      return leg ? isActiveTripStatus(leg.status) : false;
    }) ??
    assignments.find((assignment) => legMap.has(assignment.tripLegId)) ??
    assignments[0];

  if (!selected) return undefined;

  const leg = legMap.get(selected.tripLegId);
  if (!leg) return undefined;

  return {
    assignmentId: selected.id,
    tripLegId: leg.id,
    requestId: leg.requestId,
    pickupLocation: leg.pickupLocation,
    destination: leg.destination,
    scheduledDeparture: leg.scheduledDeparture,
    legStatus: leg.status,
  };
}
