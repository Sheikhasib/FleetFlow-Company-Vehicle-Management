import { ActivityLog, User, TripLeg, UserRole, LegType } from '@/types/domain';
import { formatDisplayDateTime, formatRelativeTime } from '@/lib/utils/date';
import {
  ActivityTimelineItemViewModel,
  TimelineEventVariant,
} from '../types/view-models';

/**
 * Input data container for activity selectors.
 * Selectors receive immutable references and never mutate arrays or domain entities.
 */
export interface ActivitySelectorData {
  activityLogs: readonly ActivityLog[];
  users?: readonly User[];
  tripLegs?: readonly TripLeg[];
}

/**
 * Maps an action string to human-readable title and semantic color variant.
 */
export function resolveActionMeta(action: string): {
  title: string;
  variant: TimelineEventVariant;
} {
  const normalized = (action || '').trim().toUpperCase();

  switch (normalized) {
    case 'REQUEST_SUBMITTED':
      return { title: 'Request Submitted', variant: 'default' };
    case 'REQUEST_APPROVED':
      return { title: 'Request Approved', variant: 'success' };
    case 'REQUEST_REJECTED':
      return { title: 'Request Rejected', variant: 'destructive' };
    case 'REQUEST_CANCELLED':
      return { title: 'Request Cancelled', variant: 'destructive' };
    case 'REQUEST_COMPLETED':
      return { title: 'Request Completed', variant: 'success' };
    case 'ASSIGNMENT_DISPATCHED':
      return { title: 'Assignment Dispatched', variant: 'info' };
    case 'ASSIGNMENT_CREATED':
      return { title: 'Assignment Created', variant: 'info' };
    case 'TRIP_ACCEPTED':
      return { title: 'Trip Accepted', variant: 'info' };
    case 'ARRIVED_AT_PICKUP':
      return { title: 'Driver Arrived at Pickup', variant: 'warning' };
    case 'PASSENGERS_PICKED_UP':
      return { title: 'Passengers Boarded', variant: 'info' };
    case 'TRIP_STARTED':
      return { title: 'Trip Started', variant: 'info' };
    case 'PASSENGERS_DROPPED_OFF':
      return { title: 'Passengers Dropped Off', variant: 'warning' };
    case 'TRIP_LEG_COMPLETED':
      return { title: 'Trip Leg Completed', variant: 'success' };
    default: {
      const readable = normalized
        ? normalized
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase())
        : 'Activity Event';
      return { title: readable, variant: 'default' };
    }
  }
}

/**
 * Pure deterministic selector that transforms raw activity logs into presentation ViewModels.
 * - Filters by requestId
 * - Sorts newest first with deterministic tie-breaker
 * - Resolves actor information from users
 * - Resolves TripLeg correlation
 * - Formats timestamps safely
 * - Does not mutate source data
 */
export function selectActivityTimeline(
  data: ActivitySelectorData,
  requestId: string
): ActivityTimelineItemViewModel[] {
  if (!data?.activityLogs || !Array.isArray(data.activityLogs) || !requestId) {
    return [];
  }

  // 1. Filter logs belonging exclusively to this request
  const filtered = data.activityLogs.filter((log) => log.requestId === requestId);

  // 2. Pure sort: Newest first (descending). Invalid timestamps placed at the end.
  const sorted = [...filtered].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    const aValid = !isNaN(timeA) && Boolean(a.timestamp);
    const bValid = !isNaN(timeB) && Boolean(b.timestamp);

    if (aValid && bValid) {
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (b.id || '').localeCompare(a.id || '');
    }
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return (b.id || '').localeCompare(a.id || '');
  });

  // 3. User and TripLeg lookup maps
  const userMap = new Map<string, User>((data.users || []).map((u) => [u.id, u]));
  const legMap = new Map<string, TripLeg>((data.tripLegs || []).map((l) => [l.id, l]));

  // 4. Transform into ViewModels
  return sorted.map((log) => {
    const meta = resolveActionMeta(log.action);
    const dateObj = new Date(log.timestamp);
    const isValidTimestamp = !isNaN(dateObj.getTime()) && Boolean(log.timestamp);

    // Resolve Actor
    const user = log.actorId ? userMap.get(log.actorId) : undefined;
    let actorRole: UserRole | 'SYSTEM' = 'SYSTEM';
    let actorRoleLabel = 'System';
    let actorName = 'System Automated';
    let actorDepartment: string | undefined = undefined;

    if (user) {
      actorName = user.name;
      actorRole = user.role;
      actorDepartment = user.department;
      switch (user.role) {
        case 'EMPLOYEE':
          actorRoleLabel = 'Requester';
          break;
        case 'ADMIN':
          actorRoleLabel = 'Fleet Operations';
          break;
        case 'DRIVER':
          actorRoleLabel = 'Driver';
          break;
        default:
          actorRoleLabel = 'Staff';
          break;
      }
    }

    // Resolve linked TripLeg if present
    let leg: { id: string; legType: LegType; label: string } | undefined = undefined;
    if (log.tripLegId) {
      const matchedLeg = legMap.get(log.tripLegId);
      if (matchedLeg) {
        leg = {
          id: matchedLeg.id,
          legType: matchedLeg.legType,
          label: matchedLeg.legType === 'OUTBOUND' ? 'Outbound Leg' : 'Return Leg',
        };
      }
    }

    return {
      id: log.id,
      action: log.action,
      title: meta.title,
      description: log.description || 'No additional description provided.',
      timestamp: log.timestamp,
      isValidTimestamp,
      displayDateTime: isValidTimestamp ? formatDisplayDateTime(log.timestamp) : '—',
      relativeTime: isValidTimestamp ? formatRelativeTime(log.timestamp) : '—',
      actor: {
        id: log.actorId,
        name: actorName,
        role: actorRole,
        roleLabel: actorRoleLabel,
        department: actorDepartment,
      },
      leg,
      variant: meta.variant,
    };
  });
}
