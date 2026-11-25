import { TripLegStatus } from '@/types/domain';

/**
 * Domain constants and configuration assumptions.
 */

// Default estimated trip duration in hours for prototype conflict validation
// when arrival time is not explicitly specified.
// (Unresolved decision A: documented assumption, isolated in constant).
export const DEFAULT_TRIP_DURATION_HOURS = 2;

// Approved Active Trip Definition (Decision 2)
export const ACTIVE_TRIP_STATUSES: readonly TripLegStatus[] = [
  'ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_PROGRESS',
  'DROPPED_OFF',
] as const;

export function isActiveTripStatus(status: TripLegStatus): boolean {
  return (ACTIVE_TRIP_STATUSES as readonly string[]).includes(status);
}

// Valid Sequential Trip Lifecycle Transitions
export const VALID_TRIP_TRANSITIONS: Record<TripLegStatus, TripLegStatus | null> = {
  PENDING_ASSIGNMENT: 'ASSIGNED',
  ASSIGNED: 'ACCEPTED',
  ACCEPTED: 'ARRIVED_AT_PICKUP',
  ARRIVED_AT_PICKUP: 'PICKED_UP',
  PICKED_UP: 'IN_PROGRESS',
  IN_PROGRESS: 'DROPPED_OFF',
  DROPPED_OFF: 'COMPLETED',
  COMPLETED: null, // Terminal state
};

// Approved corporate locations for consistent demo routing
export const COMPANY_LOCATIONS = [
  'Headquarters — Metro Center',
  'North Manufacturing Plant — Detroit',
  'South Assembly Facility — Toledo',
  'Tech Innovation Center — Ann Arbor',
  'Regional Distribution Hub — Cleveland',
  'Metro Airport Terminal 2',
] as const;
