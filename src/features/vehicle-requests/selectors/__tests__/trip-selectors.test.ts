import { describe, it, expect } from 'vitest';
import {
  VehicleRequest,
  TripLeg,
  Assignment,
  Vehicle,
  Driver,
  User,
  Passenger,
  TripLegStatus,
} from '@/types/domain';
import {
  TRIP_LIFECYCLE_MILESTONES,
  TRIP_LIFECYCLE_STEPS,
  getTripLifecycleMilestone,
} from '../../types/view-models';
import {
  resolveDriverPhone,
  parseReferenceTime,
  selectActiveTrips,
  selectDroppedOffTrips,
  selectUpcomingTrips,
  selectPastUnfinishedTrips,
  selectCompletedTrips,
  selectEmployeeTripOverview,
  selectTripLegTimeline,
  TripSelectorData,
} from '../trip-selectors';

// Fixed reference instant for deterministic evaluation
const REF_TIME_STR = '2026-11-25T12:00:00.000Z';
const REF_TIME_MS = new Date(REF_TIME_STR).getTime();

// Helper to generate ISO relative to REF_TIME
const timeOffset = (hours: number): string =>
  new Date(REF_TIME_MS + hours * 3600 * 1000).toISOString();

/**
 * Deep freeze helper for rigorous immutability testing.
 * Recursively freezes objects and arrays to detect any attempt to mutate inputs.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.keys(obj).forEach((key) => {
    const prop = (obj as any)[key];
    if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  });
  return obj;
}

// Base mock fixtures
const mockUsers: User[] = [
  {
    id: 'usr_emp_01',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@company.com',
    role: 'EMPLOYEE',
    department: 'Engineering',
    phone: '+1-555-0101',
  },
  {
    id: 'usr_drv_01',
    name: 'Marcus Vance',
    email: 'marcus.vance@company.com',
    role: 'DRIVER',
    department: 'Fleet',
    phone: '+1-555-0301',
  },
  {
    id: 'usr_drv_02',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    role: 'DRIVER',
    department: 'Fleet',
    phone: '+1-555-0302',
  },
];

const mockVehicles: Vehicle[] = [
  {
    id: 'veh_01',
    registrationNumber: 'FLT-1010',
    model: 'Ford Transit Passenger Van',
    capacity: 8,
    status: 'AVAILABLE',
  },
];

const mockDrivers: Driver[] = [
  {
    id: 'drv_01',
    userId: 'usr_drv_01',
    phone: '+1-555-0301',
    status: 'AVAILABLE',
  },
  {
    id: 'drv_02',
    userId: 'usr_drv_02',
    phone: '', // Empty: tests fallback to user.phone
    status: 'AVAILABLE',
  },
  {
    id: 'drv_03',
    userId: 'usr_drv_missing',
    phone: 'invalid-phone-string',
    status: 'AVAILABLE',
  },
];

const mockRequests: VehicleRequest[] = [
  {
    id: 'req_001',
    requesterId: 'usr_emp_01',
    tripType: 'ONE_WAY',
    passengerCount: 2,
    purpose: 'Executive Meeting',
    status: 'APPROVED',
    createdAt: timeOffset(-24),
    updatedAt: timeOffset(-24),
  },
  {
    id: 'req_cancelled',
    requesterId: 'usr_emp_01',
    tripType: 'ONE_WAY',
    passengerCount: 1,
    purpose: 'Cancelled Trip',
    status: 'CANCELLED',
    createdAt: timeOffset(-48),
    updatedAt: timeOffset(-12),
  },
  {
    id: 'req_rejected',
    requesterId: 'usr_emp_01',
    tripType: 'ONE_WAY',
    passengerCount: 1,
    purpose: 'Rejected Trip',
    rejectionReason: 'No vehicles available',
    status: 'REJECTED',
    createdAt: timeOffset(-48),
    updatedAt: timeOffset(-12),
  },
];

const mockPassengers: Passenger[] = [
  {
    id: 'pas_01',
    requestId: 'req_001',
    name: 'Alex Rivera',
    department: 'Product',
  },
];

describe('Stage 3, Step 3.2 — Trip Selectors & ViewModels', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Lifecycle Milestone Mapping Integrity
  // ───────────────────────────────────────────────────────────────────────────
  describe('TRIP_LIFECYCLE_MILESTONES', () => {
    it('contains exactly eight valid ordered states with correct step numbers and percentages', () => {
      expect(TRIP_LIFECYCLE_STEPS).toHaveLength(8);

      const expectedSequence: [TripLegStatus, number, number][] = [
        ['PENDING_ASSIGNMENT', 1, 12.5],
        ['ASSIGNED', 2, 25.0],
        ['ACCEPTED', 3, 37.5],
        ['ARRIVED_AT_PICKUP', 4, 50.0],
        ['PICKED_UP', 5, 62.5],
        ['IN_PROGRESS', 6, 75.0],
        ['DROPPED_OFF', 7, 87.5],
        ['COMPLETED', 8, 100.0],
      ];

      expectedSequence.forEach(([status, step, percentage], idx) => {
        const milestone = TRIP_LIFECYCLE_STEPS[idx];
        expect(milestone.status).toBe(status);
        expect(milestone.step).toBe(step);
        expect(milestone.percentage).toBe(percentage);

        // Lookup helper parity
        expect(getTripLifecycleMilestone(status)).toEqual(milestone);
      });

      // Confirm CANCELLED and REJECTED are absent
      expect((TRIP_LIFECYCLE_MILESTONES as any).CANCELLED).toBeUndefined();
      expect((TRIP_LIFECYCLE_MILESTONES as any).REJECTED).toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Driver Phone Resolution & Fallback
  // ───────────────────────────────────────────────────────────────────────────
  describe('resolveDriverPhone', () => {
    it('uses driver.phone as primary contact when present and valid', () => {
      const driver: Driver = {
        id: 'drv_test',
        userId: 'usr_drv_01',
        phone: '+1-555-0999',
        status: 'AVAILABLE',
      };
      const contact = resolveDriverPhone(driver, mockUsers);
      expect(contact).not.toBeNull();
      expect(contact?.displayPhone).toBe('+1-555-0999');
      expect(contact?.telUri).toBe('tel:+15550999');
    });

    it('falls back to linked user.phone when driver.phone is missing or empty whitespace', () => {
      const driverWithEmptyPhone: Driver = {
        id: 'drv_02',
        userId: 'usr_drv_02',
        phone: '   ', // Whitespace-only
        status: 'AVAILABLE',
      };
      const contact = resolveDriverPhone(driverWithEmptyPhone, mockUsers);
      expect(contact).not.toBeNull();
      expect(contact?.displayPhone).toBe('+1-555-0302');
      expect(contact?.telUri).toBe('tel:+15550302');
    });

    it('falls back to linked user.phone when driver.phone contains a malformed value', () => {
      // driver.phone is malformed (e.g. placeholder, non-numeric, or too short)
      const driverWithMalformedPhone: Driver = {
        id: 'drv_malformed',
        userId: 'usr_drv_01', // linked to Marcus Vance with phone '+1-555-0301'
        phone: 'N/A',
        status: 'AVAILABLE',
      };
      const contact1 = resolveDriverPhone(driverWithMalformedPhone, mockUsers);
      expect(contact1).not.toBeNull();
      expect(contact1?.displayPhone).toBe('+1-555-0301');
      expect(contact1?.telUri).toBe('tel:+15550301');

      const driverWithTooShortPhone: Driver = {
        id: 'drv_short',
        userId: 'usr_drv_01',
        phone: '123', // too short (< 7 digits)
        status: 'AVAILABLE',
      };
      const contact2 = resolveDriverPhone(driverWithTooShortPhone, mockUsers);
      expect(contact2).not.toBeNull();
      expect(contact2?.displayPhone).toBe('+1-555-0301');
      expect(contact2?.telUri).toBe('tel:+15550301');
    });

    it('returns null when both driver.phone and linked user.phone are invalid', () => {
      const usersWithBadPhone: User[] = [
        {
          id: 'usr_bad_phone',
          name: 'Bad Phone Driver',
          email: 'bad@example.com',
          role: 'DRIVER',
          department: 'Fleet',
          phone: '123', // invalid
        },
      ];

      const driverWithBadPhone: Driver = {
        id: 'drv_both_invalid',
        userId: 'usr_bad_phone',
        phone: 'NONE', // invalid placeholder
        status: 'AVAILABLE',
      };

      expect(resolveDriverPhone(driverWithBadPhone, usersWithBadPhone)).toBeNull();
    });

    it('returns null when driver.phone is invalid and linked user does not exist', () => {
      const driverOrphan: Driver = {
        id: 'drv_orphan',
        userId: 'non_existent_user',
        phone: 'invalid-phone-string',
        status: 'AVAILABLE',
      };
      expect(resolveDriverPhone(driverOrphan, mockUsers)).toBeNull();
    });

    it('returns null for null or undefined driver', () => {
      expect(resolveDriverPhone(null, mockUsers)).toBeNull();
      expect(resolveDriverPhone(undefined, mockUsers)).toBeNull();
    });

    it('normalizes international E.164 numbers with + prefix into standard RFC 3966 global tel: URI', () => {
      const driverIntl: Driver = {
        id: 'drv_intl',
        userId: 'usr_drv_01',
        phone: '+880 1712-345678', // Bangladesh international format
        status: 'AVAILABLE',
      };
      const contact = resolveDriverPhone(driverIntl, mockUsers);
      expect(contact).not.toBeNull();
      expect(contact?.displayPhone).toBe('+880 1712-345678');
      expect(contact?.telUri).toBe('tel:+8801712345678');
    });

    it('normalizes national/local numbers without + prefix into browser/OS dialer tel: URI', () => {
      const driverLocal: Driver = {
        id: 'drv_local',
        userId: 'usr_drv_01',
        phone: '01712-345678', // National format without country code
        status: 'AVAILABLE',
      };
      const contact = resolveDriverPhone(driverLocal, mockUsers);
      expect(contact).not.toBeNull();
      expect(contact?.displayPhone).toBe('01712-345678');
      expect(contact?.telUri).toBe('tel:01712345678');
    });

    it('handles various structural separators (dots, parentheses, dashes, spaces) correctly', () => {
      const driverUS: Driver = {
        id: 'drv_us',
        userId: 'usr_drv_01',
        phone: '+1 (555) 234-5678',
        status: 'AVAILABLE',
      };
      const contactUS = resolveDriverPhone(driverUS, mockUsers);
      expect(contactUS?.telUri).toBe('tel:+15552345678');

      const driverDots: Driver = {
        id: 'drv_dots',
        userId: 'usr_drv_01',
        phone: '555.234.5678',
        status: 'AVAILABLE',
      };
      const contactDots = resolveDriverPhone(driverDots, mockUsers);
      expect(contactDots?.telUri).toBe('tel:5552345678');
    });

    it('enforces ITU-T E.164 digit boundaries (7 to 15 digits)', () => {
      // 6 digits: too short
      const driver6 = { id: 'd6', userId: 'u', phone: '123456', status: 'AVAILABLE' as const };
      expect(resolveDriverPhone(driver6, mockUsers)).toBeNull();

      // 7 digits: valid boundary
      const driver7 = { id: 'd7', userId: 'u', phone: '1234567', status: 'AVAILABLE' as const };
      expect(resolveDriverPhone(driver7, mockUsers)?.telUri).toBe('tel:1234567');

      // 15 digits: valid boundary
      const driver15 = { id: 'd15', userId: 'u', phone: '+123456789012345', status: 'AVAILABLE' as const };
      expect(resolveDriverPhone(driver15, mockUsers)?.telUri).toBe('tel:+123456789012345');

      // 16 digits: too long
      const driver16 = { id: 'd16', userId: 'u', phone: '+1234567890123456', status: 'AVAILABLE' as const };
      expect(resolveDriverPhone(driver16, mockUsers)).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Active Trips Classification & Multi-Active Prioritization
  // ───────────────────────────────────────────────────────────────────────────
  describe('selectActiveTrips', () => {
    it('classifies each of the four physically active statuses correctly', () => {
      const activeStatuses: TripLegStatus[] = [
        'ACCEPTED',
        'ARRIVED_AT_PICKUP',
        'PICKED_UP',
        'IN_PROGRESS',
      ];

      activeStatuses.forEach((status, idx) => {
        const leg: TripLeg = {
          id: `leg_act_${idx}`,
          requestId: 'req_001',
          legType: 'OUTBOUND',
          pickupLocation: 'HQ',
          destination: 'Plant',
          scheduledDeparture: timeOffset(1),
          scheduledArrival: timeOffset(2),
          status,
        };

        const data: TripSelectorData = {
          requests: mockRequests,
          tripLegs: [leg],
          passengers: mockPassengers,
        };

        const result = selectActiveTrips(data, 'usr_emp_01');
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe(status);
        expect(result[0].isPrimary).toBe(true);
        expect(result[0].colleagues).toEqual(['Alex Rivera']);
      });
    });

    it('excludes DROPPED_OFF from active trips', () => {
      const droppedOffLeg: TripLeg = {
        id: 'leg_dropped',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-1),
        scheduledArrival: timeOffset(0),
        status: 'DROPPED_OFF',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [droppedOffLeg],
      };

      const activeResult = selectActiveTrips(data, 'usr_emp_01');
      expect(activeResult).toHaveLength(0);
    });

    it('returns all multiple active trips without silent drops and deterministically prioritizes primary', () => {
      const legAccepted: TripLeg = {
        id: 'leg_acc',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(1),
        scheduledArrival: timeOffset(2),
        status: 'ACCEPTED',
      };

      const legInProgress: TripLeg = {
        id: 'leg_prog',
        requestId: 'req_001',
        legType: 'RETURN',
        pickupLocation: 'Plant',
        destination: 'HQ',
        scheduledDeparture: timeOffset(3),
        scheduledArrival: timeOffset(4),
        status: 'IN_PROGRESS',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [legAccepted, legInProgress],
      };

      const activeTrips = selectActiveTrips(data, 'usr_emp_01');
      // Both active legs are returned (never discarded)
      expect(activeTrips).toHaveLength(2);

      // IN_PROGRESS takes priority over ACCEPTED as primary
      expect(activeTrips[0].legId).toBe('leg_prog');
      expect(activeTrips[0].status).toBe('IN_PROGRESS');
      expect(activeTrips[0].isPrimary).toBe(true);

      // Secondary leg
      expect(activeTrips[1].legId).toBe('leg_acc');
      expect(activeTrips[1].status).toBe('ACCEPTED');
      expect(activeTrips[1].isPrimary).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Dropped-Off Trips Classification
  // ───────────────────────────────────────────────────────────────────────────
  describe('selectDroppedOffTrips', () => {
    it('includes DROPPED_OFF in its own category with step 7 (87.5%)', () => {
      const droppedLeg: TripLeg = {
        id: 'leg_drop_01',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'Airport',
        destination: 'HQ',
        scheduledDeparture: timeOffset(-2),
        scheduledArrival: timeOffset(-1),
        status: 'DROPPED_OFF',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [droppedLeg],
      };

      const droppedOff = selectDroppedOffTrips(data, 'usr_emp_01');
      expect(droppedOff).toHaveLength(1);
      expect(droppedOff[0].status).toBe('DROPPED_OFF');
      expect(droppedOff[0].stepNumber).toBe(7);
      expect(droppedOff[0].progressPercentage).toBe(87.5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Completed Trips Classification
  // ───────────────────────────────────────────────────────────────────────────
  describe('selectCompletedTrips', () => {
    it('includes COMPLETED only in completed trips with step 8 (100%)', () => {
      const completedLeg: TripLeg = {
        id: 'leg_comp_01',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Airport',
        scheduledDeparture: timeOffset(-10),
        scheduledArrival: timeOffset(-8),
        status: 'COMPLETED',
      };

      const inProgressLeg: TripLeg = {
        id: 'leg_inp',
        requestId: 'req_001',
        legType: 'RETURN',
        pickupLocation: 'Airport',
        destination: 'HQ',
        scheduledDeparture: timeOffset(1),
        scheduledArrival: timeOffset(2),
        status: 'IN_PROGRESS',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [completedLeg, inProgressLeg],
      };

      const completed = selectCompletedTrips(data, 'usr_emp_01');
      expect(completed).toHaveLength(1);
      expect(completed[0].legId).toBe('leg_comp_01');
      expect(completed[0].stepNumber).toBe(8);
      expect(completed[0].progressPercentage).toBe(100.0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Upcoming vs. Past Unfinished Trips
  // ───────────────────────────────────────────────────────────────────────────
  describe('selectUpcomingTrips and selectPastUnfinishedTrips', () => {
    it('upcoming trips use strict scheduledDeparture > referenceTime', () => {
      const futureLeg: TripLeg = {
        id: 'leg_future',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Tech Center',
        scheduledDeparture: timeOffset(2), // 2 hours after REF_TIME
        scheduledArrival: timeOffset(4),
        status: 'ASSIGNED',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [futureLeg],
      };

      const upcoming = selectUpcomingTrips(data, 'usr_emp_01', REF_TIME_STR);
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].legId).toBe('leg_future');
      expect(upcoming[0].status).toBe('ASSIGNED');
      expect(upcoming[0].stepNumber).toBe(2);
    });

    it('a trip departing exactly at referenceTime is past unfinished, not upcoming', () => {
      const exactTimeLeg: TripLeg = {
        id: 'leg_exact',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: REF_TIME_STR, // Exactly at referenceTime
        scheduledArrival: timeOffset(1),
        status: 'PENDING_ASSIGNMENT',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [exactTimeLeg],
      };

      const upcoming = selectUpcomingTrips(data, 'usr_emp_01', REF_TIME_STR);
      expect(upcoming).toHaveLength(0); // Strict > means exact time is NOT upcoming

      const pastUnfinished = selectPastUnfinishedTrips(data, 'usr_emp_01', REF_TIME_STR);
      expect(pastUnfinished).toHaveLength(1);
      expect(pastUnfinished[0].legId).toBe('leg_exact');
    });

    it('past unfinished trips classify elapsed departures correctly', () => {
      const elapsedLeg: TripLeg = {
        id: 'leg_elapsed',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-3), // 3 hours ago
        scheduledArrival: timeOffset(-1),
        status: 'PENDING_ASSIGNMENT',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [elapsedLeg],
      };

      const pastUnfinished = selectPastUnfinishedTrips(data, 'usr_emp_01', REF_TIME_STR);
      expect(pastUnfinished).toHaveLength(1);
      expect(pastUnfinished[0].legId).toBe('leg_elapsed');
      expect(pastUnfinished[0].status).toBe('PENDING_ASSIGNMENT');
      expect(pastUnfinished[0].stepNumber).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Parent Request Status Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Parent Request Status Isolation', () => {
    it('excludes legs belonging to CANCELLED requests from active, dropped-off, upcoming, and past unfinished feeds', () => {
      const activeLegOfCancelled: TripLeg = {
        id: 'leg_canc_act',
        requestId: 'req_cancelled',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(1),
        scheduledArrival: timeOffset(2),
        status: 'IN_PROGRESS',
      };

      const droppedLegOfCancelled: TripLeg = {
        id: 'leg_canc_drop',
        requestId: 'req_cancelled',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-1),
        scheduledArrival: timeOffset(0),
        status: 'DROPPED_OFF',
      };

      const upcomingLegOfCancelled: TripLeg = {
        id: 'leg_canc_upc',
        requestId: 'req_cancelled',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(2),
        scheduledArrival: timeOffset(4),
        status: 'ASSIGNED',
      };

      const pastLegOfCancelled: TripLeg = {
        id: 'leg_canc_past',
        requestId: 'req_cancelled',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-2),
        scheduledArrival: timeOffset(-1),
        status: 'PENDING_ASSIGNMENT',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [activeLegOfCancelled, droppedLegOfCancelled, upcomingLegOfCancelled, pastLegOfCancelled],
      };

      expect(selectActiveTrips(data, 'usr_emp_01')).toHaveLength(0);
      expect(selectDroppedOffTrips(data, 'usr_emp_01')).toHaveLength(0);
      expect(selectUpcomingTrips(data, 'usr_emp_01', REF_TIME_STR)).toHaveLength(0);
      expect(selectPastUnfinishedTrips(data, 'usr_emp_01', REF_TIME_STR)).toHaveLength(0);
    });

    it('excludes legs belonging to REJECTED requests from active, dropped-off, upcoming, and past unfinished feeds', () => {
      const activeLegOfRejected: TripLeg = {
        id: 'leg_rej_act',
        requestId: 'req_rejected',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(1),
        scheduledArrival: timeOffset(2),
        status: 'ACCEPTED',
      };

      const droppedLegOfRejected: TripLeg = {
        id: 'leg_rej_drop',
        requestId: 'req_rejected',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-1),
        scheduledArrival: timeOffset(0),
        status: 'DROPPED_OFF',
      };

      const upcomingLegOfRejected: TripLeg = {
        id: 'leg_rej_upc',
        requestId: 'req_rejected',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(2),
        scheduledArrival: timeOffset(4),
        status: 'PENDING_ASSIGNMENT',
      };

      const pastLegOfRejected: TripLeg = {
        id: 'leg_rej_past',
        requestId: 'req_rejected',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-2),
        scheduledArrival: timeOffset(-1),
        status: 'PENDING_ASSIGNMENT',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [activeLegOfRejected, droppedLegOfRejected, upcomingLegOfRejected, pastLegOfRejected],
      };

      expect(selectActiveTrips(data, 'usr_emp_01')).toHaveLength(0);
      expect(selectDroppedOffTrips(data, 'usr_emp_01')).toHaveLength(0);
      expect(selectUpcomingTrips(data, 'usr_emp_01', REF_TIME_STR)).toHaveLength(0);
      expect(selectPastUnfinishedTrips(data, 'usr_emp_01', REF_TIME_STR)).toHaveLength(0);
    });

    it('excludes completed legs from selectCompletedTrips if the parent request is CANCELLED or REJECTED', () => {
      const completedOfCancelled: TripLeg = {
        id: 'leg_comp_canc',
        requestId: 'req_cancelled',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-5),
        scheduledArrival: timeOffset(-4),
        status: 'COMPLETED',
      };

      const completedOfRejected: TripLeg = {
        id: 'leg_comp_rej',
        requestId: 'req_rejected',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(-6),
        scheduledArrival: timeOffset(-5),
        status: 'COMPLETED',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [completedOfCancelled, completedOfRejected],
      };

      // Selectors defensively isolate completed trips as well
      expect(selectCompletedTrips(data, 'usr_emp_01')).toHaveLength(0);
    });

    it('accurately conveys parent cancellation and rejection context in request detail timeline', () => {
      const cancelledLeg: TripLeg = {
        id: 'leg_canc',
        requestId: 'req_cancelled',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(2),
        scheduledArrival: timeOffset(4),
        status: 'ASSIGNED',
      };

      const rejectedLeg: TripLeg = {
        id: 'leg_rej',
        requestId: 'req_rejected',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: timeOffset(5),
        scheduledArrival: timeOffset(7),
        status: 'PENDING_ASSIGNMENT',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [cancelledLeg, rejectedLeg],
      };

      const timelineCancelled = selectTripLegTimeline(data, 'req_cancelled');
      expect(timelineCancelled).toHaveLength(1);
      expect(timelineCancelled[0].isParentRequestCancelled).toBe(true);
      expect(timelineCancelled[0].isParentRequestRejected).toBe(false);
      // TripLegStatus itself remains valid domain enum (ASSIGNED)
      expect(timelineCancelled[0].status).toBe('ASSIGNED');

      const timelineRejected = selectTripLegTimeline(data, 'req_rejected');
      expect(timelineRejected).toHaveLength(1);
      expect(timelineRejected[0].isParentRequestRejected).toBe(true);
      expect(timelineRejected[0].isParentRequestCancelled).toBe(false);
      expect(timelineRejected[0].status).toBe('PENDING_ASSIGNMENT');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Determinism and Immutability
  // ───────────────────────────────────────────────────────────────────────────
  describe('Determinism and Immutability', () => {
    it('selectors never mutate deeply frozen input entities or arrays', () => {
      const leg1: TripLeg = {
        id: 'leg_z',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant B',
        scheduledDeparture: timeOffset(4),
        scheduledArrival: timeOffset(5),
        status: 'ASSIGNED',
      };

      const leg2: TripLeg = {
        id: 'leg_a',
        requestId: 'req_001',
        legType: 'RETURN',
        pickupLocation: 'Plant B',
        destination: 'HQ',
        scheduledDeparture: timeOffset(1),
        scheduledArrival: timeOffset(2),
        status: 'PENDING_ASSIGNMENT',
      };

      const legActive: TripLeg = {
        id: 'leg_act',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant B',
        scheduledDeparture: timeOffset(0.5),
        scheduledArrival: timeOffset(1.5),
        status: 'IN_PROGRESS',
      };

      const legDrop: TripLeg = {
        id: 'leg_drop',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant B',
        scheduledDeparture: timeOffset(-1),
        scheduledArrival: timeOffset(0),
        status: 'DROPPED_OFF',
      };

      const legComp: TripLeg = {
        id: 'leg_comp',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant B',
        scheduledDeparture: timeOffset(-5),
        scheduledArrival: timeOffset(-4),
        status: 'COMPLETED',
      };

      const rawData: TripSelectorData = {
        requests: [...mockRequests],
        tripLegs: [leg1, leg2, legActive, legDrop, legComp],
        assignments: [
          {
            id: 'asg_01',
            tripLegId: 'leg_act',
            driverId: 'drv_01',
            vehicleId: 'veh_01',
            assignedAt: timeOffset(-2),
            status: 'ACTIVE',
          },
        ],
        vehicles: [...mockVehicles],
        drivers: [...mockDrivers],
        users: [...mockUsers],
        passengers: [...mockPassengers],
      };

      // Rigorously deep-freeze the entire data structure
      const frozenData = deepFreeze(rawData);

      // Running selectors on deep-frozen inputs must not throw any mutation errors
      expect(() => selectActiveTrips(frozenData, 'usr_emp_01')).not.toThrow();
      expect(() => selectDroppedOffTrips(frozenData, 'usr_emp_01')).not.toThrow();
      expect(() => selectUpcomingTrips(frozenData, 'usr_emp_01', REF_TIME_STR)).not.toThrow();
      expect(() => selectPastUnfinishedTrips(frozenData, 'usr_emp_01', REF_TIME_STR)).not.toThrow();
      expect(() => selectCompletedTrips(frozenData, 'usr_emp_01')).not.toThrow();
      expect(() => selectEmployeeTripOverview(frozenData, 'usr_emp_01', REF_TIME_STR)).not.toThrow();
      expect(() => selectTripLegTimeline(frozenData, 'req_001')).not.toThrow();

      // Verify that input arrays remain in their original sequence
      expect(frozenData.tripLegs[0].id).toBe('leg_z');
      expect(frozenData.tripLegs[1].id).toBe('leg_a');
      expect(frozenData.tripLegs[2].id).toBe('leg_act');
      expect(frozenData.tripLegs[3].id).toBe('leg_drop');
      expect(frozenData.tripLegs[4].id).toBe('leg_comp');
    });

    it('results remain deterministic for the same input and reference time', () => {
      const leg: TripLeg = {
        id: 'leg_det',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Tech Center',
        scheduledDeparture: timeOffset(1),
        scheduledArrival: timeOffset(2),
        status: 'IN_PROGRESS',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [leg],
      };

      const run1 = selectEmployeeTripOverview(data, 'usr_emp_01', REF_TIME_STR);
      const run2 = selectEmployeeTripOverview(data, 'usr_emp_01', REF_TIME_STR);

      expect(run1).toEqual(run2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Invalid and Malformed Date Handling
  // ───────────────────────────────────────────────────────────────────────────
  describe('Invalid and Malformed Date Handling', () => {
    it('parseReferenceTime throws descriptive error for invalid ISO strings or Date instances', () => {
      expect(() => parseReferenceTime('not-a-valid-date')).toThrow(
        'Invalid ISO date string provided as referenceTime: "not-a-valid-date"'
      );
      expect(() => parseReferenceTime(new Date('invalid'))).toThrow(
        'Invalid Date object provided as referenceTime'
      );
      expect(() => parseReferenceTime(123456 as any)).toThrow(
        'referenceTime must be an explicit Date instance or ISO date string'
      );
    });

    it('excludes legs with empty, missing, or unparseable scheduledDeparture from upcoming and past unfinished trips', () => {
      const legEmptyDate: TripLeg = {
        id: 'leg_empty_date',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: '', // Empty string
        scheduledArrival: timeOffset(2),
        status: 'PENDING_ASSIGNMENT',
      };

      const legInvalidDate: TripLeg = {
        id: 'leg_invalid_date',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: 'unparseable-date-string', // Malformed ISO
        scheduledArrival: timeOffset(2),
        status: 'ASSIGNED',
      };

      const legWhitespaceDate: TripLeg = {
        id: 'leg_whitespace_date',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: '   ', // Whitespace
        scheduledArrival: timeOffset(2),
        status: 'ASSIGNED',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [legEmptyDate, legInvalidDate, legWhitespaceDate],
      };

      // Must NOT be classified into upcoming (cannot confirm future departure)
      const upcoming = selectUpcomingTrips(data, 'usr_emp_01', REF_TIME_STR);
      expect(upcoming).toHaveLength(0);

      // Must NOT be falsely classified into past unfinished (should not treat invalid as 1970 timestamp)
      const pastUnfinished = selectPastUnfinishedTrips(data, 'usr_emp_01', REF_TIME_STR);
      expect(pastUnfinished).toHaveLength(0);
    });

    it('handles active trips with corrupted departure date without crashing or altering domain status', () => {
      const activeCorruptedDate: TripLeg = {
        id: 'leg_active_corrupted',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        pickupLocation: 'HQ',
        destination: 'Plant',
        scheduledDeparture: 'corrupted-timestamp',
        scheduledArrival: timeOffset(2),
        status: 'IN_PROGRESS',
      };

      const data: TripSelectorData = {
        requests: mockRequests,
        tripLegs: [activeCorruptedDate],
      };

      // Does not throw and accurately preserves domain status
      const active = selectActiveTrips(data, 'usr_emp_01');
      expect(active).toHaveLength(1);
      expect(active[0].status).toBe('IN_PROGRESS');
      expect(active[0].scheduledDeparture).toBe('corrupted-timestamp');
    });
  });
});
