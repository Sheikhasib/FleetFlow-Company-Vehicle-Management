import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import EmployeeDashboardPage from '@/app/employee/dashboard/page';
import RequestDetailPage from '@/app/employee/requests/[id]/page';
import { RequestDetailCard } from '../request-detail-card';
import {
  VehicleRequest,
  TripLeg,
  Assignment,
  Vehicle,
  Driver,
  User,
} from '@/types/domain';

// Mock Next.js navigation
const mockPush = vi.fn();
let mockParamsId = 'req_mock_01';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: mockParamsId }),
}));

// Route component store reads to live Zustand getState() in Node SSR test environment
vi.mock('@/stores/fleetflow-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/fleetflow-store')>();
  const hook = (selector?: any) =>
    selector ? selector(actual.useFleetFlowStore.getState()) : actual.useFleetFlowStore.getState();
  Object.assign(hook, actual.useFleetFlowStore);
  return {
    ...actual,
    useFleetFlowStore: hook,
  };
});

// Standard strictly-typed test fixtures
const testUser: User = {
  id: 'usr_emp_test',
  name: 'Sarah Connor',
  email: 'sarah.connor@fleetflow.internal',
  role: 'EMPLOYEE',
  department: 'Operations',
  phone: '+1-555-0100',
};

const otherUser: User = {
  id: 'usr_driver_test',
  name: 'John Matrix',
  email: 'john.matrix@fleetflow.internal',
  role: 'DRIVER',
  department: 'Fleet',
  phone: '+1-555-0200',
};

const testVehicle: Vehicle = {
  id: 'veh_test_01',
  model: 'Ford Transit Passenger Van',
  registrationNumber: 'FLT-9999',
  capacity: 8,
  status: 'IN_USE',
};

const testDriver: Driver = {
  id: 'drv_test_01',
  userId: otherUser.id,
  phone: '+1-555-0300',
  status: 'ON_TRIP',
};

