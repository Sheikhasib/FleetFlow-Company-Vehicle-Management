import { describe, it, expect, beforeEach } from 'vitest';
import { TripService } from '@/services/trip-service';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { driverRepository } from '@/repositories/mock/mock-driver-repository';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { TripLeg, User } from '@/types/domain';

describe('TripService — Service-Level Driver Ownership Authorization Guard', () => {
  let tripService: TripService;

  beforeEach(() => {
    tripService = new TripService();
    useFleetFlowStore.getState().resetData();
  });

  describe('Authorized Execution Paths', () => {
    it('allows assigned Driver to advance trip using valid User.id (usr_drv_01)', async () => {
      const testLeg: TripLeg = {
        id: 'leg_owner_test_1',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      // asg assigns drv_01 (whose userId is usr_drv_01)
      await assignmentRepository.create({
        id: 'asg_owner_test_1',
        tripLegId: 'leg_owner_test_1',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      // Acting user is usr_drv_01 (resolves to drv_01)
      const updated = await tripService.acceptTrip('leg_owner_test_1', 'usr_drv_01');
      expect(updated.status).toBe('ACCEPTED');

      // Verify audit log has User.id recorded
      const logs = useFleetFlowStore.getState().activityLogs;
      const legLog = logs.find((l) => l.tripLegId === 'leg_owner_test_1');
      expect(legLog).toBeDefined();
      expect(legLog?.actorId).toBe('usr_drv_01');
      expect(legLog?.action).toBe('TRIP_ACCEPTED');
    });

    it('allows Admin user (usr_adm_01) to advance trip through authorized Admin monitoring workflow', async () => {
      const testLeg: TripLeg = {
        id: 'leg_owner_test_admin',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_owner_test_admin',
        tripLegId: 'leg_owner_test_admin',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      // Admin executes action (from AdminTripMonitoringPage)
      const updated = await tripService.acceptTrip('leg_owner_test_admin', 'usr_adm_01');
      expect(updated.status).toBe('ACCEPTED');

      const logs = useFleetFlowStore.getState().activityLogs;
      const legLog = logs.find((l) => l.tripLegId === 'leg_owner_test_admin');
      expect(legLog?.actorId).toBe('usr_adm_01');
    });
  });

  describe('Rejection of Raw Driver.id, system, and admin String Identities', () => {
    it('rejects action when caller passes raw Driver.id (drv_01) instead of User.id', async () => {
      const testLeg: TripLeg = {
        id: 'leg_raw_driver_id',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_raw_driver_id',
        tripLegId: 'leg_raw_driver_id',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      // Passing raw Driver.id "drv_01" must be rejected
      await expect(
        tripService.acceptTrip('leg_raw_driver_id', 'drv_01')
      ).rejects.toThrow(/Unauthorized: Invalid or unknown actor user ID: drv_01/);
    });

    it('rejects action when caller passes system string identity', async () => {
      const testLeg: TripLeg = {
        id: 'leg_system_bypass',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_system_bypass',
        tripLegId: 'leg_system_bypass',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      await expect(
        tripService.acceptTrip('leg_system_bypass', 'system')
      ).rejects.toThrow(/Unauthorized: Invalid or unknown actor user ID: system/);
    });

    it('rejects action when caller passes admin string identity', async () => {
      const testLeg: TripLeg = {
        id: 'leg_admin_bypass',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_admin_bypass',
        tripLegId: 'leg_admin_bypass',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      await expect(
        tripService.acceptTrip('leg_admin_bypass', 'admin')
      ).rejects.toThrow(/Unauthorized: Invalid or unknown actor user ID: admin/);
    });
  });

  describe('Role and Assignment Boundary Rejections', () => {
    it('rejects action when different Driver User.id (usr_drv_02) attempts to advance trip assigned to drv_01', async () => {
      const testLeg: TripLeg = {
        id: 'leg_unauth_drv_user',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      // Assigned to drv_01
      await assignmentRepository.create({
        id: 'asg_unauth_drv_user',
        tripLegId: 'leg_unauth_drv_user',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      // usr_drv_02 resolves to drv_02 -> MISMATCH with assigned drv_01
      await expect(
        tripService.acceptTrip('leg_unauth_drv_user', 'usr_drv_02')
      ).rejects.toThrow(/Unauthorized: Driver drv_02 .* is not assigned to trip leg leg_unauth_drv_user/);
    });

    it('rejects action when an Employee User.id (usr_emp_01) attempts to execute driver trip transition', async () => {
      const testLeg: TripLeg = {
        id: 'leg_unauth_emp',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_unauth_emp',
        tripLegId: 'leg_unauth_emp',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      await expect(
        tripService.acceptTrip('leg_unauth_emp', 'usr_emp_01')
      ).rejects.toThrow(/Unauthorized: User usr_emp_01 .* with role EMPLOYEE cannot advance trip status/);
    });

    it('rejects action if TripLeg does not exist', async () => {
      await expect(
        tripService.acceptTrip('leg_nonexistent', 'usr_drv_01')
      ).rejects.toThrow(/Trip leg not found: leg_nonexistent/);
    });

    it('rejects action if required Assignment does not exist', async () => {
      const testLeg: TripLeg = {
        id: 'leg_no_asg',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await expect(
        tripService.acceptTrip('leg_no_asg', 'usr_drv_01')
      ).rejects.toThrow(/No active assignment found for trip leg: leg_no_asg/);
    });

    it('rejects action if DRIVER user has no associated Driver profile', async () => {
      const ghostUser: User = {
        id: 'usr_drv_ghost',
        name: 'Ghost Driver',
        email: 'ghost@fleetflow.com',
        role: 'DRIVER',
        department: 'Transportation Services',
        phone: '+880-1811-099999',
      };
      useFleetFlowStore.setState((s) => ({
        users: [...s.users, ghostUser],
      }));

      const testLeg: TripLeg = {
        id: 'leg_ghost_driver',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_ghost_driver',
        tripLegId: 'leg_ghost_driver',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      await expect(
        tripService.acceptTrip('leg_ghost_driver', 'usr_drv_ghost')
      ).rejects.toThrow(/Unauthorized: No driver profile found for user usr_drv_ghost/);
    });

    it('rejects action if actor user ID is completely unknown', async () => {
      const testLeg: TripLeg = {
        id: 'leg_unknown_actor',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_unknown_actor',
        tripLegId: 'leg_unknown_actor',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      await expect(
        tripService.acceptTrip('leg_unknown_actor', 'nonexistent_actor_id')
      ).rejects.toThrow(/Unauthorized: Invalid or unknown actor user ID: nonexistent_actor_id/);
    });
  });

  describe('Zero-Mutation Guarantee on Unauthorized Attempts', () => {
    it('leaves all state completely unchanged when an unauthorized attempt occurs', async () => {
      // Setup driver user lacking an associated Driver profile
      const ghostUser: User = {
        id: 'usr_drv_ghost_mut',
        name: 'Ghost Driver',
        email: 'ghost_mut@fleetflow.com',
        role: 'DRIVER',
        department: 'Transportation Services',
        phone: '+880-1811-099999',
      };
      useFleetFlowStore.setState((s) => ({
        users: [...s.users, ghostUser],
      }));

      // Setup standard assigned test leg with active assignment
      const testLeg: TripLeg = {
        id: 'leg_zero_mutation',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLeg);

      await assignmentRepository.create({
        id: 'asg_zero_mutation',
        tripLegId: 'leg_zero_mutation',
        vehicleId: 'veh_02',
        driverId: 'drv_01',
        assignedAt: '2026-11-27T07:30:00Z',
        status: 'ACTIVE',
      });

      // Setup second test leg without an active assignment
      const testLegNoAsg: TripLeg = {
        id: 'leg_zero_mut_no_asg',
        requestId: 'req_003',
        legType: 'OUTBOUND',
        pickupLocation: 'Headquarters',
        destination: 'North Plant',
        scheduledDeparture: '2026-11-27T08:00:00Z',
        scheduledArrival: '2026-11-27T10:00:00Z',
        status: 'ASSIGNED',
      };
      await tripLegRepository.create(testLegNoAsg);

      // Capture pre-attempt state snapshots across all domain entities
      const preLogsCount = useFleetFlowStore.getState().activityLogs.length;
      const preNotifsCount = useFleetFlowStore.getState().notifications.length;
      const preVehicle = await vehicleRepository.getById('veh_02');
      const preDriver = await driverRepository.getById('drv_01');
      const preLeg = await tripLegRepository.getById('leg_zero_mutation');
      const preLegNoAsg = await tripLegRepository.getById('leg_zero_mut_no_asg');
      const preAsg = await assignmentRepository.getById('asg_zero_mutation');

      // Attempt 1: Unauthorized transition by employee
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'usr_emp_02')
      ).rejects.toThrow();

      // Attempt 2: Unauthorized transition by different driver
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'usr_drv_03')
      ).rejects.toThrow();

      // Attempt 3: Unauthorized transition with raw Driver.id
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'drv_01')
      ).rejects.toThrow();

      // Attempt 4: Unauthorized transition with system string bypass
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'system')
      ).rejects.toThrow();

      // Attempt 5: Unauthorized transition with admin string bypass
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'admin')
      ).rejects.toThrow();

      // Attempt 6: Unauthorized transition with completely unknown User ID
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'nonexistent_actor_id')
      ).rejects.toThrow();

      // Attempt 7: Unauthorized transition with missing Driver profile
      await expect(
        tripService.acceptTrip('leg_zero_mutation', 'usr_drv_ghost_mut')
      ).rejects.toThrow();

      // Attempt 8: Unauthorized transition when active Assignment is missing
      await expect(
        tripService.acceptTrip('leg_zero_mut_no_asg', 'usr_drv_01')
      ).rejects.toThrow();

      // Post-attempt assertions: Zero state mutation across all domain entities
      const postLeg = await tripLegRepository.getById('leg_zero_mutation');
      expect(postLeg?.status).toBe(preLeg?.status);
      expect(postLeg?.status).toBe('ASSIGNED');

      const postLegNoAsg = await tripLegRepository.getById('leg_zero_mut_no_asg');
      expect(postLegNoAsg?.status).toBe(preLegNoAsg?.status);
      expect(postLegNoAsg?.status).toBe('ASSIGNED');

      const postAsg = await assignmentRepository.getById('asg_zero_mutation');
      expect(postAsg?.status).toBe(preAsg?.status);
      expect(postAsg?.status).toBe('ACTIVE');

      const postNoAsg = await assignmentRepository.getByTripLegId('leg_zero_mut_no_asg');
      expect(postNoAsg).toBeNull();

      const postLogsCount = useFleetFlowStore.getState().activityLogs.length;
      expect(postLogsCount).toBe(preLogsCount);

      const postNotifsCount = useFleetFlowStore.getState().notifications.length;
      expect(postNotifsCount).toBe(preNotifsCount);

      const postVehicle = await vehicleRepository.getById('veh_02');
      expect(postVehicle?.status).toBe(preVehicle?.status);

      const postDriver = await driverRepository.getById('drv_01');
      expect(postDriver?.status).toBe(preDriver?.status);
    });
  });
});
