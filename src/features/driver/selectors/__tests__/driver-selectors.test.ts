import { describe, it, expect } from 'vitest';
import {
  selectDriverTrips,
  selectDriverDashboardOverview,
  selectDriverTripDetail,
  resolveDriverForUser,
  isActiveDriverTripStatus,
  DriverSelectorState,
} from '../driver-selectors';
import { User, Driver, Vehicle, VehicleRequest, TripLeg, Assignment } from '@/types/domain';

describe('Driver Selectors — Ownership Isolation & Mutual Exclusivity', () => {
  const mockUsers: User[] = [
    {
      id: 'usr_drv_01',
      name: 'Abdul Karim',
      email: 'abdul.karim@fleetflow.com',
      role: 'DRIVER',
      department: 'Transportation Services',
      phone: '+880-1811-030101',
    },
    {
      id: 'usr_drv_02',
      name: 'Md. Rafiqul Islam',
      email: 'rafiqul.islam@fleetflow.com',
      role: 'DRIVER',
      department: 'Transportation Services',
      phone: '+880-1811-030202',
    },
    {
      id: 'usr_emp_01',
      name: 'Nusrat Jahan',
      email: 'nusrat.jahan@fleetflow.com',
      role: 'EMPLOYEE',
      department: 'Engineering',
      phone: '+880-1711-010101',
    },
  ];

  const mockDrivers: Driver[] = [
    { id: 'drv_01', userId: 'usr_drv_01', phone: '+880-1811-030101', status: 'AVAILABLE' },
    { id: 'drv_02', userId: 'usr_drv_02', phone: '+880-1811-030202', status: 'ON_TRIP' },
  ];

  const mockVehicles: Vehicle[] = [
    { id: 'veh_01', registrationNumber: 'FLT-1010', model: 'Ford Transit', capacity: 8, status: 'AVAILABLE' },
    { id: 'veh_02', registrationNumber: 'FLT-2020', model: 'Toyota Camry', capacity: 4, status: 'IN_USE' },
  ];

  const mockRequests: VehicleRequest[] = [
    {
      id: 'req_001',
      requesterId: 'usr_emp_01',
      tripType: 'ONE_WAY',
      passengerCount: 2,
      purpose: 'Plant Inspection',
      status: 'ASSIGNED',
      createdAt: '2026-11-20T08:00:00Z',
      updatedAt: '2026-11-20T08:30:00Z',
    },
    {
      id: 'req_002',
      requesterId: 'usr_emp_01',
      tripType: 'ONE_WAY',
      passengerCount: 1,
      purpose: 'Executive Meeting',
      status: 'ASSIGNED',
      createdAt: '2026-11-21T08:00:00Z',
      updatedAt: '2026-11-21T08:30:00Z',
    },
    {
      id: 'req_003',
      requesterId: 'usr_emp_01',
      tripType: 'ONE_WAY',
      passengerCount: 3,
      purpose: 'Finished Trip',
      status: 'COMPLETED',
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T12:00:00Z',
    },
  ];

  const refDate = new Date('2026-11-25T10:00:00Z');

  const mockTripLegs: TripLeg[] = [
    // Active trip for drv_01: IN_PROGRESS
    {
      id: 'leg_active',
      requestId: 'req_001',
      legType: 'OUTBOUND',
      pickupLocation: 'HQ',
      destination: 'Plant',
      scheduledDeparture: '2026-11-25T09:00:00Z',
      scheduledArrival: '2026-11-25T11:00:00Z',
      status: 'IN_PROGRESS',
    },
    // Today's scheduled trip for drv_01: ASSIGNED
    {
      id: 'leg_today',
      requestId: 'req_002',
      legType: 'OUTBOUND',
      pickupLocation: 'HQ',
      destination: 'Downtown',
      scheduledDeparture: '2026-11-25T14:00:00Z',
      scheduledArrival: '2026-11-25T16:00:00Z',
      status: 'ASSIGNED',
    },
    // Upcoming future trip for drv_01: ASSIGNED (tomorrow)
    {
      id: 'leg_future',
      requestId: 'req_002',
      legType: 'RETURN',
      pickupLocation: 'Downtown',
      destination: 'HQ',
      scheduledDeparture: '2026-11-26T09:00:00Z',
      scheduledArrival: '2026-11-26T11:00:00Z',
      status: 'ASSIGNED',
    },
    // Completed trip for drv_01
    {
      id: 'leg_completed',
      requestId: 'req_003',
      legType: 'OUTBOUND',
      pickupLocation: 'HQ',
      destination: 'Airport',
      scheduledDeparture: '2026-11-15T09:00:00Z',
      scheduledArrival: '2026-11-15T11:00:00Z',
      status: 'COMPLETED',
    },
    // Trip assigned to drv_02 (must NOT be seen by drv_01)
    {
      id: 'leg_drv_02',
      requestId: 'req_001',
      legType: 'RETURN',
      pickupLocation: 'Plant',
      destination: 'HQ',
      scheduledDeparture: '2026-11-25T18:00:00Z',
      scheduledArrival: '2026-11-25T20:00:00Z',
      status: 'IN_PROGRESS',
    },
  ];

  const mockAssignments: Assignment[] = [
    { id: 'asg_1', tripLegId: 'leg_active', vehicleId: 'veh_01', driverId: 'drv_01', assignedAt: '2026-11-25T08:00:00Z', status: 'ACTIVE' },
    { id: 'asg_2', tripLegId: 'leg_today', vehicleId: 'veh_01', driverId: 'drv_01', assignedAt: '2026-11-25T08:00:00Z', status: 'ACTIVE' },
    { id: 'asg_3', tripLegId: 'leg_future', vehicleId: 'veh_01', driverId: 'drv_01', assignedAt: '2026-11-25T08:00:00Z', status: 'ACTIVE' },
    { id: 'asg_4', tripLegId: 'leg_completed', vehicleId: 'veh_01', driverId: 'drv_01', assignedAt: '2026-11-15T08:00:00Z', status: 'COMPLETED' },
    { id: 'asg_5', tripLegId: 'leg_drv_02', vehicleId: 'veh_02', driverId: 'drv_02', assignedAt: '2026-11-25T08:00:00Z', status: 'ACTIVE' },
  ];

  const mockState: DriverSelectorState = {
    users: mockUsers,
    drivers: mockDrivers,
    vehicles: mockVehicles,
    requests: mockRequests,
    tripLegs: mockTripLegs,
    assignments: mockAssignments,
    passengers: [],
    activityLogs: [],
  };

  it('resolves Driver record by User.id', () => {
    const drv1 = resolveDriverForUser(mockState, 'usr_drv_01');
    expect(drv1).toBeDefined();
    expect(drv1?.id).toBe('drv_01');

    const unknown = resolveDriverForUser(mockState, 'usr_unknown');
    expect(unknown).toBeNull();
  });

  it('selects trips strictly isolated to the authenticated driver', () => {
    const drv1Trips = selectDriverTrips(mockState, 'usr_drv_01');
    expect(drv1Trips).toHaveLength(4);
    expect(drv1Trips.some((t) => t.legId === 'leg_drv_02')).toBe(false);

    const drv2Trips = selectDriverTrips(mockState, 'usr_drv_02');
    expect(drv2Trips).toHaveLength(1);
    expect(drv2Trips[0].legId).toBe('leg_drv_02');
  });

  it('enforces mutually exclusive category partitioning on the dashboard', () => {
    const overview = selectDriverDashboardOverview(mockState, 'usr_drv_01', refDate);

    // 1. Active Trip is captured in activeTrip
    expect(overview.activeTrip).toBeDefined();
    expect(overview.activeTrip?.legId).toBe('leg_active');
    expect(overview.activeTrip?.status).toBe('IN_PROGRESS');

    // 2. Active Trip is strictly excluded from todayTrips, upcomingTrips, and completedTrips
    expect(overview.todayTrips.some((t) => t.legId === 'leg_active')).toBe(false);
    expect(overview.upcomingTrips.some((t) => t.legId === 'leg_active')).toBe(false);
    expect(overview.completedTrips.some((t) => t.legId === 'leg_active')).toBe(false);

    // 3. Today's Queue has leg_today (ASSIGNED today)
    expect(overview.todayTrips.some((t) => t.legId === 'leg_today')).toBe(true);

    // 4. Upcoming Queue has leg_future (ASSIGNED tomorrow)
    expect(overview.upcomingTrips.some((t) => t.legId === 'leg_future')).toBe(true);

    // 5. Completed Queue has leg_completed (COMPLETED)
    expect(overview.completedTrips.some((t) => t.legId === 'leg_completed')).toBe(true);

    // 6. Stats accuracy
    expect(overview.stats.activeCount).toBe(1);
    expect(overview.stats.assignedCount).toBe(2); // leg_today and leg_future
    expect(overview.stats.completedCount).toBe(1);
  });

  it('resolves trip execution details and enforces ownership isolation', () => {
    // Valid assigned trip for usr_drv_01
    const detail = selectDriverTripDetail(mockState, 'leg_active', 'usr_drv_01');
    expect(detail).toBeDefined();
    expect(detail?.legId).toBe('leg_active');
    expect(detail?.nextAction?.currentStatus).toBe('IN_PROGRESS');
    expect(detail?.nextAction?.nextStatus).toBe('DROPPED_OFF');
    expect(detail?.isCompleted).toBe(false);

    // Attempting to access another driver's trip (leg_drv_02 belongs to drv_02)
    const unauthorized = selectDriverTripDetail(mockState, 'leg_drv_02', 'usr_drv_01');
    expect(unauthorized).toBeNull();
  });

  it('returns null nextAction for COMPLETED trip', () => {
    const completedDetail = selectDriverTripDetail(mockState, 'leg_completed', 'usr_drv_01');
    expect(completedDetail).toBeDefined();
    expect(completedDetail?.isCompleted).toBe(true);
    expect(completedDetail?.nextAction).toBeNull();
  });

  it('identifies active driver trip statuses correctly', () => {
    expect(isActiveDriverTripStatus('ACCEPTED')).toBe(true);
    expect(isActiveDriverTripStatus('ARRIVED_AT_PICKUP')).toBe(true);
    expect(isActiveDriverTripStatus('PICKED_UP')).toBe(true);
    expect(isActiveDriverTripStatus('IN_PROGRESS')).toBe(true);
    expect(isActiveDriverTripStatus('DROPPED_OFF')).toBe(true);
    expect(isActiveDriverTripStatus('ASSIGNED')).toBe(false);
    expect(isActiveDriverTripStatus('COMPLETED')).toBe(false);
    expect(isActiveDriverTripStatus('PENDING_ASSIGNMENT')).toBe(false);
  });

  describe('Stage 5.4 Task 1A — Parent Request Status Filtering', () => {
    const baseTestState: DriverSelectorState = {
      users: mockUsers,
      drivers: mockDrivers,
      vehicles: mockVehicles,
      requests: [
        ...mockRequests,
        {
          id: 'req_cancelled',
          requesterId: 'usr_emp_01',
          tripType: 'ONE_WAY',
          passengerCount: 1,
          purpose: 'Cancelled Trip',
          status: 'CANCELLED',
          createdAt: '2026-11-20T08:00:00Z',
          updatedAt: '2026-11-20T09:00:00Z',
        },
        {
          id: 'req_rejected',
          requesterId: 'usr_emp_01',
          tripType: 'ONE_WAY',
          passengerCount: 2,
          purpose: 'Rejected Trip',
          status: 'REJECTED',
          createdAt: '2026-11-20T08:00:00Z',
          updatedAt: '2026-11-20T09:00:00Z',
        },
        {
          id: 'req_approved_eligible',
          requesterId: 'usr_emp_01',
          tripType: 'ONE_WAY',
          passengerCount: 2,
          purpose: 'Approved Valid Trip',
          status: 'APPROVED',
          createdAt: '2026-11-20T08:00:00Z',
          updatedAt: '2026-11-20T09:00:00Z',
        },
      ],
      tripLegs: [
        ...mockTripLegs,
        {
          id: 'leg_cancelled_parent',
          requestId: 'req_cancelled',
          legType: 'OUTBOUND',
          pickupLocation: 'HQ',
          destination: 'Site Cancelled',
          scheduledDeparture: '2026-11-25T14:00:00Z',
          scheduledArrival: '2026-11-25T16:00:00Z',
          status: 'ASSIGNED',
        },
        {
          id: 'leg_rejected_parent',
          requestId: 'req_rejected',
          legType: 'OUTBOUND',
          pickupLocation: 'HQ',
          destination: 'Site Rejected',
          scheduledDeparture: '2026-11-25T15:00:00Z',
          scheduledArrival: '2026-11-25T17:00:00Z',
          status: 'ASSIGNED',
        },
        {
          id: 'leg_eligible_parent',
          requestId: 'req_approved_eligible',
          legType: 'OUTBOUND',
          pickupLocation: 'HQ',
          destination: 'Site Eligible',
          scheduledDeparture: '2026-11-25T16:00:00Z',
          scheduledArrival: '2026-11-25T18:00:00Z',
          status: 'ASSIGNED',
        },
        {
          id: 'leg_missing_parent',
          requestId: 'req_nonexistent_in_store',
          legType: 'OUTBOUND',
          pickupLocation: 'HQ',
          destination: 'Site Orphan',
          scheduledDeparture: '2026-11-25T17:00:00Z',
          scheduledArrival: '2026-11-25T19:00:00Z',
          status: 'ASSIGNED',
        },
      ],
      assignments: [
        ...mockAssignments,
        {
          id: 'asg_cancelled',
          tripLegId: 'leg_cancelled_parent',
          vehicleId: 'veh_01',
          driverId: 'drv_01',
          assignedAt: '2026-11-25T08:00:00Z',
          status: 'ACTIVE',
        },
        {
          id: 'asg_rejected',
          tripLegId: 'leg_rejected_parent',
          vehicleId: 'veh_01',
          driverId: 'drv_01',
          assignedAt: '2026-11-25T08:00:00Z',
          status: 'ACTIVE',
        },
        {
          id: 'asg_eligible',
          tripLegId: 'leg_eligible_parent',
          vehicleId: 'veh_01',
          driverId: 'drv_01',
          assignedAt: '2026-11-25T08:00:00Z',
          status: 'ACTIVE',
        },
        {
          id: 'asg_missing_parent',
          tripLegId: 'leg_missing_parent',
          vehicleId: 'veh_01',
          driverId: 'drv_01',
          assignedAt: '2026-11-25T08:00:00Z',
          status: 'ACTIVE',
        },
      ],
      passengers: [],
      activityLogs: [],
    };

    it('1. suppresses assigned TripLeg if parent VehicleRequest has status CANCELLED', () => {
      const trips = selectDriverTrips(baseTestState, 'usr_drv_01');
      expect(trips.some((t) => t.legId === 'leg_cancelled_parent')).toBe(false);
    });

    it('2. suppresses assigned TripLeg if parent VehicleRequest has status REJECTED', () => {
      const trips = selectDriverTrips(baseTestState, 'usr_drv_01');
      expect(trips.some((t) => t.legId === 'leg_rejected_parent')).toBe(false);
    });

    it('3. preserves assigned TripLeg for eligible parent request statuses (e.g. APPROVED, ASSIGNED, COMPLETED)', () => {
      const trips = selectDriverTrips(baseTestState, 'usr_drv_01');
      const eligibleTrip = trips.find((t) => t.legId === 'leg_eligible_parent');
      expect(eligibleTrip).toBeDefined();
      expect(eligibleTrip?.purpose).toBe('Approved Valid Trip');
    });

    it('4. ensures CANCELLED parent requests do not appear in any dashboard category', () => {
      const overview = selectDriverDashboardOverview(baseTestState, 'usr_drv_01', refDate);
      expect(overview.activeTrip?.legId).not.toBe('leg_cancelled_parent');
      expect(overview.todayTrips.some((t) => t.legId === 'leg_cancelled_parent')).toBe(false);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_cancelled_parent')).toBe(false);
      expect(overview.completedTrips.some((t) => t.legId === 'leg_cancelled_parent')).toBe(false);
    });

    it('5. ensures REJECTED parent requests do not appear in any dashboard category', () => {
      const overview = selectDriverDashboardOverview(baseTestState, 'usr_drv_01', refDate);
      expect(overview.activeTrip?.legId).not.toBe('leg_rejected_parent');
      expect(overview.todayTrips.some((t) => t.legId === 'leg_rejected_parent')).toBe(false);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_rejected_parent')).toBe(false);
      expect(overview.completedTrips.some((t) => t.legId === 'leg_rejected_parent')).toBe(false);
    });

    it('6. suppresses orphaned TripLeg when parent VehicleRequest is missing from state without crashing', () => {
      const trips = selectDriverTrips(baseTestState, 'usr_drv_01');
      // Orphaned trip leg with missing parent request must be suppressed
      expect(trips.some((t) => t.legId === 'leg_missing_parent')).toBe(false);
      // Valid parent requests remain visible
      expect(trips.some((t) => t.legId === 'leg_eligible_parent')).toBe(true);

      // Detail selector also returns null for the orphaned trip
      const detail = selectDriverTripDetail(baseTestState, 'leg_missing_parent', 'usr_drv_01');
      expect(detail).toBeNull();

      // Overview also suppresses the orphaned trip leg across all categories
      const overview = selectDriverDashboardOverview(baseTestState, 'usr_drv_01', refDate);
      expect(overview.activeTrip?.legId).not.toBe('leg_missing_parent');
      expect(overview.todayTrips.some((t) => t.legId === 'leg_missing_parent')).toBe(false);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_missing_parent')).toBe(false);
      expect(overview.completedTrips.some((t) => t.legId === 'leg_missing_parent')).toBe(false);
    });
  });

  describe('Stage 5.4 Task 1B — Category Integrity & Secondary Active Trip Handling', () => {
    it('7. ensures a single active trip appears exclusively in activeTrip and not in todayTrips', () => {
      const overview = selectDriverDashboardOverview(mockState, 'usr_drv_01', refDate);
      expect(overview.activeTrip?.legId).toBe('leg_active');
      expect(overview.todayTrips.some((t) => t.legId === 'leg_active')).toBe(false);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_active')).toBe(false);
    });

    it('8. suppresses secondary active trips from todayTrips when multiple active trips exist concurrently', () => {
      // Simulate inconsistent or testing state where driver has 2 active trips simultaneously
      const multiActiveState: DriverSelectorState = {
        ...mockState,
        tripLegs: [
          ...mockTripLegs,
          {
            id: 'leg_active_secondary',
            requestId: 'req_001',
            legType: 'RETURN',
            pickupLocation: 'Plant',
            destination: 'HQ',
            scheduledDeparture: '2026-11-25T11:30:00Z',
            scheduledArrival: '2026-11-25T13:30:00Z',
            status: 'ACCEPTED', // Also active!
          },
        ],
        assignments: [
          ...mockAssignments,
          {
            id: 'asg_active_secondary',
            tripLegId: 'leg_active_secondary',
            vehicleId: 'veh_01',
            driverId: 'drv_01',
            assignedAt: '2026-11-25T08:00:00Z',
            status: 'ACTIVE',
          },
        ],
      };

      const overview = selectDriverDashboardOverview(multiActiveState, 'usr_drv_01', refDate);

      // Primary active trip is in activeTrip (Hero)
      expect(overview.activeTrip).toBeDefined();
      expect(overview.activeTrip?.legId).toBe('leg_active');

      // Secondary active trip must NEVER leak into todayTrips or scheduled queues
      expect(overview.todayTrips.some((t) => t.legId === 'leg_active_secondary')).toBe(false);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_active_secondary')).toBe(false);
      expect(overview.completedTrips.some((t) => t.legId === 'leg_active_secondary')).toBe(false);

      // todayTrips contains STRICTLY ASSIGNED status trips
      expect(overview.todayTrips.every((t) => t.status === 'ASSIGNED')).toBe(true);
      expect(overview.todayTrips.some((t) => t.legId === 'leg_today')).toBe(true);
    });

    it('9. ensures secondary active trips remain visible in selectDriverTrips roster and accessible via selectDriverTripDetail', () => {
      const multiActiveState: DriverSelectorState = {
        ...mockState,
        tripLegs: [
          ...mockTripLegs,
          {
            id: 'leg_active_secondary',
            requestId: 'req_001',
            legType: 'RETURN',
            pickupLocation: 'Plant',
            destination: 'HQ',
            scheduledDeparture: '2026-11-25T11:30:00Z',
            scheduledArrival: '2026-11-25T13:30:00Z',
            status: 'ACCEPTED', // Also active!
          },
        ],
        assignments: [
          ...mockAssignments,
          {
            id: 'asg_active_secondary',
            tripLegId: 'leg_active_secondary',
            vehicleId: 'veh_01',
            driverId: 'drv_01',
            assignedAt: '2026-11-25T08:00:00Z',
            status: 'ACTIVE',
          },
        ],
      };

      // 1. Both active trips are returned in the driver's full trip roster (selectDriverTrips)
      const allDriverTrips = selectDriverTrips(multiActiveState, 'usr_drv_01');
      const activeTripsInRoster = allDriverTrips.filter((t) => isActiveDriverTripStatus(t.status));
      expect(activeTripsInRoster).toHaveLength(2);
      expect(activeTripsInRoster.map((t) => t.legId)).toEqual(['leg_active', 'leg_active_secondary']);

      // 2. Both active trips are placed at the top of the roster list
      expect(allDriverTrips[0].legId).toBe('leg_active');
      expect(allDriverTrips[1].legId).toBe('leg_active_secondary');

      // 3. Primary active trip details resolve with appropriate execution action
      const primaryDetail = selectDriverTripDetail(multiActiveState, 'leg_active', 'usr_drv_01');
      expect(primaryDetail).toBeDefined();
      expect(primaryDetail?.legId).toBe('leg_active');
      expect(primaryDetail?.status).toBe('IN_PROGRESS');
      expect(primaryDetail?.nextAction?.nextStatus).toBe('DROPPED_OFF');

      // 4. Secondary active trip details resolve and remain fully accessible for driver execution
      const secondaryDetail = selectDriverTripDetail(multiActiveState, 'leg_active_secondary', 'usr_drv_01');
      expect(secondaryDetail).toBeDefined();
      expect(secondaryDetail?.legId).toBe('leg_active_secondary');
      expect(secondaryDetail?.status).toBe('ACCEPTED');
      expect(secondaryDetail?.nextAction?.nextStatus).toBe('ARRIVED_AT_PICKUP');

      // 5. Dashboard overview reflects accurate active count while keeping single hero
      const overview = selectDriverDashboardOverview(multiActiveState, 'usr_drv_01', refDate);
      expect(overview.stats.activeCount).toBe(2);
      expect(overview.activeTrip?.legId).toBe('leg_active');
      expect(overview.todayTrips.some((t) => t.legId === 'leg_active_secondary')).toBe(false);
    });

    it('10. guarantees todayTrips contains only eligible ASSIGNED trips scheduled for today', () => {
      const overview = selectDriverDashboardOverview(mockState, 'usr_drv_01', refDate);
      expect(overview.todayTrips.length).toBeGreaterThanOrEqual(1);
      expect(overview.todayTrips.every((t) => t.status === 'ASSIGNED')).toBe(true);
      expect(overview.todayTrips.some((t) => t.legId === 'leg_today')).toBe(true);
      expect(overview.todayTrips.some((t) => t.legId === 'leg_future')).toBe(false);
      expect(overview.todayTrips.some((t) => t.legId === 'leg_completed')).toBe(false);
    });

    it('11. guarantees upcomingTrips contains only future eligible ASSIGNED trips', () => {
      const overview = selectDriverDashboardOverview(mockState, 'usr_drv_01', refDate);
      expect(overview.upcomingTrips.length).toBeGreaterThanOrEqual(1);
      expect(overview.upcomingTrips.every((t) => t.status === 'ASSIGNED')).toBe(true);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_future')).toBe(true);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_today')).toBe(false);
      expect(overview.upcomingTrips.some((t) => t.legId === 'leg_active')).toBe(false);
    });

    it('12. guarantees completedTrips contains only COMPLETED trips', () => {
      const overview = selectDriverDashboardOverview(mockState, 'usr_drv_01', refDate);
      expect(overview.completedTrips.length).toBeGreaterThanOrEqual(1);
      expect(overview.completedTrips.every((t) => t.status === 'COMPLETED')).toBe(true);
      expect(overview.completedTrips.some((t) => t.legId === 'leg_completed')).toBe(true);
    });

    it('13. preserves deterministic referenceTime evaluation across day boundaries', () => {
      // Shifting reference time to tomorrow: leg_future becomes today's trip, leg_today becomes past assignment
      const tomorrowRef = new Date('2026-11-26T10:00:00Z');
      const overviewTomorrow = selectDriverDashboardOverview(mockState, 'usr_drv_01', tomorrowRef);

      // On tomorrow, leg_future is scheduled today!
      expect(overviewTomorrow.todayTrips.some((t) => t.legId === 'leg_future')).toBe(true);
      // leg_today was scheduled yesterday -> unaccepted past assignments remain in todayTrips for action
      expect(overviewTomorrow.todayTrips.some((t) => t.legId === 'leg_today')).toBe(true);
      // Upcoming queue has no more future assignments
      expect(overviewTomorrow.upcomingTrips.some((t) => t.legId === 'leg_future')).toBe(false);
    });
  });
});
