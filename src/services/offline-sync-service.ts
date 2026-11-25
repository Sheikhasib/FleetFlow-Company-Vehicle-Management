import { TripLeg, TripLegStatus } from '@/types/domain';
import {
  DriverActionType,
  DriverPendingAction,
  OfflineSyncSummary,
  OfflineSyncResult,
  DRIVER_ACTION_AUDIT_LOG_MAP,
  TRIP_LEG_STATUS_PROGRESSION,
} from '@/features/driver/types/offline-types';
import { tripService } from '@/services/trip-service';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';

/**
 * Asynchronous FIFO Mutex providing mutual exclusion across async operations.
 * Prevents overlapping critical section executions while chaining queued requests safely.
 */
export class AsyncMutex {
  private current: Promise<void> = Promise.resolve();
  private lockCount = 0;

  async acquire(): Promise<() => void> {
    this.lockCount++;
    let releaseLock: () => void;
    const next = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previous = this.current;
    this.current = this.current.then(
      () => next,
      () => next
    );

    await previous;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.lockCount--;
      releaseLock();
    };
  }

  isLocked(): boolean {
    return this.lockCount > 0;
  }
}

export class OfflineSyncService {
  private mutex = new AsyncMutex();
  private inFlightByUser = new Map<string, Promise<OfflineSyncResult>>();

  /**
   * Resets concurrency guard state (primarily for test isolation).
   */
  resetConcurrencyGuard(): void {
    this.inFlightByUser.clear();
    this.mutex = new AsyncMutex();
  }

  /**
   * Checks whether a reconciliation is currently active globally or for a specific user.
   */
  isSyncing(userId?: string): boolean {
    if (userId) {
      return this.inFlightByUser.has(userId);
    }
    return this.inFlightByUser.size > 0 || this.mutex.isLocked();
  }

