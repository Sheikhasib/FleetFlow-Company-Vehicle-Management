import { TripLegStatus } from '@/types/domain';

export type DriverActionType =
  | 'ACCEPT_TRIP'
  | 'MARK_ARRIVED'
  | 'CONFIRM_PICKUP'
  | 'START_TRIP'
  | 'CONFIRM_DROPOFF'
  | 'COMPLETE_TRIP';

export type PendingActionStatus = 'PENDING' | 'SYNCING' | 'RECONCILED' | 'FAILED';

export interface DriverPendingAction {
  id: string;
  tripLegId: string;
  actorUserId: string; // Authenticated User.id of the driver
  actionType: DriverActionType;
  currentStatus: TripLegStatus;
  targetStatus: TripLegStatus;
  queuedAt: string; // ISO 8601 string
  syncedAt?: string;
  status: PendingActionStatus;
  errorMessage?: string;
  retryCount: number;
}

export interface OfflineSyncSummary {
  totalPending: number;
  totalSyncing: number;
  totalFailed: number;
  lastSyncAttempt?: string;
  isOnline: boolean;
  isSimulatedOffline: boolean;
}

export interface OfflineSyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export const DRIVER_ACTION_AUDIT_LOG_MAP: Record<DriverActionType, string> = {
  ACCEPT_TRIP: 'TRIP_ACCEPTED',
  MARK_ARRIVED: 'ARRIVED_AT_PICKUP',
  CONFIRM_PICKUP: 'PASSENGERS_PICKED_UP',
  START_TRIP: 'TRIP_STARTED',
  CONFIRM_DROPOFF: 'PASSENGERS_DROPPED_OFF',
  COMPLETE_TRIP: 'TRIP_LEG_COMPLETED',
};

export const TRIP_LEG_STATUS_PROGRESSION: readonly TripLegStatus[] = [
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'ACCEPTED',
  'ARRIVED_AT_PICKUP',
  'PICKED_UP',
  'IN_PROGRESS',
  'DROPPED_OFF',
  'COMPLETED',
] as const;