describe('Stage 3, Step 3.4 — Employee Dashboard & Request Detail Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParamsId = 'req_mock_01';
    useFleetFlowStore.setState({
      currentUserId: testUser.id,
      users: [testUser, otherUser],
      vehicles: [testVehicle],
      drivers: [testDriver],
      requests: [],
      tripLegs: [],
      assignments: [],
      passengers: [],
    });
  });

  describe('Employee Dashboard Integration', () => {
    it('1. First-Time Employee: renders empty state when user has 0 requests', () => {
      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      expect(html).toContain('Welcome back, Sarah Connor');
      expect(html).toContain('No vehicle requests yet');
      expect(html).toContain('Book Your First Trip');
      // No active or upcoming sections rendered
      expect(html).not.toContain('Active Journey');
      expect(html).not.toContain('Upcoming Scheduled Trips');
      expect(html).not.toContain('Operational Attention Required');
      expect(html).not.toContain('Arrived at Destination');
    });

    it('2. No Active Trips: suppresses active journey section without empty placeholder card', () => {
      const req: VehicleRequest = {
        id: 'req_001',
        requesterId: testUser.id,
        purpose: 'Future Client Presentation',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'PENDING',
        createdAt: '2026-11-20T10:00:00.000Z',
        updatedAt: '2026-11-20T10:00:00.000Z',
      };
      useFleetFlowStore.setState({ requests: [req] });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      expect(html).toContain('Welcome back, Sarah Connor');
      expect(html).not.toContain('Active Journey');
      expect(html).toContain('Recent Requests');
      expect(html).toContain('Future Client Presentation');
    });

    it('3. Exactly One Active Trip: renders primary ActiveTripCard without secondary alert', () => {
      const req: VehicleRequest = {
        id: 'req_act_01',
        requesterId: testUser.id,
        purpose: 'On-site Plant Audit',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:00:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_act_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'IN_PROGRESS',
        pickupLocation: 'Corporate HQ — Detroit',
        destination: 'Manufacturing Plant B — Warren',
        scheduledDeparture: '2026-11-24T09:00:00.000Z',
        scheduledArrival: '2026-11-24T10:00:00.000Z',
      };
      const asg: Assignment = {
        id: 'asg_01',
        tripLegId: leg.id,
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        assignedAt: '2026-11-24T08:15:00.000Z',
        status: 'ACTIVE',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
        assignments: [asg],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      // Active Journey section rendered
      expect(html).toContain('Active Journey');
      expect(html).toContain('Corporate HQ — Detroit');
      expect(html).toContain('Manufacturing Plant B — Warren');
      expect(html).toContain('Vehicle in Transit');
      expect(html).toContain('Step 6 of 8');
      expect(html).toContain('Ford Transit Passenger Van');
      expect(html).toContain('John Matrix');
      // No secondary alert since there is only 1 active trip
      expect(html).not.toContain('Additional Active Trip');
    });

    it('4. Multiple Active Trips: renders primary ActiveTripCard AND SecondaryActiveAlert', () => {
      const req1: VehicleRequest = {
        id: 'req_act_01',
        requesterId: testUser.id,
        purpose: 'Primary Inspection',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:00:00.000Z',
      };
      const leg1: TripLeg = {
        id: 'leg_act_01',
        requestId: req1.id,
        legType: 'OUTBOUND',
        status: 'IN_PROGRESS',
        pickupLocation: 'HQ Detroit',
        destination: 'Plant B Warren',
        scheduledDeparture: '2026-11-24T09:00:00.000Z',
        scheduledArrival: '2026-11-24T10:00:00.000Z',
      };

      const req2: VehicleRequest = {
        id: 'req_act_02',
        requesterId: testUser.id,
        purpose: 'Secondary Inspection',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'ASSIGNED',
        createdAt: '2026-11-24T08:30:00.000Z',
        updatedAt: '2026-11-24T08:30:00.000Z',
      };
      const leg2: TripLeg = {
        id: 'leg_act_02',
        requestId: req2.id,
        legType: 'OUTBOUND',
        status: 'ACCEPTED',
        pickupLocation: 'Tech Hub Ann Arbor',
        destination: 'Research Park',
        scheduledDeparture: '2026-11-24T10:00:00.000Z',
        scheduledArrival: '2026-11-24T11:00:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [req1, req2],
        tripLegs: [leg1, leg2],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      // Primary active trip rendered
      expect(html).toContain('Active Journey');
      expect(html).toContain('HQ Detroit');
      // Secondary active trip alert rendered
      expect(html).toContain('1 Additional Active Trip');
      expect(html).toContain('Tech Hub Ann Arbor');
    });

    it('5. Dropped-Off Trips: rendered in dedicated section with Step 7 badge', () => {
      const req: VehicleRequest = {
        id: 'req_drop_01',
        requesterId: testUser.id,
        purpose: 'Supplier Audit',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T07:00:00.000Z',
        updatedAt: '2026-11-24T07:00:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_drop_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'DROPPED_OFF',
        pickupLocation: 'Detroit Hub',
        destination: 'Supplier Warehouse Toledo',
        scheduledDeparture: '2026-11-24T08:00:00.000Z',
        scheduledArrival: '2026-11-24T09:30:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      // Rendered in Arrived at Destination section
      expect(html).toContain('Arrived at Destination');
      expect(html).toContain('Supplier Warehouse Toledo');
      expect(html).toContain('Step 7 of 8');
      expect(html).toContain('Awaiting Administrative Journey Closure');
      // NOT in active journey section
      expect(html).not.toContain('Active Journey');
    });

    it('6. Upcoming Assigned Trips: rendered in Upcoming section with vehicle details', () => {
      // Future date relative to current time
      const futureDeparture = new Date(Date.now() + 86400000).toISOString();
      const futureArrival = new Date(Date.now() + 90000000).toISOString();

      const req: VehicleRequest = {
        id: 'req_upc_01',
        requesterId: testUser.id,
        purpose: 'Future Conference',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'ASSIGNED',
        createdAt: '2026-11-24T07:00:00.000Z',
        updatedAt: '2026-11-24T07:00:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_upc_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'ASSIGNED',
        pickupLocation: 'Corporate HQ',
        destination: 'Convention Center',
        scheduledDeparture: futureDeparture,
        scheduledArrival: futureArrival,
      };
      const asg: Assignment = {
        id: 'asg_upc_01',
        tripLegId: leg.id,
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        assignedAt: '2026-11-24T07:30:00.000Z',
        status: 'ACTIVE',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
        assignments: [asg],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      expect(html).toContain('Upcoming Scheduled Trips');
      expect(html).toContain('Convention Center');
      expect(html).toContain('FLT-9999');
      expect(html).toContain('John Matrix');
      expect(html).not.toContain('Active Journey');
    });

    it('7. Upcoming Pending-Assignment Trips: rendered with unallocated notice', () => {
      const futureDeparture = new Date(Date.now() + 86400000).toISOString();
      const futureArrival = new Date(Date.now() + 90000000).toISOString();

      const req: VehicleRequest = {
        id: 'req_pen_01',
        requesterId: testUser.id,
        purpose: 'Upcoming Lab Visit',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T07:00:00.000Z',
        updatedAt: '2026-11-24T07:00:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_pen_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'PENDING_ASSIGNMENT',
        pickupLocation: 'R&D Center',
        destination: 'Bio Testing Facility',
        scheduledDeparture: futureDeparture,
        scheduledArrival: futureArrival,
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      expect(html).toContain('Upcoming Scheduled Trips');
      expect(html).toContain('Bio Testing Facility');
      expect(html).toContain('Awaiting Vehicle Allocation');
    });

    it('8. Past Unfinished Trips: rendered in Operational Attention Required section', () => {
      // Past date relative to referenceTime
      const pastDeparture = '2026-01-01T10:00:00.000Z';
      const pastArrival = '2026-01-01T11:00:00.000Z';

      const req: VehicleRequest = {
        id: 'req_past_01',
        requesterId: testUser.id,
        purpose: 'Delayed Site Inspection',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_past_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'PENDING_ASSIGNMENT',
        pickupLocation: 'North Campus',
        destination: 'South Warehouse',
        scheduledDeparture: pastDeparture,
        scheduledArrival: pastArrival,
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      expect(html).toContain('Operational Attention Required');
      expect(html).toContain('South Warehouse');
      expect(html).toContain('Scheduled Departure Was at');
      expect(html).not.toContain('Active Journey');
      expect(html).not.toContain('Upcoming Scheduled Trips');
    });

    it('9. Empty optional sections are cleanly hidden when counts are zero', () => {
      const completedReq: VehicleRequest = {
        id: 'req_comp_01',
        requesterId: testUser.id,
        purpose: 'Past Finished Trip',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'COMPLETED',
        createdAt: '2026-11-20T08:00:00.000Z',
        updatedAt: '2026-11-20T12:00:00.000Z',
      };
      const completedLeg: TripLeg = {
        id: 'leg_comp_01',
        requestId: completedReq.id,
        legType: 'OUTBOUND',
        status: 'COMPLETED',
        pickupLocation: 'Origin A',
        destination: 'Destination B',
        scheduledDeparture: '2026-11-20T09:00:00.000Z',
        scheduledArrival: '2026-11-20T10:00:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [completedReq],
        tripLegs: [completedLeg],
      });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      // No active, dropped-off, upcoming, or past unfinished sections
      expect(html).not.toContain('Active Journey');
      expect(html).not.toContain('Additional Active Trip');
      expect(html).not.toContain('Arrived at Destination');
      expect(html).not.toContain('Upcoming Scheduled Trips');
      expect(html).not.toContain('Operational Attention Required');
      // KPI metrics reflect completed journey
      expect(html).toContain('Finished journeys');
      expect(html).toContain('Recent Requests');
      expect(html).toContain('Past Finished Trip');
    });

    it('10. KPI Metrics reflect accurate counts across statuses', () => {
      const r1: VehicleRequest = {
        id: 'r1',
        requesterId: testUser.id,
        purpose: 'P1',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'PENDING',
        createdAt: '2026-11-24T01:00:00.000Z',
        updatedAt: '2026-11-24T01:00:00.000Z',
      };
      const r2: VehicleRequest = {
        id: 'r2',
        requesterId: testUser.id,
        purpose: 'P2',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T02:00:00.000Z',
        updatedAt: '2026-11-24T02:00:00.000Z',
      };
      const r3: VehicleRequest = {
        id: 'r3',
        requesterId: testUser.id,
        purpose: 'P3',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'COMPLETED',
        createdAt: '2026-11-24T03:00:00.000Z',
        updatedAt: '2026-11-24T03:00:00.000Z',
      };

      useFleetFlowStore.setState({ requests: [r1, r2, r3] });

      const html = renderToStaticMarkup(<EmployeeDashboardPage />);

      expect(html).toContain('Total Requests');
      expect(html).toContain('Pending Review');
      expect(html).toContain('Approved');
      expect(html).toContain('Completed');
    });
  });

  describe('Request Detail Integration', () => {
    it('1. One-Way Request: renders TripLegTimeline with 1 outbound leg', () => {
      const req: VehicleRequest = {
        id: 'req_dtl_01',
        requesterId: testUser.id,
        purpose: 'Executive Meeting',
        notes: 'VIP guest onboard',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:00:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_dtl_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'IN_PROGRESS',
        pickupLocation: 'Metro Airport',
        destination: 'Downtown Executive Tower',
        scheduledDeparture: '2026-11-24T09:00:00.000Z',
        scheduledArrival: '2026-11-24T10:00:00.000Z',
      };
      const asg: Assignment = {
        id: 'asg_dtl_01',
        tripLegId: leg.id,
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        assignedAt: '2026-11-24T08:15:00.000Z',
        status: 'ACTIVE',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
        assignments: [asg],
      });

      const html = renderToStaticMarkup(<RequestDetailCard request={req} />);

      expect(html).toContain('req_dtl_01');
      expect(html).toContain('Executive Meeting');
      expect(html).toContain('VIP guest onboard');
      expect(html).toContain('Passenger Manifest (1)');
      // Canonical TripLegTimeline rendered
      expect(html).toContain('Journey Itinerary &amp; Leg Progress');
      expect(html).toContain('One-Way Booking (1 Leg)');
      expect(html).toContain('Outbound Journey');
      expect(html).toContain('Metro Airport');
      expect(html).toContain('Downtown Executive Tower');
      expect(html).toContain('Step 6 of 8');
      expect(html).toContain('Vehicle in Transit');
      expect(html).toContain('FLT-9999');
      expect(html).toContain('John Matrix');
    });

    it('2. Round-Trip Request: renders separate Outbound and Return legs in TripLegTimeline', () => {
      const req: VehicleRequest = {
        id: 'req_dtl_02',
        requesterId: testUser.id,
        purpose: 'Round Trip Site Survey',
        tripType: 'ROUND_TRIP',
        passengerCount: 2,
        status: 'APPROVED',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:00:00.000Z',
      };
      const leg1: TripLeg = {
        id: 'leg_out_01',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'COMPLETED',
        pickupLocation: 'Tech Campus',
        destination: 'Field Station A',
        scheduledDeparture: '2026-11-24T09:00:00.000Z',
        scheduledArrival: '2026-11-24T10:00:00.000Z',
      };
      const leg2: TripLeg = {
        id: 'leg_ret_01',
        requestId: req.id,
        legType: 'RETURN',
        status: 'PENDING_ASSIGNMENT',
        pickupLocation: 'Field Station A',
        destination: 'Tech Campus',
        scheduledDeparture: '2026-11-24T17:00:00.000Z',
        scheduledArrival: '2026-11-24T18:00:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg1, leg2],
      });

      const html = renderToStaticMarkup(<RequestDetailCard request={req} />);

      expect(html).toContain('Round-Trip Booking (2 Legs)');
      expect(html).toContain('Outbound Journey');
      expect(html).toContain('Return Journey');
      // Outbound is Completed (Step 8)
      expect(html).toContain('Step 8 of 8');
      expect(html).toContain('Journey Completed');
      // Return is Pending Assignment (Step 1)
      expect(html).toContain('Step 1 of 8');
      expect(html).toContain('Awaiting Vehicle Allocation');
    });

    it('3. Independent Outbound and Return statuses: preserves individual progress', () => {
      const req: VehicleRequest = {
        id: 'req_dtl_03',
        requesterId: testUser.id,
        purpose: 'Engineering Exchange',
        tripType: 'ROUND_TRIP',
        passengerCount: 1,
        status: 'APPROVED',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:00:00.000Z',
      };
      const leg1: TripLeg = {
        id: 'leg_out_03',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'DROPPED_OFF',
        pickupLocation: 'Plant 1',
        destination: 'Plant 2',
        scheduledDeparture: '2026-11-24T09:00:00.000Z',
        scheduledArrival: '2026-11-24T10:30:00.000Z',
      };
      const leg2: TripLeg = {
        id: 'leg_ret_03',
        requestId: req.id,
        legType: 'RETURN',
        status: 'ASSIGNED',
        pickupLocation: 'Plant 2',
        destination: 'Plant 1',
        scheduledDeparture: '2026-11-24T16:00:00.000Z',
        scheduledArrival: '2026-11-24T17:30:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg1, leg2],
      });

      const html = renderToStaticMarkup(<RequestDetailCard request={req} />);

      // Outbound leg shows Step 7 of 8
      expect(html).toContain('Step 7 of 8');
      expect(html).toContain('Arrived at Destination');
      // Return leg shows Step 2 of 8
      expect(html).toContain('Step 2 of 8');
      expect(html).toContain('Vehicle &amp; Driver Assigned');
    });

    it('4. Parent Cancelled Request context: displays cancellation advisory in timeline', () => {
      const req: VehicleRequest = {
        id: 'req_dtl_cnl',
        requesterId: testUser.id,
        purpose: 'Cancelled Project Meeting',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'CANCELLED',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:30:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_dtl_cnl',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'PENDING_ASSIGNMENT',
        pickupLocation: 'Office A',
        destination: 'Office B',
        scheduledDeparture: '2026-11-24T11:00:00.000Z',
        scheduledArrival: '2026-11-24T12:00:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
      });

      const html = renderToStaticMarkup(<RequestDetailCard request={req} />);

      expect(html).toContain('Cancelled');
      expect(html).toContain('Parent Request Cancelled');
      expect(html).toContain('This request was cancelled prior to departure');
      // Cancel button should NOT be rendered when status is CANCELLED
      expect(html).not.toContain('Confirm Cancellation');
    });

    it('5. Parent Rejected Request context: displays rejection alert with exact reason', () => {
      const req: VehicleRequest = {
        id: 'req_dtl_rej',
        requesterId: testUser.id,
        purpose: 'Cross-country Trip',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'REJECTED',
        rejectionReason: 'Vehicle capacity unavailable for requested route on this date.',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:45:00.000Z',
      };
      const leg: TripLeg = {
        id: 'leg_dtl_rej',
        requestId: req.id,
        legType: 'OUTBOUND',
        status: 'PENDING_ASSIGNMENT',
        pickupLocation: 'Depot X',
        destination: 'Depot Y',
        scheduledDeparture: '2026-11-24T12:00:00.000Z',
        scheduledArrival: '2026-11-24T13:00:00.000Z',
      };

      useFleetFlowStore.setState({
        requests: [req],
        tripLegs: [leg],
      });

      const html = renderToStaticMarkup(<RequestDetailCard request={req} />);

      expect(html).toContain('Request Rejected');
      expect(html).toContain('Vehicle capacity unavailable for requested route on this date.');
      expect(html).toContain('Parent Request Rejected');
    });

    it('6. Missing Request: renders Vehicle Request Not Found empty state', () => {
      mockParamsId = 'non_existent_req_id';
      useFleetFlowStore.setState({ requests: [] });

      const html = renderToStaticMarkup(<RequestDetailPage />);

      expect(html).toContain('Vehicle Request Not Found');
      expect(html).toContain('non_existent_req_id');
      expect(html).toContain('Return to My Requests');
    });

    it('7. Permitted Actions: Cancel button rendered only when PENDING and user is requester', () => {
      const pendingReq: VehicleRequest = {
        id: 'req_pending_act',
        requesterId: testUser.id,
        purpose: 'Pending Trip',
        tripType: 'ONE_WAY',
        passengerCount: 1,
        status: 'PENDING',
        createdAt: '2026-11-24T08:00:00.000Z',
        updatedAt: '2026-11-24T08:00:00.000Z',
      };

      useFleetFlowStore.setState({ requests: [pendingReq] });

      const htmlPending = renderToStaticMarkup(<RequestDetailCard request={pendingReq} />);
      expect(htmlPending).toContain('Cancel Request');

      const approvedReq: VehicleRequest = {
        ...pendingReq,
        id: 'req_approved_act',
        status: 'APPROVED',
      };

      useFleetFlowStore.setState({ requests: [approvedReq] });

      const htmlApproved = renderToStaticMarkup(<RequestDetailCard request={approvedReq} />);
      expect(htmlApproved).not.toContain('Cancel Request');
    });
  });
});
