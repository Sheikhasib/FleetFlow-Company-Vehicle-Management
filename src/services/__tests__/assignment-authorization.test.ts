import { describe, it, expect, beforeEach } from 'vitest';
import { assignmentService } from '../assignment-service';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

function snapshotStoreCollections() {
  const s = useFleetFlowStore.getState();
  return {
    assignments: JSON.parse(JSON.stringify(s.assignments)),
    tripLegs: JSON.parse(JSON.stringify(s.tripLegs)),
    requests: JSON.parse(JSON.stringify(s.requests)),
    vehicles: JSON.parse(JSON.stringify(s.vehicles)),
    drivers: JSON.parse(JSON.stringify(s.drivers)),
    activityLogs: JSON.parse(JSON.stringify(s.activityLogs)),
    notifications: JSON.parse(JSON.stringify(s.notifications)),
  };
}

describe('AssignmentService — Service-Level Authorization & State Validation (FND-003)', () => {
  beforeEach(() => {
    useFleetFlowStore.getState().resetData();
  });

  describe('Authorized Admin Path', () => {
    it('allows a valid ADMIN user to assign an eligible PENDING_ASSIGNMENT leg', async () => {
      // Seed req_002 is APPROVED with leg_002_out in PENDING_ASSIGNMENT (5 pax -> veh_03 capacity 12)
      const assignment = await assignmentService.createAssignment(
        'leg_002_out',
        'veh_03',
        'drv_01',
        'usr_adm_01'
      );

      expect(assignment).toBeDefined();
      expect(assignment.tripLegId).toBe('leg_002_out');
      expect(assignment.vehicleId).toBe('veh_03');
      expect(assignment.driverId).toBe('drv_01');
      expect(assignment.status).toBe('ACTIVE');

      const state = useFleetFlowStore.getState();
      const updatedLeg = state.tripLegs.find((l) => l.id === 'leg_002_out');
      expect(updatedLeg?.status).toBe('ASSIGNED');

      const auditLog = state.activityLogs.find(
        (l) => l.tripLegId === 'leg_002_out' && l.action === 'ASSIGNMENT_CREATED'
      );
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe('usr_adm_01');
    });
  });

  describe('Non-Admin Role Rejection & Zero Mutations', () => {
    it('rejects EMPLOYEE role attempting to create an assignment with zero mutations', async () => {
      const before = snapshotStoreCollections();

      await expect(
        assignmentService.createAssignment('leg_002_out', 'veh_03', 'drv_01', 'usr_emp_01')
      ).rejects.toThrow(/Unauthorized: User usr_emp_01 .* with role EMPLOYEE cannot create assignments/);

      expect(snapshotStoreCollections()).toEqual(before);
    });

    it('rejects DRIVER role attempting to create an assignment with zero mutations', async () => {
      const before = snapshotStoreCollections();

      await expect(
        assignmentService.createAssignment('leg_002_out', 'veh_03', 'drv_01', 'usr_drv_01')
      ).rejects.toThrow(/Unauthorized: User usr_drv_01 .* with role DRIVER cannot create assignments/);

      expect(snapshotStoreCollections()).toEqual(before);
    });
  });

  describe('Invalid or Unknown User Rejection & Zero Mutations', () => {
    it.each(['', 'admin', 'system', 'drv_01', 'usr_nonexistent_999'])(
      'rejects invalid actor ID %j with zero mutations',
      async (invalidActorId) => {
        const before = snapshotStoreCollections();

        await expect(
          assignmentService.createAssignment('leg_002_out', 'veh_03', 'drv_01', invalidActorId)
        ).rejects.toThrow(/Unauthorized:/);

        expect(snapshotStoreCollections()).toEqual(before);
      }
    );
  });

  describe('TripLeg Status Eligibility Enforcement & Zero Mutations', () => {
    it('rejects assigning a TripLeg already in ASSIGNED status', async () => {
      // Seed leg_003_out is already ASSIGNED
      const before = snapshotStoreCollections();

      await expect(
        assignmentService.createAssignment('leg_003_out', 'veh_03', 'drv_03', 'usr_adm_01')
      ).rejects.toThrow(/cannot be assigned from status ASSIGNED\. Must be PENDING_ASSIGNMENT/);

      expect(snapshotStoreCollections()).toEqual(before);
    });

    it('rejects assigning a TripLeg already in an active in-flight status (ARRIVED_AT_PICKUP)', async () => {
      // Seed req_006 is ASSIGNED and leg_006_out is ARRIVED_AT_PICKUP
      const before = snapshotStoreCollections();

      await expect(
        assignmentService.createAssignment('leg_006_out', 'veh_03', 'drv_03', 'usr_adm_01')
      ).rejects.toThrow(/cannot be assigned from status ARRIVED_AT_PICKUP\. Must be PENDING_ASSIGNMENT/);

      expect(snapshotStoreCollections()).toEqual(before);
    });

    it('rejects assigning a TripLeg in COMPLETED terminal status', async () => {
      // Seed req_007 is COMPLETED, test explicit leg guard even if parent were APPROVED
      useFleetFlowStore.setState((s) => ({
        requests: s.requests.map((r) => (r.id === 'req_007' ? { ...r, status: 'APPROVED' } : r)),
      }));
      const before = snapshotStoreCollections();

      await expect(
        assignmentService.createAssignment('leg_007_out', 'veh_03', 'drv_03', 'usr_adm_01')
      ).rejects.toThrow(/cannot be assigned from status COMPLETED\. Must be PENDING_ASSIGNMENT/);

      expect(snapshotStoreCollections()).toEqual(before);
    });
  });

  describe('Duplicate Active Assignment Prevention & Zero Mutations', () => {
    it('rejects creating a second ACTIVE assignment for the same TripLeg even if leg status were reset', async () => {
      // Simulate inconsistent store state where leg_002_out is PENDING_ASSIGNMENT
      // while an ACTIVE assignment already points to leg_002_out
      useFleetFlowStore.setState((s) => ({
        assignments: [
          ...s.assignments,
          {
            id: 'asg_existing_dup_guard',
            tripLegId: 'leg_002_out',
            vehicleId: 'veh_01',
            driverId: 'drv_02',
            assignedAt: '2026-11-25T08:00:00Z',
            status: 'ACTIVE',
          },
        ],
      }));

      const before = snapshotStoreCollections();

      await expect(
        assignmentService.createAssignment('leg_002_out', 'veh_03', 'drv_03', 'usr_adm_01')
      ).rejects.toThrow(/already has an active assignment \(asg_existing_dup_guard\)/);

      expect(snapshotStoreCollections()).toEqual(before);
    });
  });
});
