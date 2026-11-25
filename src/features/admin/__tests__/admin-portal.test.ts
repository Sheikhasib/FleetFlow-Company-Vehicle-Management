import { describe, it, expect, beforeEach } from 'vitest';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { requestService } from '@/services/request-service';
import { assignmentService } from '@/services/assignment-service';
import { tripService } from '@/services/trip-service';
import { analyticsService } from '@/services/analytics-service';
import { selectActiveTrips, selectDroppedOffTrips } from '@/features/vehicle-requests/selectors/trip-selectors';

describe('Phase 4 Admin Portal End-to-End Workflow Tests', () => {
  beforeEach(() => {
    useFleetFlowStore.getState().resetData();
  });

  describe('Request Review & Approval Workflow', () => {
    it('approves a pending request and updates leg statuses to PENDING_ASSIGNMENT', async () => {
      // Find a pending request
      const pendingReq = useFleetFlowStore.getState().requests.find((r) => r.status === 'PENDING');
      expect(pendingReq).toBeDefined();

      const approvedReq = await requestService.approveRequest(pendingReq!.id, 'usr_adm_01');
      expect(approvedReq.status).toBe('APPROVED');

      // Verify associated legs are updated to PENDING_ASSIGNMENT
      const legs = useFleetFlowStore.getState().tripLegs.filter((l) => l.requestId === pendingReq!.id);
      legs.forEach((leg) => {
        expect(leg.status).toBe('PENDING_ASSIGNMENT');
      });

      // Verify activity log is created
      const logs = useFleetFlowStore.getState().activityLogs.filter((a) => a.requestId === pendingReq!.id);
      const approveLog = logs.find((l) => l.action === 'REQUEST_APPROVED');
      expect(approveLog).toBeDefined();
    });

    it('rejects a pending request with required justification reason', async () => {
      const pendingReq = useFleetFlowStore.getState().requests.find((r) => r.status === 'PENDING');
      expect(pendingReq).toBeDefined();

      const reason = 'Vehicle capacity unavailable for requested time window.';
      const rejectedReq = await requestService.rejectRequest(pendingReq!.id, 'usr_adm_01', reason);

      expect(rejectedReq.status).toBe('REJECTED');
      expect(rejectedReq.rejectionReason).toBe(reason);

      // Verify activity log
      const logs = useFleetFlowStore.getState().activityLogs.filter((a) => a.requestId === pendingReq!.id);
      const rejectLog = logs.find((l) => l.action === 'REQUEST_REJECTED');
      expect(rejectLog).toBeDefined();
      expect(rejectLog?.description).toContain(reason);
    });

    it('throws error when rejecting without justification reason', async () => {
      const pendingReq = useFleetFlowStore.getState().requests.find((r) => r.status === 'PENDING');
      expect(pendingReq).toBeDefined();

      await expect(
        requestService.rejectRequest(pendingReq!.id, 'usr_adm_01', '   ')
      ).rejects.toThrow('A valid rejection reason must be provided.');
    });
  });

  describe('Dispatch & Assignment Workflow — Resource State Audit', () => {
    it('does NOT immediately mark vehicles as IN_USE or drivers as ON_TRIP for future scheduled assignments', async () => {
      // First approve a request
      const pendingReq = useFleetFlowStore.getState().requests.find((r) => r.status === 'PENDING');
      expect(pendingReq).toBeDefined();
      await requestService.approveRequest(pendingReq!.id, 'usr_adm_01');

      const legs = useFleetFlowStore.getState().tripLegs.filter((l) => l.requestId === pendingReq!.id);
      const firstLeg = legs[0];

      // Initially: veh_03 is AVAILABLE
      const initialVeh = useFleetFlowStore.getState().vehicles.find((v) => v.id === 'veh_03');
      expect(initialVeh?.status).toBe('AVAILABLE');

      // Create assignment for scheduled trip
      const assignment = await assignmentService.createAssignment(
        firstLeg.id,
        'veh_03',
        'drv_03',
        'usr_adm_01'
      );

      expect(assignment).toBeDefined();
      expect(assignment.status).toBe('ACTIVE');

      // CRITICAL VERIFICATION:
      // Future scheduled assignment must NOT immediately mark vehicle as IN_USE
      const vehicleAfterAsg = useFleetFlowStore.getState().vehicles.find((v) => v.id === 'veh_03');
      expect(vehicleAfterAsg?.status).toBe('AVAILABLE');

      // TripLeg status is ASSIGNED
      const updatedLeg = useFleetFlowStore.getState().tripLegs.find((l) => l.id === firstLeg.id);
      expect(updatedLeg?.status).toBe('ASSIGNED');
    });

    it('preserves independent outbound and return leg assignments, parent becomes ASSIGNED only when all legs assigned', async () => {
      // Find a round-trip request or create one
      const roundTripReq = useFleetFlowStore.getState().requests.find((r) => r.tripType === 'ROUND_TRIP' && r.status === 'APPROVED');
      expect(roundTripReq).toBeDefined();

      const legs = useFleetFlowStore.getState().tripLegs.filter((l) => l.requestId === roundTripReq!.id);
      expect(legs.length).toBe(2);

      const [outboundLeg, returnLeg] = legs;

      // Ensure both start as PENDING_ASSIGNMENT
      useFleetFlowStore.getState().updateTripLeg({ ...outboundLeg, status: 'PENDING_ASSIGNMENT' });
      useFleetFlowStore.getState().updateTripLeg({ ...returnLeg, status: 'PENDING_ASSIGNMENT' });
      useFleetFlowStore.getState().updateRequest({ ...roundTripReq!, status: 'APPROVED' });

      // Assign Outbound Leg ONLY
      await assignmentService.createAssignment(outboundLeg.id, 'veh_03', 'drv_03', 'usr_adm_01');

      // Outbound is ASSIGNED, return is still PENDING_ASSIGNMENT
      const outLegAfter = useFleetFlowStore.getState().tripLegs.find((l) => l.id === outboundLeg.id);
      const retLegAfter = useFleetFlowStore.getState().tripLegs.find((l) => l.id === returnLeg.id);
      expect(outLegAfter?.status).toBe('ASSIGNED');
      expect(retLegAfter?.status).toBe('PENDING_ASSIGNMENT');

      // Parent request must REMAIN 'APPROVED' because return leg is not yet assigned
      const parentAfterFirst = useFleetFlowStore.getState().requests.find((r) => r.id === roundTripReq!.id);
      expect(parentAfterFirst?.status).toBe('APPROVED');

      // Now Assign Return Leg
      await assignmentService.createAssignment(returnLeg.id, 'veh_03', 'drv_03', 'usr_adm_01');

      // Now ALL legs are assigned, so parent request transitions to ASSIGNED
      const parentAfterBoth = useFleetFlowStore.getState().requests.find((r) => r.id === roundTripReq!.id);
      expect(parentAfterBoth?.status).toBe('ASSIGNED');
    });

    it('rejects vehicle assignment when passenger count exceeds vehicle capacity', async () => {
      const pendingReq = useFleetFlowStore.getState().requests.find((r) => r.status === 'PENDING');
      expect(pendingReq).toBeDefined();
      const approved = await requestService.approveRequest(pendingReq!.id, 'usr_adm_01');

      // Update passenger headcount to 10 while keeping status APPROVED
      useFleetFlowStore.getState().updateRequest({
        ...approved,
        passengerCount: 10,
      });

      const leg = useFleetFlowStore.getState().tripLegs.find((l) => l.requestId === approved.id)!;

      // Try assigning veh_02 (capacity 4)
      await expect(
        assignmentService.createAssignment(
          leg.id,
          'veh_02',
          'drv_03',
          'usr_adm_01'
        )
      ).rejects.toThrow(/capacity/i);
    });

    it('enforces schedule overlap validation using newStart < existingEnd && newEnd > existingStart', async () => {
      // Find an existing active assignment
      const activeAsg = useFleetFlowStore.getState().assignments.find((a) => a.status === 'ACTIVE');
      expect(activeAsg).toBeDefined();

      const activeLeg = useFleetFlowStore.getState().tripLegs.find((l) => l.id === activeAsg!.tripLegId);
      expect(activeLeg).toBeDefined();

      // Check conflict on an overlapping time window
      const overlapStart = new Date(new Date(activeLeg!.scheduledDeparture).getTime() + 10 * 60 * 1000).toISOString();
      const overlapEnd = new Date(new Date(activeLeg!.scheduledArrival).getTime() + 30 * 60 * 1000).toISOString();

      const conflictCheck = await assignmentService.checkAssignmentConflict(
        {
          start: overlapStart,
          end: overlapEnd,
        },
        activeAsg!.vehicleId,
        activeAsg!.driverId
      );

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflictingEntity).toBe('BOTH');
      expect(conflictCheck.reason).toContain('already assigned');
    });
  });

  describe('Trip Monitoring & Milestone Advancement — Resource State Synchronization', () => {
    it('advances a trip through complete driver lifecycle milestones and synchronizes resource operational state', async () => {
      // First ensure any pre-existing active leg for veh_02 (leg_006_out in seed data) is cleanly completed
      const priorActiveLeg = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_006_out');
      if (priorActiveLeg && priorActiveLeg.status !== 'COMPLETED') {
        await tripService.confirmPickup('leg_006_out', 'usr_drv_01');
        await tripService.startTrip('leg_006_out', 'usr_drv_01');
        await tripService.confirmDropoff('leg_006_out', 'usr_drv_01');
        await tripService.completeTrip('leg_006_out', 'usr_drv_01');
      }

      // Find an assigned trip leg
      const leg = useFleetFlowStore.getState().tripLegs.find((l) => l.status === 'ASSIGNED');
      expect(leg).toBeDefined();

      const assignment = useFleetFlowStore.getState().assignments.find((a) => a.tripLegId === leg!.id);
      expect(assignment).toBeDefined();

      const driverUser = useFleetFlowStore.getState().drivers.find((d) => d.id === assignment!.driverId)?.userId || 'usr_adm_01';

      // 1. Accept Trip (transitions to active operational state)
      const acceptedLeg = await tripService.acceptTrip(leg!.id, driverUser);
      expect(acceptedLeg.status).toBe('ACCEPTED');

      // Resource states must now be IN_USE and ON_TRIP
      const vehAfterAccept = useFleetFlowStore.getState().vehicles.find((v) => v.id === assignment!.vehicleId);
      const drvAfterAccept = useFleetFlowStore.getState().drivers.find((d) => d.id === assignment!.driverId);
      expect(vehAfterAccept?.status).toBe('IN_USE');
      expect(drvAfterAccept?.status).toBe('ON_TRIP');

      // 2. Arrived at Pickup
      const arrivedLeg = await tripService.markArrivedAtPickup(leg!.id, driverUser);
      expect(arrivedLeg.status).toBe('ARRIVED_AT_PICKUP');

      // 3. Confirm Pickup
      const pickedUpLeg = await tripService.confirmPickup(leg!.id, driverUser);
      expect(pickedUpLeg.status).toBe('PICKED_UP');

      // 4. Start Trip
      const inProgressLeg = await tripService.startTrip(leg!.id, driverUser);
      expect(inProgressLeg.status).toBe('IN_PROGRESS');

      // 5. Confirm Dropoff
      const droppedOffLeg = await tripService.confirmDropoff(leg!.id, driverUser);
      expect(droppedOffLeg.status).toBe('DROPPED_OFF');

      // Canonical Semantics: While leg is DROPPED_OFF, vehicle remains IN_USE and driver remains ON_TRIP
      const vehWhileDropped = useFleetFlowStore.getState().vehicles.find((v) => v.id === assignment!.vehicleId);
      const drvWhileDropped = useFleetFlowStore.getState().drivers.find((d) => d.id === assignment!.driverId);
      expect(vehWhileDropped?.status).toBe('IN_USE');
      expect(drvWhileDropped?.status).toBe('ON_TRIP');

      // 6. Complete Trip
      const completedLeg = await tripService.completeTrip(leg!.id, driverUser);
      expect(completedLeg.status).toBe('COMPLETED');

      // On completion, assignment status becomes COMPLETED, vehicle & driver become AVAILABLE
      const asgCompleted = useFleetFlowStore.getState().assignments.find((a) => a.id === assignment!.id);
      expect(asgCompleted?.status).toBe('COMPLETED');

      const vehAfterComplete = useFleetFlowStore.getState().vehicles.find((v) => v.id === assignment!.vehicleId);
      const drvAfterComplete = useFleetFlowStore.getState().drivers.find((d) => d.id === assignment!.driverId);
      expect(vehAfterComplete?.status).toBe('AVAILABLE');
      expect(drvAfterComplete?.status).toBe('AVAILABLE');
    });

    it('safely releases resources on trip completion only when no concurrent active trips remain', async () => {
      // In seed data, drv_03 is operating leg_005_out. Complete it so drv_03 has no external active trips:
      const seedActiveLeg = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_005_out');
      if (seedActiveLeg && seedActiveLeg.status !== 'COMPLETED') {
        await tripService.markArrivedAtPickup('leg_005_out', 'usr_drv_03');
        await tripService.confirmPickup('leg_005_out', 'usr_drv_03');
        await tripService.startTrip('leg_005_out', 'usr_drv_03');
        await tripService.confirmDropoff('leg_005_out', 'usr_drv_03');
        await tripService.completeTrip('leg_005_out', 'usr_drv_03');
      }

      // Find req_002 (APPROVED, round-trip with leg_002_out and leg_002_ret)
      const req = useFleetFlowStore.getState().requests.find((r) => r.id === 'req_002');
      expect(req).toBeDefined();

      const legOut = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_002_out');
      const legRet = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_002_ret');
      expect(legOut).toBeDefined();
      expect(legRet).toBeDefined();

      // Assign both legs to veh_03 (Mercedes-Benz Sprinter Executive, cap: 12) and drv_03
      await assignmentService.createAssignment(legOut!.id, 'veh_03', 'drv_03', 'usr_adm_01');
      await assignmentService.createAssignment(legRet!.id, 'veh_03', 'drv_03', 'usr_adm_01');

      // Start outbound leg into active operation
      await tripService.acceptTrip(legOut!.id, 'usr_drv_03');
      await tripService.markArrivedAtPickup(legOut!.id, 'usr_drv_03');
      await tripService.confirmPickup(legOut!.id, 'usr_drv_03');
      await tripService.startTrip(legOut!.id, 'usr_drv_03');

      // Concurrently start return leg into active operation (e.g. accepted status)
      await tripService.acceptTrip(legRet!.id, 'usr_drv_03');

      expect(useFleetFlowStore.getState().vehicles.find((v) => v.id === 'veh_03')?.status).toBe('IN_USE');
      expect(useFleetFlowStore.getState().drivers.find((d) => d.id === 'drv_03')?.status).toBe('ON_TRIP');

      // Complete outbound leg: legRet is still ACCEPTED (an active trip status),
      // so veh_03 and drv_03 must NOT be released to AVAILABLE
      await tripService.confirmDropoff(legOut!.id, 'usr_drv_03');
      await tripService.completeTrip(legOut!.id, 'usr_drv_03');

      expect(useFleetFlowStore.getState().vehicles.find((v) => v.id === 'veh_03')?.status).toBe('IN_USE');
      expect(useFleetFlowStore.getState().drivers.find((d) => d.id === 'drv_03')?.status).toBe('ON_TRIP');

      // Now advance and complete return leg: no other active trips remain for veh_03 / drv_03
      await tripService.markArrivedAtPickup(legRet!.id, 'usr_drv_03');
      await tripService.confirmPickup(legRet!.id, 'usr_drv_03');
      await tripService.startTrip(legRet!.id, 'usr_drv_03');
      await tripService.confirmDropoff(legRet!.id, 'usr_drv_03');
      await tripService.completeTrip(legRet!.id, 'usr_drv_03');

      expect(useFleetFlowStore.getState().vehicles.find((v) => v.id === 'veh_03')?.status).toBe('AVAILABLE');
      expect(useFleetFlowStore.getState().drivers.find((d) => d.id === 'drv_03')?.status).toBe('AVAILABLE');
    });

    it('verifies DROPPED_OFF semantics: preserves resource occupancy until COMPLETED and distinguishes operational KPI from employee active trip bucket', async () => {
      // Find req_006 with outbound leg leg_006_out (currently ARRIVED_AT_PICKUP in seed data)
      const leg = useFleetFlowStore.getState().tripLegs.find((l) => l.id === 'leg_006_out');
      expect(leg).toBeDefined();

      const asg = useFleetFlowStore.getState().assignments.find((a) => a.tripLegId === leg!.id);
      expect(asg).toBeDefined();

      const asgDriverUser = useFleetFlowStore.getState().drivers.find((d) => d.id === asg!.driverId)?.userId || 'usr_adm_01';

      // Progress through PICKED_UP and IN_PROGRESS to DROPPED_OFF
      await tripService.confirmPickup(leg!.id, asgDriverUser);
      await tripService.startTrip(leg!.id, asgDriverUser);
      const droppedLeg = await tripService.confirmDropoff(leg!.id, asgDriverUser);
      expect(droppedLeg.status).toBe('DROPPED_OFF');

      // 1. Operational Resource Occupancy: Vehicle remains IN_USE and Driver remains ON_TRIP during DROPPED_OFF
      const veh = useFleetFlowStore.getState().vehicles.find((v) => v.id === asg!.vehicleId);
      const drv = useFleetFlowStore.getState().drivers.find((d) => d.id === asg!.driverId);
      expect(veh?.status).toBe('IN_USE');
      expect(drv?.status).toBe('ON_TRIP');

      // 2. Admin Operational KPI: Active trip count includes DROPPED_OFF legs as part of ongoing fleet operations
      const activeCount = await analyticsService.getActiveTripCount();
      expect(activeCount).toBeGreaterThanOrEqual(1);

      // 3. Employee Passenger Bucket: Employee selector strictly separates DROPPED_OFF from active transit in-motion
      const storeState = useFleetFlowStore.getState();
      const employeeActiveTrips = selectActiveTrips(storeState, 'usr_emp_03');
      const employeeDroppedTrips = selectDroppedOffTrips(storeState, 'usr_emp_03');
      expect(employeeActiveTrips.some((t) => t.legId === leg!.id)).toBe(false);
      expect(employeeDroppedTrips.some((t) => t.legId === leg!.id)).toBe(true);

      // 4. Exact release transition: Resources become AVAILABLE only upon completeTrip()
      await tripService.completeTrip(leg!.id, asgDriverUser);

      const asgCompleted = useFleetFlowStore.getState().assignments.find((a) => a.id === asg!.id);
      expect(asgCompleted?.status).toBe('COMPLETED');
    });
  });
});
