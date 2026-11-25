import { describe, it, expect, beforeEach } from 'vitest';
import { tripService } from '@/services/trip-service';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { vehicleRequestRepository } from '@/repositories/mock/mock-vehicle-request-repository';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { driverRepository } from '@/repositories/mock/mock-driver-repository';
import { TripLeg, User } from '@/types/domain';

describe('Driver Trip Execution — End-to-End Workflow & Cross-Role Consistency', () => {
  beforeEach(() => {
    useFleetFlowStore.getState().resetData();
  });

  it('progresses through all 6 sequential actions using authenticated User.id', async () => {
    // Isolated driver and vehicle setup to ensure zero cross-trip collision
    const testDriverUser: User = {
      id: 'usr_drv_test_seq',
      name: 'Sequence Test Driver',
      email: 'seq.driver@fleetflow.com',
      role: 'DRIVER',
      department: 'Transportation Services',
      phone: '+880-1811-099999',
    };
    const testDriver = {
      id: 'drv_test_seq',
      userId: 'usr_drv_test_seq',
      phone: '+880-1811-099999',
      status: 'AVAILABLE' as const,
    };
    const testVehicle = {
      id: 'veh_test_seq',
      registrationNumber: 'FLT-TEST-99',
      model: 'Test Isolated Electric Van',
      capacity: 6,
      status: 'AVAILABLE' as const,
    };

    useFleetFlowStore.setState((s) => ({
      users: [...s.users, testDriverUser],
      drivers: [...s.drivers, testDriver],
      vehicles: [...s.vehicles, testVehicle],
    }));

    // 1. Create a fresh trip leg in ASSIGNED status
    const testLeg: TripLeg = {
      id: 'leg_exec_full',
      requestId: 'req_003',
      legType: 'OUTBOUND',
      pickupLocation: 'Corporate Headquarters',
      destination: 'South Manufacturing Complex',
      scheduledDeparture: '2026-11-28T08:00:00Z',
      scheduledArrival: '2026-11-28T10:00:00Z',
      status: 'ASSIGNED',
    };
    await tripLegRepository.create(testLeg);

    await assignmentRepository.create({
      id: 'asg_exec_full',
      tripLegId: 'leg_exec_full',
      vehicleId: 'veh_test_seq',
      driverId: 'drv_test_seq',
      assignedAt: '2026-11-28T07:30:00Z',
      status: 'ACTIVE',
    });

    const driverUserId = 'usr_drv_test_seq';

    // Step 1: Accept Assignment (ASSIGNED -> ACCEPTED)
    const legAfterAccept = await tripService.acceptTrip('leg_exec_full', driverUserId);
    expect(legAfterAccept.status).toBe('ACCEPTED');

    // Cross-Role Resource Sync: Vehicle -> IN_USE, Driver -> ON_TRIP
    const vehAfterAccept = await vehicleRepository.getById('veh_test_seq');
    const drvAfterAccept = await driverRepository.getById('drv_test_seq');
    expect(vehAfterAccept?.status).toBe('IN_USE');
    expect(drvAfterAccept?.status).toBe('ON_TRIP');

    // Step 2: Mark Arrived at Pickup (ACCEPTED -> ARRIVED_AT_PICKUP)
    const legAfterArrive = await tripService.markArrivedAtPickup('leg_exec_full', driverUserId);
    expect(legAfterArrive.status).toBe('ARRIVED_AT_PICKUP');

    // Step 3: Confirm Passenger Pickup (ARRIVED_AT_PICKUP -> PICKED_UP)
    const legAfterPickup = await tripService.confirmPickup('leg_exec_full', driverUserId);
    expect(legAfterPickup.status).toBe('PICKED_UP');

    // Step 4: Start Journey (PICKED_UP -> IN_PROGRESS)
    const legAfterStart = await tripService.startTrip('leg_exec_full', driverUserId);
    expect(legAfterStart.status).toBe('IN_PROGRESS');

    // Step 5: Confirm Drop-off (IN_PROGRESS -> DROPPED_OFF)
    const legAfterDropoff = await tripService.confirmDropoff('leg_exec_full', driverUserId);
    expect(legAfterDropoff.status).toBe('DROPPED_OFF');

    // Verify resources remain occupied during DROPPED_OFF
    const vehDuringDrop = await vehicleRepository.getById('veh_test_seq');
    const drvDuringDrop = await driverRepository.getById('drv_test_seq');
    expect(vehDuringDrop?.status).toBe('IN_USE');
    expect(drvDuringDrop?.status).toBe('ON_TRIP');

    // Step 6: Complete Trip Leg (DROPPED_OFF -> COMPLETED)
    const legAfterComplete = await tripService.completeTrip('leg_exec_full', driverUserId);
    expect(legAfterComplete.status).toBe('COMPLETED');

    // Verify resources are safely released back to AVAILABLE upon completion
    const vehAfterComplete = await vehicleRepository.getById('veh_test_seq');
    const drvAfterComplete = await driverRepository.getById('drv_test_seq');
    expect(vehAfterComplete?.status).toBe('AVAILABLE');
    expect(drvAfterComplete?.status).toBe('AVAILABLE');

    // Verify Assignment is marked COMPLETED
    const asgAfterComplete = await assignmentRepository.getById('asg_exec_full');
    expect(asgAfterComplete?.status).toBe('COMPLETED');

    // Verify Activity Log recorded all steps with driver User.id
    const logs = useFleetFlowStore.getState().activityLogs.filter((l) => l.tripLegId === 'leg_exec_full');
    expect(logs.length).toBeGreaterThanOrEqual(6);
    expect(logs.every((l) => l.actorId === driverUserId)).toBe(true);

    // Verify Employee Notifications were created for the requester
    const notifs = useFleetFlowStore.getState().notifications.filter((n) => n.recipientId === 'usr_emp_03');
    expect(notifs.length).toBeGreaterThanOrEqual(6);
  });

  it('rejects an unauthorized driver from executing another driver assigned trip', async () => {
    const testLeg: TripLeg = {
      id: 'leg_unauth_exec',
      requestId: 'req_003',
      legType: 'OUTBOUND',
      pickupLocation: 'HQ',
      destination: 'Plant',
      scheduledDeparture: '2026-11-28T08:00:00Z',
      scheduledArrival: '2026-11-28T10:00:00Z',
      status: 'ASSIGNED',
    };
    await tripLegRepository.create(testLeg);

    // Assigned to drv_01
    await assignmentRepository.create({
      id: 'asg_unauth_exec',
      tripLegId: 'leg_unauth_exec',
      vehicleId: 'veh_02',
      driverId: 'drv_01',
      assignedAt: '2026-11-28T07:30:00Z',
      status: 'ACTIVE',
    });

    // usr_drv_02 attempts to accept trip assigned to drv_01
    await expect(
      tripService.acceptTrip('leg_unauth_exec', 'usr_drv_02')
    ).rejects.toThrow(/Unauthorized: Driver drv_02 .* is not assigned/);
  });

  it('verifies independent round-trip leg progression and parent request completion', async () => {
    // req_004 in seed data has 2 legs:
    // outbound: leg_004_out (IN_PROGRESS, assigned to drv_02 / usr_drv_02)
    // return: leg_004_ret (ASSIGNED, assigned to drv_02 / usr_drv_02)
    const initialRequest = await vehicleRequestRepository.getById('req_004');
    expect(initialRequest?.status).toBe('ASSIGNED');

    // 1. Advance outbound leg to completion
    await tripService.confirmDropoff('leg_004_out', 'usr_drv_02');
    await tripService.completeTrip('leg_004_out', 'usr_drv_02');

    const outboundLeg = await tripLegRepository.getById('leg_004_out');
    expect(outboundLeg?.status).toBe('COMPLETED');

    // 2. Return leg remains unstarted ASSIGNED
    const returnLegBefore = await tripLegRepository.getById('leg_004_ret');
    expect(returnLegBefore?.status).toBe('ASSIGNED');

    // 3. Parent request remains ASSIGNED (NOT completed)
    const requestMidpoint = await vehicleRequestRepository.getById('req_004');
    expect(requestMidpoint?.status).toBe('ASSIGNED');

    // 4. Progress return leg through all 6 actions
    await tripService.acceptTrip('leg_004_ret', 'usr_drv_02');
    await tripService.markArrivedAtPickup('leg_004_ret', 'usr_drv_02');
    await tripService.confirmPickup('leg_004_ret', 'usr_drv_02');
    await tripService.startTrip('leg_004_ret', 'usr_drv_02');
    await tripService.confirmDropoff('leg_004_ret', 'usr_drv_02');
    await tripService.completeTrip('leg_004_ret', 'usr_drv_02');

    const returnLegAfter = await tripLegRepository.getById('leg_004_ret');
    expect(returnLegAfter?.status).toBe('COMPLETED');

    // 5. Parent request now marks COMPLETED
    const requestFinal = await vehicleRequestRepository.getById('req_004');
    expect(requestFinal?.status).toBe('COMPLETED');
  });
});