  /**
   * Canonical entry point for offline queue synchronization.
   * Alias for reconcilePendingActions protected by the service-level concurrency guard.
   */
  sync(userId?: string): Promise<OfflineSyncResult> {
    return this.reconcilePendingActions(userId);
  }
  /**
   * Evaluates the effective network connectivity.
   * Takes into account both browser navigator.onLine and in-app simulated offline toggle.
   */
  isEffectiveOnline(): boolean {
    const isSimulatedOffline = useFleetFlowStore.getState().isSimulatedOffline;
    if (isSimulatedOffline) return false;

    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      return window.navigator.onLine !== false;
    }
    return true;
  }

  /**
   * Enqueues a driver operational action into the local pending queue.
   * Guarantees FIFO order, deduplication, and driver user identity tracking.
   */
  enqueueAction(params: {
    tripLegId: string;
    actorUserId: string;
    actionType: DriverActionType;
    currentStatus: TripLegStatus;
    targetStatus: TripLegStatus;
  }): DriverPendingAction {
    const { tripLegId, actorUserId, actionType, currentStatus, targetStatus } = params;

    // Check for existing pending or syncing action for this trip and target status
    const actions = useFleetFlowStore.getState().pendingActions || [];
    const existing = actions.find(
      (a) =>
        a.tripLegId === tripLegId &&
        a.targetStatus === targetStatus &&
        (a.status === 'PENDING' || a.status === 'SYNCING')
    );
    if (existing) {
      return existing;
    }

    const newAction: DriverPendingAction = {
      id: `act_queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tripLegId,
      actorUserId,
      actionType,
      currentStatus,
      targetStatus,
      queuedAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    useFleetFlowStore.getState().enqueuePendingAction(newAction);
    return newAction;
  }

  /**
   * Reconciles all pending actions for the specified authenticated driver.
   * Actions are processed in strict FIFO order against TripService.
   *
   * Service-level concurrency guard:
   * - Shares in-flight sync promise for identical concurrent callers to prevent duplicate replay
   * - Serializes multi-actor sync requests via an asynchronous FIFO mutex
   * - Automatically releases mutex and resets in-flight tracking on completion or failure
   *
   * Includes crash-recovery idempotency: if the authoritative domain state is already
   * at or beyond the requested targetStatus, verifies driver ownership and ActivityLog audit
   * records to safely reconcile without duplicate mutations, or preserves FAILED if conflicting.
   */
  reconcilePendingActions(userId?: string): Promise<OfflineSyncResult> {
    const emptyResult: OfflineSyncResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    if (!this.isEffectiveOnline()) {
      return Promise.resolve(emptyResult);
    }

    const currentUserId = userId || useFleetFlowStore.getState().currentUserId;
    if (!currentUserId) {
      return Promise.resolve(emptyResult);
    }

    // 1. Shared in-flight promise check: if a sync for this actor is already in-flight, share it
    const existingPromise = this.inFlightByUser.get(currentUserId);
    if (existingPromise) {
      return existingPromise;
    }

    // 2. Wrap execution in a managed promise tracked per user
    const syncPromise = (async () => {
      // 3. Acquire mutex before reading or mutating queue state
      const release = await this.mutex.acquire();
      try {
        return await this.executeReconciliation(currentUserId);
      } finally {
        this.inFlightByUser.delete(currentUserId);
        release();
      }
    })();

    this.inFlightByUser.set(currentUserId, syncPromise);
    return syncPromise;
  }

  /**
   * Internal execution of pending action reconciliation under mutex lock.
   */
  private async executeReconciliation(currentUserId: string): Promise<OfflineSyncResult> {
    const results: OfflineSyncResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    const store = useFleetFlowStore.getState();

    // 1. Safety recovery: restore any actions previously left in SYNCING from an aborted session
    const staleSyncing = this.getPendingActionsForUser(currentUserId).filter(
      (a) => a.status === 'SYNCING'
    );
    for (const stale of staleSyncing) {
      store.updatePendingAction(stale.id, { status: 'PENDING' });
    }

    // 2. Isolate strictly to the authenticated user's actions
    const pendingActions = this.getPendingActionsForUser(currentUserId).filter(
      (a) => a.status === 'PENDING'
    );

    if (pendingActions.length === 0) {
      return results;
    }

    // 3. Sort in strict chronological FIFO order
    const sortedQueue = [...pendingActions].sort(
      (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
    );

    // Map of legs that have failed to prevent cascading replay of subsequent steps on that leg
    const haltedLegs = new Set<string>();

    try {
      for (const action of sortedQueue) {
        if (haltedLegs.has(action.tripLegId)) {
          continue;
        }

        results.processed++;
        store.updatePendingAction(action.id, { status: 'SYNCING' });

        try {
          // 1. Resolve authoritative TripLeg state
          const leg = await tripLegRepository.getById(action.tripLegId);
          if (!leg) {
            throw new Error(`Trip leg not found: ${action.tripLegId}`);
          }

          const currentIndex = TRIP_LEG_STATUS_PROGRESSION.indexOf(leg.status);
          const targetIndex = TRIP_LEG_STATUS_PROGRESSION.indexOf(action.targetStatus);

          if (currentIndex === -1 || targetIndex === -1) {
            throw new Error(
              `Unrecognized trip status in queue: current=${leg.status}, target=${action.targetStatus}`
            );
          }

          if (currentIndex >= targetIndex) {
            // Crash-recovery / idempotency path:
            // Check if action was already applied before crash or safely superseded
            await this.validateAndRecoverReplayedAction(action, leg, currentIndex, targetIndex);
          } else {
            // Standard forward path: execute via TripService
            await this.executeTripServiceAction(action);
          }

          // Successfully executed or safely recovered
          results.succeeded++;
          store.updatePendingAction(action.id, {
            status: 'RECONCILED',
            syncedAt: new Date().toISOString(),
            errorMessage: undefined,
          });

          // Remove reconciled action from queue
          store.removePendingAction(action.id);
        } catch (err: unknown) {
          results.failed++;
          const message = err instanceof Error ? err.message : 'Unknown synchronization error';
          results.errors.push(message);

          // Mark as FAILED and halt subsequent actions on this leg
          haltedLegs.add(action.tripLegId);
          store.updatePendingAction(action.id, {
            status: 'FAILED',
            errorMessage: message,
            retryCount: action.retryCount + 1,
          });
        }
      }
    } finally {
      // Safety guard: ensure no action belonging to this user is left stuck in SYNCING
      // if an unexpected exception or early termination occurred.
      const stuckActions = this.getPendingActionsForUser(currentUserId).filter(
        (a) => a.status === 'SYNCING'
      );
      for (const stuck of stuckActions) {
        store.updatePendingAction(stuck.id, { status: 'PENDING' });
      }
    }

    return results;
  }

  /**
   * Safely validates and recovers an action that is being replayed after a crash,
   * where the authoritative domain state is already at or beyond the requested targetStatus.
   *
   * Verifies actor authorization, driver assignment ownership, and ActivityLog audit trail.
   * Never mutates domain state or creates duplicate audit logs / notifications.
   */
  private async validateAndRecoverReplayedAction(
    action: DriverPendingAction,
    leg: TripLeg,
    currentIndex: number,
    targetIndex: number
  ): Promise<void> {
    const store = useFleetFlowStore.getState();

    // 1. Resolve actor User
    const user = store.users.find((u) => u.id === action.actorUserId);
    if (!user) {
      throw new Error(`Unauthorized: Invalid or unknown actor user ID: ${action.actorUserId}`);
    }

    // 2. Evaluate role-based authorization (strictly matching TripService rules)
    if (user.role === 'ADMIN') {
      // Admin actor: requires assignment existence
      const assignments = await assignmentRepository.getAll();
      const assignment = assignments.find((a) => a.tripLegId === leg.id);
      if (!assignment) {
        throw new Error(`No assignment found for trip leg: ${leg.id}`);
      }
    } else if (user.role === 'DRIVER') {
      // Driver actor: requires driver profile and active assignment ownership
      const driver = store.drivers.find((d) => d.userId === user.id);
      if (!driver) {
        throw new Error(
          `Unauthorized: No driver profile found for user ${user.id} (${user.name}).`
        );
      }

      // Check all assignments for this trip leg (including completed ones)
      const assignments = await assignmentRepository.getAll();
      const assignment = assignments.find((a) => a.tripLegId === leg.id);
      if (!assignment) {
        throw new Error(`No assignment found for trip leg: ${leg.id}`);
      }

      // Verify assignment ownership
      if (assignment.driverId !== driver.id) {
        throw new Error(
          `Unauthorized: Driver ${driver.id} (${user.name}) is not assigned to trip leg ${leg.id}. Assigned driver is ${assignment.driverId}.`
        );
      }

      // If the leg has not completed, assignment must be ACTIVE
      if (leg.status !== 'COMPLETED' && assignment.status !== 'ACTIVE') {
        throw new Error(`No active assignment found for trip leg: ${leg.id}`);
      }
    } else {
      // Reject EMPLOYEE and any other non-driver/non-admin roles
      throw new Error(
        `Unauthorized: User ${user.id} (${user.name}) with role ${user.role} cannot advance trip status.`
      );
    }

    // 3. Verify transition history in ActivityLog
    const expectedActionName = DRIVER_ACTION_AUDIT_LOG_MAP[action.actionType];
    const activityLogs = await activityLogRepository.getAll();
    const matchingLog = activityLogs.find(
      (log) =>
        log.tripLegId === leg.id &&
        log.actorId === action.actorUserId &&
        log.action === expectedActionName
    );

    if (!matchingLog) {
      if (currentIndex === targetIndex) {
        throw new Error(
          `Conflicting transition: Trip leg is already at ${leg.status} but no verified transition record exists for driver ${action.actorUserId}.`
        );
      } else {
        throw new Error(
          `Conflicting transition: Trip leg has already advanced to ${leg.status} without verified driver transition history for ${action.actionType}.`
        );
      }
    }

    // Authorization, ownership, and transition audit log verified!
    // Recovery complete with ZERO additional mutations applied.
  }

  /**
   * Executes a pending action directly through TripService.
   */
  private async executeTripServiceAction(action: DriverPendingAction): Promise<void> {
    switch (action.actionType) {
      case 'ACCEPT_TRIP':
        await tripService.acceptTrip(action.tripLegId, action.actorUserId);
        break;
      case 'MARK_ARRIVED':
        await tripService.markArrivedAtPickup(action.tripLegId, action.actorUserId);
        break;
      case 'CONFIRM_PICKUP':
        await tripService.confirmPickup(action.tripLegId, action.actorUserId);
        break;
      case 'START_TRIP':
        await tripService.startTrip(action.tripLegId, action.actorUserId);
        break;
      case 'CONFIRM_DROPOFF':
        await tripService.confirmDropoff(action.tripLegId, action.actorUserId);
        break;
      case 'COMPLETE_TRIP':
        await tripService.completeTrip(action.tripLegId, action.actorUserId);
        break;
      default:
        throw new Error(
          `Unsupported offline action type: ${(action as DriverPendingAction).actionType}`
        );
    }
  }

  /**
   * Resets a failed action to PENDING so it can be re-attempted.
   */
  async retryAction(actionId: string): Promise<boolean> {
    const store = useFleetFlowStore.getState();
    const action = store.pendingActions.find((a) => a.id === actionId);
    if (!action) return false;

    store.updatePendingAction(actionId, {
      status: 'PENDING',
      errorMessage: undefined,
    });

    if (this.isEffectiveOnline()) {
      await this.reconcilePendingActions(action.actorUserId);
      return true;
    }
    return false;
  }

  /**
   * Dismisses and removes an action from the queue.
   */
  dismissAction(actionId: string): void {
    useFleetFlowStore.getState().removePendingAction(actionId);
  }

  /**
   * Retrieves pending actions strictly isolated to a given User.id.
   */
  getPendingActionsForUser(userId: string): DriverPendingAction[] {
    const actions = useFleetFlowStore.getState().pendingActions || [];
    return actions.filter((a) => a.actorUserId === userId);
  }

  /**
   * Resolves the active pending action for a specific TripLeg.
   */
  getPendingActionForTrip(tripLegId: string): DriverPendingAction | undefined {
    const actions = useFleetFlowStore.getState().pendingActions || [];
    return actions.find(
      (a) => a.tripLegId === tripLegId && (a.status === 'PENDING' || a.status === 'SYNCING')
    );
  }

  /**
   * Aggregates a summary of offline synchronization state for the active driver.
   */
  getSyncSummary(userId: string): OfflineSyncSummary {
    const userActions = this.getPendingActionsForUser(userId);
    const isSimulatedOffline = useFleetFlowStore.getState().isSimulatedOffline;
    const isOnline = this.isEffectiveOnline();

    return {
      totalPending: userActions.filter((a) => a.status === 'PENDING').length,
      totalSyncing: userActions.filter((a) => a.status === 'SYNCING').length,
      totalFailed: userActions.filter((a) => a.status === 'FAILED').length,
      isOnline,
      isSimulatedOffline,
    };
  }
}

export const offlineSyncService = new OfflineSyncService();
