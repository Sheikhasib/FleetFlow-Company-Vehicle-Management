import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineSyncService } from '@/services/offline-sync-service';
import { tripService } from '@/services/trip-service';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';
import { notificationRepository } from '@/repositories/mock/mock-notification-repository';
import { TripLeg, User } from '@/types/domain';

describe('OfflineSyncService — Queueing, Reconciliation, Conflict & Session Isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    offlineSyncService.resetConcurrencyGuard();
    useFleetFlowStore.getState().resetData();
    useFleetFlowStore.setState({ isSimulatedOffline: false, pendingActions: [] });
  });

  describe('Online/Offline Detection', () => {
    it('detects online and simulated offline status correctly', () => {
      expect(offlineSyncService.isEffectiveOnline()).toBe(true);

      useFleetFlowStore.setState({ isSimulatedOffline: true });
      expect(offlineSyncService.isEffectiveOnline()).toBe(false);

      useFleetFlowStore.setState({ isSimulatedOffline: false });
      expect(offlineSyncService.isEffectiveOnline()).toBe(true);
    });
  });

  describe('Pending-Action Ordering & Duplicate Prevention', () => {
    it('enqueues actions in strict FIFO order and prevents duplicate queueing', () => {
      const action1 = offlineSyncService.enqueueAction({
        tripLegId: 'leg_queue_1',
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const action2 = offlineSyncService.enqueueAction({
        tripLegId: 'leg_queue_1',
        actorUserId: 'usr_drv_01',
        actionType: 'MARK_ARRIVED',
        currentStatus: 'ACCEPTED',
        targetStatus: 'ARRIVED_AT_PICKUP',
      });

      // Attempt duplicate queue of action2
      const duplicateAction = offlineSyncService.enqueueAction({
        tripLegId: 'leg_queue_1',
        actorUserId: 'usr_drv_01',
        actionType: 'MARK_ARRIVED',
        currentStatus: 'ACCEPTED',
        targetStatus: 'ARRIVED_AT_PICKUP',
      });

      expect(duplicateAction.id).toBe(action2.id);

      const queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe(action1.id);
      expect(queue[1].id).toBe(action2.id);
    });
  });

  describe('Reconnection & Reconciliation', () => {
    it('reconciles queued actions through TripService in sequential order', async () => {
      // 1. Setup an isolated trip leg in ASSIGNED status for usr_drv_01
      const testLeg: TripLeg = {
        id: 'leg_reconcile_seq',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_reconcile_seq',
        tripLegId: 'leg_reconcile_seq',
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // 2. Simulate offline mode
      useFleetFlowStore.setState({ isSimulatedOffline: true });

      // 3. Driver performs 2 sequential actions while offline
      offlineSyncService.enqueueAction({
        tripLegId: 'leg_reconcile_seq',
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      offlineSyncService.enqueueAction({
        tripLegId: 'leg_reconcile_seq',
        actorUserId: 'usr_drv_01',
        actionType: 'MARK_ARRIVED',
        currentStatus: 'ACCEPTED',
        targetStatus: 'ARRIVED_AT_PICKUP',
      });

      // Verify that offline action does not immediately mutate authoritative state
      const legBeforeSync = await tripLegRepository.getById('leg_reconcile_seq');
      expect(legBeforeSync?.status).toBe('ASSIGNED');

      // 4. While offline, reconciliation does nothing
      const offlineResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(offlineResult.processed).toBe(0);

      // 5. Restore connection
      useFleetFlowStore.setState({ isSimulatedOffline: false });

      // 6. Trigger reconciliation
      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(syncResult.processed).toBe(2);
      expect(syncResult.succeeded).toBe(2);
      expect(syncResult.failed).toBe(0);

      // 7. Verify authoritative state advanced to ARRIVED_AT_PICKUP
      const legAfterSync = await tripLegRepository.getById('leg_reconcile_seq');
      expect(legAfterSync?.status).toBe('ARRIVED_AT_PICKUP');

      // 8. Queue should now be empty of reconciled actions
      const remainingQueue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(remainingQueue).toHaveLength(0);
    });
  });

  describe('Server/Domain Rejection During Replay & Conflict Handling', () => {
    it('halts subsequent replays and marks failed actions when TripService rejects', async () => {
      // 1. Create a trip leg already in COMPLETED status (terminal)
      const conflictLeg: TripLeg = {
        id: 'leg_conflict_test',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Site A',
        destination: 'Site B',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'COMPLETED',
      };
      await tripLegRepository.create(conflictLeg);

      await assignmentRepository.create({
        id: 'asg_conflict_test',
        tripLegId: 'leg_conflict_test',
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'COMPLETED',
      });

      // 2. Queue an action that conflicts with current state
      offlineSyncService.enqueueAction({
        tripLegId: 'leg_conflict_test',
        actorUserId: 'usr_drv_01',
        actionType: 'START_TRIP',
        currentStatus: 'PICKED_UP',
        targetStatus: 'IN_PROGRESS',
      });

      // 3. Attempt reconciliation
      const res = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(res.processed).toBe(1);
      expect(res.failed).toBe(1);
      expect(res.errors[0]).toMatch(
        /No active assignment found|Invalid trip status transition|Conflicting transition/
      );

      // 4. Action is preserved in queue with FAILED status and error message
      const queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('FAILED');
      expect(queue[0].errorMessage).toBeDefined();
      expect(queue[0].retryCount).toBe(1);
    });
  });

  describe('Retry & Dismissal Behavior', () => {
    it('allows failed actions to be retried and dismissed', async () => {
      const action = offlineSyncService.enqueueAction({
        tripLegId: 'leg_retry_test',
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      // Manually set to failed
      useFleetFlowStore.getState().updatePendingAction(action.id, {
        status: 'FAILED',
        errorMessage: 'Connection timed out',
      });

      const failedQueue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(failedQueue[0].status).toBe('FAILED');

      // Dismiss action
      offlineSyncService.dismissAction(action.id);
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
    });
  });

  describe('User & Session Isolation', () => {
    it('isolates pending queues between different driver user sessions', () => {
      offlineSyncService.enqueueAction({
        tripLegId: 'leg_drv1',
        actorUserId: 'usr_drv_01', // Abdul Karim
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      offlineSyncService.enqueueAction({
        tripLegId: 'leg_drv2',
        actorUserId: 'usr_drv_02', // Rafiqul Islam
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      // Abdul Karim's view
      const drv1Queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(drv1Queue).toHaveLength(1);
      expect(drv1Queue[0].tripLegId).toBe('leg_drv1');

      // Rafiqul Islam's view
      const drv2Queue = offlineSyncService.getPendingActionsForUser('usr_drv_02');
      expect(drv2Queue).toHaveLength(1);
      expect(drv2Queue[0].tripLegId).toBe('leg_drv2');

      // Clear Abdul Karim's session queue on logout/switch
      useFleetFlowStore.getState().clearPendingActionsForUser('usr_drv_01');
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_02')).toHaveLength(1);
    });
  });

  describe('Crash-Recovery & Idempotent Replay Hardening', () => {
    it('Scenario 1: recovers safely when action was applied before crash, applying zero additional mutations or duplicate logs', async () => {
      // Setup trip leg and active assignment for usr_drv_01 (drv_01)
      const legId = 'leg_crash_rec_01';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_crash_rec_01',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // 1. Action is queued
      const action = offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      // 2. Domain mutation succeeded via tripService (e.g. prior to client crash or abrupt reload)
      await tripService.acceptTrip(legId, 'usr_drv_01');

      // Verify domain state advanced
      const legAfterMutation = await tripLegRepository.getById(legId);
      expect(legAfterMutation?.status).toBe('ACCEPTED');

      // Record baseline audit logs and notification counts after initial valid execution
      const initialLogs = await activityLogRepository.getAll();
      const initialNotifs = useFleetFlowStore.getState().notifications;
      const initialLogsCount = initialLogs.length;
      const initialNotifsCount = initialNotifs.length;

      // 3. Simulating the crash window: the action in store was NOT marked RECONCILED and is still PENDING
      expect(action.status).toBe('PENDING');

      // 4. Client restarts and reconnects; reconcile is triggered
      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');

      // 5. Verification:
      // Action is successfully recovered
      expect(syncResult.processed).toBe(1);
      expect(syncResult.succeeded).toBe(1);
      expect(syncResult.failed).toBe(0);

      // Queue is cleared
      const remainingQueue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(remainingQueue).toHaveLength(0);

      // ZERO additional mutations:
      // Domain status remains ACCEPTED
      const legFinal = await tripLegRepository.getById(legId);
      expect(legFinal?.status).toBe('ACCEPTED');

      // No duplicate activity log created
      const finalLogs = await activityLogRepository.getAll();
      expect(finalLogs).toHaveLength(initialLogsCount);

      // No duplicate notification created
      const finalNotifs = useFleetFlowStore.getState().notifications;
      expect(finalNotifs).toHaveLength(initialNotifsCount);
    });

    it('Scenario 2: safely reconciles replayed action as superseded when domain state has advanced beyond target status with verified audit trail', async () => {
      const legId = 'leg_crash_superseded_02';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_crash_superseded_02',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Execute ACCEPT and ARRIVE
      await tripService.acceptTrip(legId, 'usr_drv_01');
      await tripService.markArrivedAtPickup(legId, 'usr_drv_01');

      const legCurrent = await tripLegRepository.getById(legId);
      expect(legCurrent?.status).toBe('ARRIVED_AT_PICKUP');

      // Suppose an older ACCEPT_TRIP action (target: ACCEPTED) remained un-reconciled
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_stale_accept',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date(Date.now() - 60000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const initialLogs = await activityLogRepository.getAll();

      // Trigger reconciliation
      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(syncResult.processed).toBe(1);
      expect(syncResult.succeeded).toBe(1);
      expect(syncResult.failed).toBe(0);

      // Authoritative state remains intact and action is removed from queue
      const legFinal = await tripLegRepository.getById(legId);
      expect(legFinal?.status).toBe('ARRIVED_AT_PICKUP');

      const finalLogs = await activityLogRepository.getAll();
      expect(finalLogs).toHaveLength(initialLogs.length);
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
    });

    it('Scenario 3: classifies replayed action as FAILED when target status reached but WITHOUT verified driver activity log', async () => {
      const legId = 'leg_conflict_no_log_03';
      // Trip leg already at ACCEPTED, but without an activity log for usr_drv_01
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ACCEPTED',
      });

      await assignmentRepository.create({
        id: 'asg_conflict_no_log_03',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Queue action without corresponding driver activity log
      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(syncResult.processed).toBe(1);
      expect(syncResult.failed).toBe(1);
      expect(syncResult.errors[0]).toMatch(
        /Conflicting transition: Trip leg is already at ACCEPTED but no verified transition record exists for driver usr_drv_01/
      );

      const queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('FAILED');
      expect(queue[0].retryCount).toBe(1);
    });

    it('Scenario 4: classifies replayed action as FAILED when state advanced beyond target status WITHOUT verified driver activity log', async () => {
      const legId = 'leg_conflict_beyond_no_log_04';
      // Trip leg at IN_PROGRESS, but no ACCEPT log for usr_drv_01
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'IN_PROGRESS',
      });

      await assignmentRepository.create({
        id: 'asg_conflict_beyond_no_log_04',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(syncResult.processed).toBe(1);
      expect(syncResult.failed).toBe(1);
      expect(syncResult.errors[0]).toMatch(
        /Conflicting transition: Trip leg has already advanced to IN_PROGRESS without verified driver transition history for ACCEPT_TRIP/
      );

      const queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('FAILED');
    });

    it('Scenario 5: rejects reconciliation and preserves FAILED when driver assignment ownership is lost', async () => {
      const legId = 'leg_lost_ownership_05';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      // Initial assignment to drv_01
      await assignmentRepository.create({
        id: 'asg_lost_ownership_05',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Driver queues ACCEPT_TRIP
      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      // While driver was offline, Admin reassigned trip to drv_02
      await assignmentRepository.update({
        id: 'asg_lost_ownership_05',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_02', // Reassigned!
        assignedAt: '2026-11-29T07:35:00Z',
        status: 'ACTIVE',
      });

      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(syncResult.processed).toBe(1);
      expect(syncResult.failed).toBe(1);
      expect(syncResult.errors[0]).toMatch(
        /Unauthorized: Driver drv_01 \(Abdul Karim\) is not assigned to trip leg leg_lost_ownership_05\. Assigned driver is drv_02/
      );

      const queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('FAILED');
    });

    it('Scenario 6: enforces strict authorization on recovery (rejects unknown user, missing profile, and employee role)', async () => {
      const legId = 'leg_auth_checks_06';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ACCEPTED',
      });

      await assignmentRepository.create({
        id: 'asg_auth_checks_06',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // 6a. Unknown User
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_unknown_user',
        tripLegId: legId,
        actorUserId: 'usr_ghost_999',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const resUnknown = await offlineSyncService.reconcilePendingActions('usr_ghost_999');
      expect(resUnknown.failed).toBe(1);
      expect(resUnknown.errors[0]).toMatch(/Unauthorized: Invalid or unknown actor user ID: usr_ghost_999/);

      // 6b. Employee role
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_employee_role',
        tripLegId: legId,
        actorUserId: 'usr_emp_01', // Employee Tanvir Ahmed
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const resEmp = await offlineSyncService.reconcilePendingActions('usr_emp_01');
      expect(resEmp.failed).toBe(1);
      expect(resEmp.errors[0]).toMatch(/Unauthorized: User usr_emp_01 .* with role EMPLOYEE cannot advance trip status/);

      // 6c. Missing Driver profile
      // Create user with DRIVER role but without a driver profile in store
      useFleetFlowStore.setState((state) => ({
        users: [
          ...state.users,
          {
            id: 'usr_drv_unprofiled',
            name: 'Unprofiled Driver',
            email: 'unprofiled@fleetflow.com',
            phone: '+880 1711-999999',
            role: 'DRIVER',
            department: 'Operations',
          },
        ],
      }));

      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_unprofiled_driver',
        tripLegId: legId,
        actorUserId: 'usr_drv_unprofiled',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const resUnprofiled = await offlineSyncService.reconcilePendingActions('usr_drv_unprofiled');
      expect(resUnprofiled.failed).toBe(1);
      expect(resUnprofiled.errors[0]).toMatch(/Unauthorized: No driver profile found for user usr_drv_unprofiled/);
    });

    it('Scenario 7: handles partial crash recovery followed by legitimate subsequent forward transitions', async () => {
      const legId = 'leg_pipeline_combo_07';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Substation Alpha',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_pipeline_combo_07',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Step 1 ACCEPT was executed before crash
      await tripService.acceptTrip(legId, 'usr_drv_01');

      // The queue contains:
      // Action 1: ACCEPT_TRIP (already executed in domain, replaying after reload)
      // Action 2: MARK_ARRIVED (not yet executed)
      // Action 3: CONFIRM_PICKUP (not yet executed)
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_pipe_1',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date(Date.now() - 30000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_pipe_2',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'MARK_ARRIVED',
        currentStatus: 'ACCEPTED',
        targetStatus: 'ARRIVED_AT_PICKUP',
        queuedAt: new Date(Date.now() - 20000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_pipe_3',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'CONFIRM_PICKUP',
        currentStatus: 'ARRIVED_AT_PICKUP',
        targetStatus: 'PICKED_UP',
        queuedAt: new Date(Date.now() - 10000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');
      expect(syncResult.processed).toBe(3);
      expect(syncResult.succeeded).toBe(3);
      expect(syncResult.failed).toBe(0);

      // Verify the leg advanced all the way to PICKED_UP
      const finalLeg = await tripLegRepository.getById(legId);
      expect(finalLeg?.status).toBe('PICKED_UP');

      // Entire queue is cleared
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
    });

    it('Scenario 8: preserves per-trip failure isolation (haltedLegs) so unrelated trip actions continue to succeed', async () => {
      const legA = 'leg_isolation_A';
      const legB = 'leg_isolation_B';

      // Setup Leg A
      await tripLegRepository.create({
        id: legA,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Site A',
        destination: 'Site B',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'COMPLETED', // Terminal state to provoke failure
      });

      await assignmentRepository.create({
        id: 'asg_isolation_A',
        tripLegId: legA,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'COMPLETED',
      });

      // Setup Leg B
      await tripLegRepository.create({
        id: legB,
        requestId: 'req_003',
        legType: 'RETURN',
        pickupLocation: 'Site B',
        destination: 'Site A',
        scheduledDeparture: '2026-11-29T14:00:00Z',
        scheduledArrival: '2026-11-29T16:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_isolation_B',
        tripLegId: legB,
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Queue Actions:
      // Action A1: invalid transition on Leg A (will fail)
      // Action A2: subsequent transition on Leg A (must be halted/skipped)
      // Action B1: valid transition on Leg B (must succeed)
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_iso_A1',
        tripLegId: legA,
        actorUserId: 'usr_drv_01',
        actionType: 'START_TRIP',
        currentStatus: 'PICKED_UP',
        targetStatus: 'IN_PROGRESS',
        queuedAt: new Date(Date.now() - 30000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_iso_A2',
        tripLegId: legA,
        actorUserId: 'usr_drv_01',
        actionType: 'CONFIRM_DROPOFF',
        currentStatus: 'IN_PROGRESS',
        targetStatus: 'DROPPED_OFF',
        queuedAt: new Date(Date.now() - 20000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_iso_B1',
        tripLegId: legB,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date(Date.now() - 10000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const syncResult = await offlineSyncService.reconcilePendingActions('usr_drv_01');

      // A1 processed and failed; A2 skipped/halted; B1 processed and succeeded
      expect(syncResult.processed).toBe(2);
      expect(syncResult.succeeded).toBe(1);
      expect(syncResult.failed).toBe(1);

      // Verify Leg B succeeded and advanced
      const finalLegB = await tripLegRepository.getById(legB);
      expect(finalLegB?.status).toBe('ACCEPTED');

      // Verify queue state:
      const userQueue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      const actionA1 = userQueue.find((a) => a.id === 'act_iso_A1');
      const actionA2 = userQueue.find((a) => a.id === 'act_iso_A2');
      const actionB1 = userQueue.find((a) => a.id === 'act_iso_B1');

      expect(actionA1?.status).toBe('FAILED');
      expect(actionA2?.status).toBe('PENDING'); // halted/not attempted
      expect(actionB1).toBeUndefined(); // Reconciled and removed
    });
  });

  describe('Stage 5.4 Task 2 — Service-Level Concurrency Protection', () => {
    function createDeferred<T = void>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it('1. prevents overlapping queue replay when simultaneous sync() calls are issued', async () => {
      const legId = 'leg_conc_01';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 1',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_conc_01',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const deferred = createDeferred();
      const acceptCalled = createDeferred();
      const acceptSpy = vi.spyOn(tripService, 'acceptTrip').mockImplementation(async () => {
        acceptCalled.resolve();
        await deferred.promise;
        return {} as TripLeg;
      });

      // Issue 2 concurrent sync calls
      const p1 = offlineSyncService.sync('usr_drv_01');
      const p2 = offlineSyncService.sync('usr_drv_01');

      // Shared in-flight promise check: identical promise reference returned
      expect(p1).toBe(p2);
      expect(offlineSyncService.isSyncing('usr_drv_01')).toBe(true);
      expect(offlineSyncService.isSyncing()).toBe(true);

      // Wait until acceptTrip is entered
      await acceptCalled.promise;
      expect(acceptSpy).toHaveBeenCalledTimes(1);

      // Resolve the in-flight operation
      deferred.resolve();
      const [res1, res2] = await Promise.all([p1, p2]);

      expect(acceptSpy).toHaveBeenCalledTimes(1);
      expect(res1).toEqual(res2);
      expect(res1.processed).toBe(1);
      expect(res1.succeeded).toBe(1);
      expect(res1.failed).toBe(0);

      // Guard is clean after resolution
      expect(offlineSyncService.isSyncing('usr_drv_01')).toBe(false);
      expect(offlineSyncService.isSyncing()).toBe(false);
    });

    it('2. guarantees no duplicate TripService mutations occur during concurrent execution', async () => {
      const legId = 'leg_no_dup_02';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 2',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_no_dup_02',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const deferred = createDeferred();
      const acceptCalled = createDeferred();
      const acceptSpy = vi.spyOn(tripService, 'acceptTrip').mockImplementation(async () => {
        acceptCalled.resolve();
        await deferred.promise;
        return {} as TripLeg;
      });

      // Launch 3 simultaneous sync calls
      const p1 = offlineSyncService.sync('usr_drv_01');
      const p2 = offlineSyncService.sync('usr_drv_01');
      const p3 = offlineSyncService.sync('usr_drv_01');

      // Wait until acceptTrip is entered
      await acceptCalled.promise;
      expect(acceptSpy).toHaveBeenCalledTimes(1);

      deferred.resolve();
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(acceptSpy).toHaveBeenCalledTimes(1);
      expect(r1.succeeded).toBe(1);
      expect(r2.succeeded).toBe(1);
      expect(r3.succeeded).toBe(1);

      // Authoritative queue must be empty
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
    });

    it('3. delivers correct completion result to all callers sharing an in-flight sync promise', async () => {
      const legId = 'leg_shared_res_03';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 3',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_shared_res_03',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const [resA, resB] = await Promise.all([
        offlineSyncService.sync('usr_drv_01'),
        offlineSyncService.sync('usr_drv_01'),
      ]);

      expect(resA).toEqual(resB);
      expect(resA).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
    });

    it('4. releases the mutex lock when a sync operation fails or throws', async () => {
      const legId = 'leg_fail_rel_04';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 4',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_fail_rel_04',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      vi.spyOn(tripService, 'acceptTrip').mockRejectedValueOnce(
        new Error('Transient database lock failure')
      );

      const failResult = await offlineSyncService.sync('usr_drv_01');
      expect(failResult.failed).toBe(1);
      expect(failResult.errors[0]).toBe('Transient database lock failure');

      // Crucial assertion: mutex is NOT permanently locked
      expect(offlineSyncService.isSyncing('usr_drv_01')).toBe(false);
      expect(offlineSyncService.isSyncing()).toBe(false);
    });

    it('5. allows subsequent sync to successfully process pending work after a previous failure', async () => {
      const legId = 'leg_retry_succ_05';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 5',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_retry_succ_05',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      const action = offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      // 1. Initial attempt fails
      vi.spyOn(tripService, 'acceptTrip').mockRejectedValueOnce(
        new Error('Network gateway timeout')
      );
      const res1 = await offlineSyncService.sync('usr_drv_01');
      expect(res1.failed).toBe(1);

      // Action is FAILED in queue
      const failedQueue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(failedQueue[0].status).toBe('FAILED');

      // 2. Network recovers: trigger retryAction
      vi.spyOn(tripService, 'acceptTrip').mockResolvedValueOnce({} as TripLeg);
      const retryOutcome = await offlineSyncService.retryAction(action.id);
      expect(retryOutcome).toBe(true);

      // Verify subsequent sync replayed cleanly under unlocked mutex
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
      expect(offlineSyncService.isSyncing()).toBe(false);
    });

    it('6. preserves per-leg FIFO order during sequential execution', async () => {
      const legId = 'leg_fifo_order_06';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 6',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_fifo_order_06',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Action 1: ACCEPT_TRIP (t0)
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_fifo_01',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date(Date.now() - 20000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      // Action 2: MARK_ARRIVED (t0 + 10s)
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_fifo_02',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'MARK_ARRIVED',
        currentStatus: 'ACCEPTED',
        targetStatus: 'ARRIVED_AT_PICKUP',
        queuedAt: new Date(Date.now() - 10000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      const callHistory: string[] = [];
      vi.spyOn(tripService, 'acceptTrip').mockImplementation(async () => {
        callHistory.push('ACCEPT_TRIP');
        return {} as TripLeg;
      });
      vi.spyOn(tripService, 'markArrivedAtPickup').mockImplementation(async () => {
        callHistory.push('MARK_ARRIVED');
        return {} as TripLeg;
      });

      const syncRes = await offlineSyncService.sync('usr_drv_01');
      expect(syncRes.processed).toBe(2);
      expect(syncRes.succeeded).toBe(2);
      expect(callHistory).toEqual(['ACCEPT_TRIP', 'MARK_ARRIVED']);
    });

    it('7. ensures unrelated legs continue to progress when one leg encounters a failure', async () => {
      const legFail = 'leg_unrel_fail_07';
      const legSuccess = 'leg_unrel_succ_07';

      await tripLegRepository.create({
        id: legFail,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Site A',
        destination: 'Site B',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await tripLegRepository.create({
        id: legSuccess,
        requestId: 'req_003',
        legType: 'RETURN',
        pickupLocation: 'Site B',
        destination: 'Site A',
        scheduledDeparture: '2026-11-29T12:00:00Z',
        scheduledArrival: '2026-11-29T14:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_unrel_fail',
        tripLegId: legFail,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      await assignmentRepository.create({
        id: 'asg_unrel_succ',
        tripLegId: legSuccess,
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Leg Fail: action 1 fails, action 2 must be halted
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_fail_1',
        tripLegId: legFail,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date(Date.now() - 30000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_fail_2',
        tripLegId: legFail,
        actorUserId: 'usr_drv_01',
        actionType: 'MARK_ARRIVED',
        currentStatus: 'ACCEPTED',
        targetStatus: 'ARRIVED_AT_PICKUP',
        queuedAt: new Date(Date.now() - 20000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      // Leg Success: action must succeed
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_succ_1',
        tripLegId: legSuccess,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date(Date.now() - 10000).toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      vi.spyOn(tripService, 'acceptTrip').mockImplementation(async (legId: string) => {
        if (legId === legFail) {
          throw new Error('Leg Fail Exception');
        }
        return {} as TripLeg;
      });

      const res = await offlineSyncService.sync('usr_drv_01');
      expect(res.processed).toBe(2);
      expect(res.succeeded).toBe(1);
      expect(res.failed).toBe(1);

      const queue = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queue.find((a) => a.id === 'act_fail_1')?.status).toBe('FAILED');
      expect(queue.find((a) => a.id === 'act_fail_2')?.status).toBe('PENDING'); // halted/unattempted
      expect(queue.find((a) => a.id === 'act_succ_1')).toBeUndefined(); // Reconciled and removed
    });

    it('8. enforces strict actor isolation when concurrent calls are made for different drivers', async () => {
      const legDriver1 = 'leg_iso_drv1_08';
      const legDriver2 = 'leg_iso_drv2_08';

      // Setup Driver 2 profile
      const driver2: User = {
        id: 'usr_drv_02',
        name: 'Second Driver',
        email: 'driver2@company.com',
        phone: '+880 1711-222222',
        role: 'DRIVER',
        department: 'Logistics',
      };
      useFleetFlowStore.setState({
        users: [...useFleetFlowStore.getState().users, driver2],
        drivers: [
          ...useFleetFlowStore.getState().drivers,
          {
            id: 'drv_02',
            userId: 'usr_drv_02',
            phone: '+880 1711-222222',
            status: 'AVAILABLE',
          },
        ],
      });

      await tripLegRepository.create({
        id: legDriver1,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Site 1',
        destination: 'Site 2',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await tripLegRepository.create({
        id: legDriver2,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Site 3',
        destination: 'Site 4',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_iso_drv1',
        tripLegId: legDriver1,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      await assignmentRepository.create({
        id: 'asg_iso_drv2',
        tripLegId: legDriver2,
        vehicleId: 'veh_02',
        driverId: 'drv_02',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legDriver1,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legDriver2,
        actorUserId: 'usr_drv_02',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const deferred = createDeferred();
      const acceptSpy = vi.spyOn(tripService, 'acceptTrip').mockImplementation(async (legId) => {
        if (legId === legDriver1) {
          await deferred.promise;
        }
        return {} as TripLeg;
      });

      // Driver 1 starts sync and pauses
      const p1 = offlineSyncService.sync('usr_drv_01');
      // Driver 2 starts sync concurrently (will queue behind Driver 1 under mutex)
      const p2 = offlineSyncService.sync('usr_drv_02');

      // Release Driver 1
      deferred.resolve();
      const [res1, res2] = await Promise.all([p1, p2]);

      // Driver 1's sync processed ONLY Driver 1's action
      expect(res1.processed).toBe(1);
      expect(res1.succeeded).toBe(1);

      // Driver 2's sync processed ONLY Driver 2's action
      expect(res2.processed).toBe(1);
      expect(res2.succeeded).toBe(1);

      expect(acceptSpy).toHaveBeenCalledTimes(2);
      expect(acceptSpy).toHaveBeenNthCalledWith(1, legDriver1, 'usr_drv_01');
      expect(acceptSpy).toHaveBeenNthCalledWith(2, legDriver2, 'usr_drv_02');

      // Both queues cleanly emptied
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_02')).toHaveLength(0);
    });

    it('9. ensures actions are not permanently marked SYNCING if an unexpected error occurs', async () => {
      const legId = 'leg_stuck_syncing_09';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 9',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_stuck_syncing_09',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      // Simulate an action that was previously left in SYNCING state before crash
      useFleetFlowStore.getState().enqueuePendingAction({
        id: 'act_stuck_01',
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
        queuedAt: new Date().toISOString(),
        status: 'SYNCING', // Stuck state
        retryCount: 0,
      });

      // Next sync must recover the stuck action and reconcile it
      const res = await offlineSyncService.sync('usr_drv_01');
      expect(res.processed).toBe(1);
      expect(res.succeeded).toBe(1);

      // Reconciled and removed from queue
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
    });

    it('10. resets SYNCING actions to PENDING and releases mutex when an unexpected exception escapes executeReconciliation', async () => {
      const legId = 'leg_unexpected_exc_10';
      await tripLegRepository.create({
        id: legId,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Main Depot',
        destination: 'Site 10',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_unexpected_exc_10',
        tripLegId: legId,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      const action = offlineSyncService.enqueueAction({
        tripLegId: legId,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      // Force inner TripService catch block to enter, then throw outside inner catch
      // when marking FAILED so an unhandled exception escapes executeReconciliation()
      const acceptSpy = vi
        .spyOn(tripService, 'acceptTrip')
        .mockRejectedValueOnce(new Error('Simulated TripService failure'));

      const storeState = useFleetFlowStore.getState();
      const originalUpdatePendingAction = storeState.updatePendingAction;
      const updateSpy = vi
        .spyOn(storeState, 'updatePendingAction')
        .mockImplementation((id, updates) => {
          if (updates.status === 'FAILED') {
            throw new Error('Unexpected store write exception');
          }
          return originalUpdatePendingAction(id, updates);
        });

      await expect(offlineSyncService.sync('usr_drv_01')).rejects.toThrow(
        'Unexpected store write exception'
      );

      // Outer finally inside executeReconciliation must have reset SYNCING -> PENDING
      const queueAfterCrash = offlineSyncService.getPendingActionsForUser('usr_drv_01');
      expect(queueAfterCrash).toHaveLength(1);
      expect(queueAfterCrash[0].id).toBe(action.id);
      expect(queueAfterCrash[0].status).toBe('PENDING');

      // Guard and mutex must be fully released
      expect(offlineSyncService.isSyncing('usr_drv_01')).toBe(false);
      expect(offlineSyncService.isSyncing()).toBe(false);

      // Restore mocks and verify subsequent sync runs cleanly and reconciles the action
      updateSpy.mockRestore();
      acceptSpy.mockRestore();

      const recoveryRes = await offlineSyncService.sync('usr_drv_01');
      expect(recoveryRes).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        errors: [],
      });
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
      expect(offlineSyncService.isSyncing()).toBe(false);
    });

    it('11. enforces cross-actor mutual exclusion while Driver 1 is paused mid-flight', async () => {
      const legDriver1 = 'leg_mutex_drv1_11';
      const legDriver2 = 'leg_mutex_drv2_11';

      const driver2: User = {
        id: 'usr_drv_02',
        name: 'Second Driver',
        email: 'driver2@company.com',
        phone: '+880 1711-222222',
        role: 'DRIVER',
        department: 'Logistics',
      };
      useFleetFlowStore.setState({
        users: [...useFleetFlowStore.getState().users, driver2],
        drivers: [
          ...useFleetFlowStore.getState().drivers,
          {
            id: 'drv_02',
            userId: 'usr_drv_02',
            phone: '+880 1711-222222',
            status: 'AVAILABLE',
          },
        ],
      });

      await tripLegRepository.create({
        id: legDriver1,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Hub 1',
        destination: 'Point A',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await tripLegRepository.create({
        id: legDriver2,
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Hub 2',
        destination: 'Point B',
        scheduledDeparture: '2026-11-29T08:00:00Z',
        scheduledArrival: '2026-11-29T10:00:00Z',
        status: 'ASSIGNED',
      });

      await assignmentRepository.create({
        id: 'asg_mutex_drv1_11',
        tripLegId: legDriver1,
        vehicleId: 'veh_01',
        driverId: 'drv_01',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      await assignmentRepository.create({
        id: 'asg_mutex_drv2_11',
        tripLegId: legDriver2,
        vehicleId: 'veh_02',
        driverId: 'drv_02',
        assignedAt: '2026-11-29T07:30:00Z',
        status: 'ACTIVE',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legDriver1,
        actorUserId: 'usr_drv_01',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      offlineSyncService.enqueueAction({
        tripLegId: legDriver2,
        actorUserId: 'usr_drv_02',
        actionType: 'ACCEPT_TRIP',
        currentStatus: 'ASSIGNED',
        targetStatus: 'ACCEPTED',
      });

      const driver1Entered = createDeferred();
      const driver1Release = createDeferred();
      const driver2Entered = createDeferred();

      const callLog: Array<{ legId: string; actorUserId: string }> = [];
      const acceptSpy = vi
        .spyOn(tripService, 'acceptTrip')
        .mockImplementation(async (legId, actorUserId) => {
          callLog.push({ legId, actorUserId });
          if (legId === legDriver1) {
            driver1Entered.resolve();
            await driver1Release.promise;
          } else if (legId === legDriver2) {
            driver2Entered.resolve();
          }
          return {} as TripLeg;
        });

      // 1. Start Driver 1 sync and wait deterministically until it holds the mutex mid-TripService
      const p1 = offlineSyncService.sync('usr_drv_01');
      await driver1Entered.promise;

      // 2. Start Driver 2 sync while Driver 1 remains paused
      const p2 = offlineSyncService.sync('usr_drv_02');

      // Flush microtask turns deterministically; if unguarded, Driver 2 would enter acceptTrip
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // 3. Assert Driver 2's TripService action has NOT started while Driver 1 holds the mutex
      expect(acceptSpy).toHaveBeenCalledTimes(1);
      expect(callLog).toEqual([{ legId: legDriver1, actorUserId: 'usr_drv_01' }]);
      expect(offlineSyncService.isSyncing('usr_drv_01')).toBe(true);
      expect(offlineSyncService.isSyncing('usr_drv_02')).toBe(true);

      // 4. Release Driver 1 and verify Driver 2 proceeds strictly afterward
      driver1Release.resolve();
      await driver2Entered.promise;
      const [res1, res2] = await Promise.all([p1, p2]);

      expect(acceptSpy).toHaveBeenCalledTimes(2);
      expect(callLog).toEqual([
        { legId: legDriver1, actorUserId: 'usr_drv_01' },
        { legId: legDriver2, actorUserId: 'usr_drv_02' },
      ]);

      // 5. Verify neither actor processed the other's queue entries
      expect(res1).toEqual({ processed: 1, succeeded: 1, failed: 0, errors: [] });
      expect(res2).toEqual({ processed: 1, succeeded: 1, failed: 0, errors: [] });
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_01')).toHaveLength(0);
      expect(offlineSyncService.getPendingActionsForUser('usr_drv_02')).toHaveLength(0);
      expect(offlineSyncService.isSyncing()).toBe(false);
    });
  });
});

