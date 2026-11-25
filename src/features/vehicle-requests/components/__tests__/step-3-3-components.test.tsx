import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ActiveTripViewModel,
  DroppedOffTripViewModel,
  UpcomingTripViewModel,
  PastUnfinishedTripViewModel,
  TripLegTimelineItemViewModel,
  TRIP_LIFECYCLE_STEPS,
} from '../../types/view-models';
import { ActiveTripCard } from '../active-trip-card';
import { SecondaryActiveAlert } from '../secondary-active-alert';
import { DroppedOffTripCard } from '../dropped-off-trip-card';
import { UpcomingTripCard } from '../upcoming-trip-card';
import { PastUnfinishedCard } from '../past-unfinished-card';
import { TripLegTimeline } from '../trip-leg-timeline';

// Base mock models
const mockActiveTrip: ActiveTripViewModel = {
  legId: 'leg_act_01',
  requestId: 'req_001',
  legType: 'OUTBOUND',
  status: 'IN_PROGRESS',
  pickupLocation: 'Corporate HQ — Detroit',
  destination: 'Manufacturing Plant B — Warren',
  scheduledDeparture: '2026-11-25T14:00:00.000Z',
  scheduledArrival: '2026-11-25T15:00:00.000Z',
  purpose: 'Executive Plant Inspection',
  passengerCount: 2,
  colleagues: ['Alex Rivera'],
  assignedResource: {
    driverId: 'drv_01',
    driverName: 'Marcus Vance',
    driverPhone: '+1-555-0301',
    driverTelUri: 'tel:+15550301',
    vehicleId: 'veh_01',
    vehicleModel: 'Ford Transit Passenger Van',
    vehiclePlate: 'FLT-1010',
    vehicleCapacity: 8,
  },
  isPrimary: true,
  stepNumber: 6,
  progressPercentage: 75.0,
};

const mockSecondaryActiveTrip: ActiveTripViewModel = {
  legId: 'leg_act_02',
  requestId: 'req_002',
  legType: 'OUTBOUND',
  status: 'ACCEPTED',
  pickupLocation: 'Airport Terminal 2',
  destination: 'Tech Innovation Center',
  scheduledDeparture: '2026-11-25T16:00:00.000Z',
  scheduledArrival: '2026-11-25T17:00:00.000Z',
  purpose: 'Client Consultation',
  passengerCount: 1,
  colleagues: [],
  assignedResource: {
    driverId: 'drv_02',
    driverName: 'James Wilson',
    driverPhone: '+1-555-0302',
    driverTelUri: 'tel:+15550302',
    vehicleId: 'veh_02',
    vehicleModel: 'Chevrolet Express Van',
    vehiclePlate: 'FLT-2020',
    vehicleCapacity: 6,
  },
  isPrimary: false,
  stepNumber: 3,
  progressPercentage: 37.5,
};

const mockDroppedOffTrip: DroppedOffTripViewModel = {
  legId: 'leg_drop_01',
  requestId: 'req_003',
  legType: 'OUTBOUND',
  status: 'DROPPED_OFF',
  pickupLocation: 'Tech Innovation Center',
  destination: 'Corporate HQ — Detroit',
  scheduledDeparture: '2026-11-25T10:00:00.000Z',
  scheduledArrival: '2026-11-25T11:00:00.000Z',
  purpose: 'Team Debrief',
  passengerCount: 3,
  colleagues: ['Sarah Jenkins', 'David Chen'],
  assignedResource: {
    driverId: 'drv_01',
    driverName: 'Marcus Vance',
    driverPhone: '+1-555-0301',
    driverTelUri: 'tel:+15550301',
    vehicleId: 'veh_01',
    vehicleModel: 'Ford Transit Passenger Van',
    vehiclePlate: 'FLT-1010',
    vehicleCapacity: 8,
  },
  stepNumber: 7,
  progressPercentage: 87.5,
};

const mockUpcomingTripAssigned: UpcomingTripViewModel = {
  legId: 'leg_upc_01',
  requestId: 'req_004',
  legType: 'OUTBOUND',
  status: 'ASSIGNED',
  pickupLocation: 'Corporate HQ — Detroit',
  destination: 'Ann Arbor Facility',
  scheduledDeparture: '2026-11-26T09:00:00.000Z',
  scheduledArrival: '2026-11-26T10:30:00.000Z',
  purpose: 'Regional Symposium',
  passengerCount: 4,
  colleagues: ['Elena Gomez'],
  assignedResource: {
    driverId: 'drv_01',
    driverName: 'Marcus Vance',
    driverPhone: '+1-555-0301',
    driverTelUri: 'tel:+15550301',
    vehicleId: 'veh_01',
    vehicleModel: 'Ford Transit Passenger Van',
    vehiclePlate: 'FLT-1010',
    vehicleCapacity: 8,
  },
  stepNumber: 2,
  progressPercentage: 25.0,
};

const mockUpcomingTripPending: UpcomingTripViewModel = {
  legId: 'leg_upc_02',
  requestId: 'req_005',
  legType: 'OUTBOUND',
  status: 'PENDING_ASSIGNMENT',
  pickupLocation: 'Airport Terminal 1',
  destination: 'Corporate HQ — Detroit',
  scheduledDeparture: '2026-11-27T14:00:00.000Z',
  scheduledArrival: null,
  purpose: 'Visitor Escort',
  passengerCount: 1,
  colleagues: [],
  assignedResource: null,
  stepNumber: 1,
  progressPercentage: 12.5,
};

const mockPastUnfinishedTrip: PastUnfinishedTripViewModel = {
  legId: 'leg_past_01',
  requestId: 'req_006',
  legType: 'OUTBOUND',
  status: 'PENDING_ASSIGNMENT',
  pickupLocation: 'Corporate HQ — Detroit',
  destination: 'Assembly Plant 3',
  scheduledDeparture: '2026-11-25T08:00:00.000Z',
  scheduledArrival: '2026-11-25T09:00:00.000Z',
  purpose: 'Morning Shift Inspection',
  passengerCount: 2,
  colleagues: [],
  assignedResource: null,
  stepNumber: 1,
  progressPercentage: 12.5,
};

describe('Stage 3, Step 3.3 — Active Trip & Itinerary Components', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. ActiveTripCard
  // ───────────────────────────────────────────────────────────────────────────
  describe('ActiveTripCard', () => {
    it('renders primary active trip with status rail, route, and lifecycle stepper', () => {
      const html = renderToStaticMarkup(<ActiveTripCard trip={mockActiveTrip} />);

      // Active status rail class
      expect(html).toContain('status-rail-in-progress');
      // Primary badge
      expect(html).toContain('Active Journey');
      // Outbound badge
      expect(html).toContain('Outbound Journey');
      // Step indicator
      expect(html).toContain('Step 6 of 8');
      // Route endpoints
      expect(html).toContain('Corporate HQ — Detroit');
      expect(html).toContain('Manufacturing Plant B — Warren');
      // Driver details
      expect(html).toContain('Marcus Vance');
      expect(html).toContain('FLT-1010');
      expect(html).toContain('Ford Transit Passenger Van');
      // Tap-to-call link
      expect(html).toContain('href="tel:+15550301"');
      expect(html).toContain('aria-label="Call driver Marcus Vance at +1-555-0301"');
      // Traveling colleagues
      expect(html).toContain('Alex Rivera');
    });

    it('safely handles missing driver contact without broken tel: links', () => {
      const tripNoPhone: ActiveTripViewModel = {
        ...mockActiveTrip,
        assignedResource: {
          ...mockActiveTrip.assignedResource!,
          driverPhone: null,
          driverTelUri: null,
        },
      };

      const html = renderToStaticMarkup(<ActiveTripCard trip={tripNoPhone} />);
      expect(html).not.toContain('href="tel:');
      expect(html).toContain('Contact number unavailable');
    });

    it('safely handles null assignedResource with neutral synchronization notice', () => {
      const tripNoResource: ActiveTripViewModel = {
        ...mockActiveTrip,
        assignedResource: null,
      };

      const html = renderToStaticMarkup(<ActiveTripCard trip={tripNoResource} />);
      expect(html).toContain('Resource details are currently being synchronized with dispatch');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SecondaryActiveAlert
  // ───────────────────────────────────────────────────────────────────────────
  describe('SecondaryActiveAlert', () => {
    it('returns null when secondary trips array is empty', () => {
      const html = renderToStaticMarkup(<SecondaryActiveAlert secondaryTrips={[]} />);
      expect(html).toBe('');
    });

    it('renders informative banner and collapsed preview pills for concurrent journeys', () => {
      const html = renderToStaticMarkup(
        <SecondaryActiveAlert secondaryTrips={[mockSecondaryActiveTrip]} />
      );

      expect(html).toContain('1 Additional Active Trip');
      expect(html).toContain('Concurrent');
      expect(html).toContain('Airport Terminal 2');
      expect(html).toContain('Tech Innovation Center');
      expect(html).toContain('aria-controls="secondary-active-trips-list"');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. DroppedOffTripCard
  // ───────────────────────────────────────────────────────────────────────────
  describe('DroppedOffTripCard', () => {
    it('presents destination reached status and step 7 without active driver call link', () => {
      const html = renderToStaticMarkup(<DroppedOffTripCard trip={mockDroppedOffTrip} />);

      // Status rail and banner
      expect(html).toContain('status-rail-dropped-off');
      expect(html).toContain('Destination Reached');
      expect(html).toContain('Awaiting Administrative Journey Closure');
      expect(html).toContain('Step 7 of 8');
      // Endpoints
      expect(html).toContain('Tech Innovation Center');
      expect(html).toContain('Corporate HQ — Detroit');
      // Driver details present as metadata
      expect(html).toContain('Marcus Vance');
      expect(html).toContain('FLT-1010');
      // Driver call link is deliberately suppressed for arrived passengers
      expect(html).not.toContain('href="tel:');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. UpcomingTripCard
  // ───────────────────────────────────────────────────────────────────────────
  describe('UpcomingTripCard', () => {
    it('renders ASSIGNED future trip with allocated driver, vehicle, and call link', () => {
      const html = renderToStaticMarkup(<UpcomingTripCard trip={mockUpcomingTripAssigned} />);

      expect(html).toContain('Vehicle &amp; Driver Assigned');
      expect(html).toContain('Allocated Resources');
      expect(html).toContain('Marcus Vance');
      expect(html).toContain('FLT-1010');
      expect(html).toContain('href="tel:+15550301"');
      expect(html).toContain('Corporate HQ — Detroit');
      expect(html).toContain('Ann Arbor Facility');
    });

    it('renders PENDING_ASSIGNMENT future trip with neutral awaiting allocation notice', () => {
      const html = renderToStaticMarkup(<UpcomingTripCard trip={mockUpcomingTripPending} />);

      expect(html).toContain('Awaiting Vehicle Allocation');
      expect(html).toContain('The dispatch team will assign a dedicated vehicle and driver');
      expect(html).not.toContain('href="tel:');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PastUnfinishedCard
  // ───────────────────────────────────────────────────────────────────────────
  describe('PastUnfinishedCard', () => {
    it('communicates that scheduled time has passed without fabricating reasons', () => {
      const html = renderToStaticMarkup(<PastUnfinishedCard trip={mockPastUnfinishedTrip} />);

      expect(html).toContain('Scheduled Time Passed');
      expect(html).toContain('Scheduled Departure Was at');
      expect(html).toContain('Corporate HQ — Detroit');
      expect(html).toContain('Assembly Plant 3');
      expect(html).toContain('Awaiting dispatch coordination');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. TripLegTimeline
  // ───────────────────────────────────────────────────────────────────────────
  describe('TripLegTimeline', () => {
    it('renders one-way itinerary correctly', () => {
      const singleLeg: TripLegTimelineItemViewModel = {
        legId: 'leg_one_way',
        requestId: 'req_001',
        legType: 'OUTBOUND',
        status: 'IN_PROGRESS',
        pickupLocation: 'Corporate HQ — Detroit',
        destination: 'Warren Tech Center',
        scheduledDeparture: '2026-11-25T14:00:00.000Z',
        scheduledArrival: '2026-11-25T15:00:00.000Z',
        assignedResource: mockActiveTrip.assignedResource,
        isParentRequestCancelled: false,
        isParentRequestRejected: false,
        stepNumber: 6,
        progressPercentage: 75.0,
      };

      const html = renderToStaticMarkup(<TripLegTimeline legs={[singleLeg]} />);
      expect(html).toContain('One-Way Booking (1 Leg)');
      expect(html).toContain('Outbound Journey');
      expect(html).toContain('Corporate HQ — Detroit');
      expect(html).toContain('Warren Tech Center');
    });

    it('renders round-trip itinerary with distinct Outbound and Return legs', () => {
      const outboundLeg: TripLegTimelineItemViewModel = {
        legId: 'leg_out',
        requestId: 'req_round',
        legType: 'OUTBOUND',
        status: 'COMPLETED',
        pickupLocation: 'Corporate HQ',
        destination: 'Plant B',
        scheduledDeparture: '2026-11-25T08:00:00.000Z',
        scheduledArrival: '2026-11-25T09:00:00.000Z',
        assignedResource: mockActiveTrip.assignedResource,
        isParentRequestCancelled: false,
        isParentRequestRejected: false,
        stepNumber: 8,
        progressPercentage: 100.0,
      };

      const returnLeg: TripLegTimelineItemViewModel = {
        legId: 'leg_ret',
        requestId: 'req_round',
        legType: 'RETURN',
        status: 'ACCEPTED',
        pickupLocation: 'Plant B',
        destination: 'Corporate HQ',
        scheduledDeparture: '2026-11-25T17:00:00.000Z',
        scheduledArrival: '2026-11-25T18:00:00.000Z',
        assignedResource: mockActiveTrip.assignedResource,
        isParentRequestCancelled: false,
        isParentRequestRejected: false,
        stepNumber: 3,
        progressPercentage: 37.5,
      };

      const html = renderToStaticMarkup(<TripLegTimeline legs={[outboundLeg, returnLeg]} />);
      expect(html).toContain('Round-Trip Booking (2 Legs)');
      expect(html).toContain('Outbound Journey (Leg 1 of 2)');
      expect(html).toContain('Return Journey (Leg 2 of 2)');
      expect(html).toContain('leg_out');
      expect(html).toContain('leg_ret');
    });

    it('renders cancellation and rejection context banners without corrupting leg status', () => {
      const cancelledLeg: TripLegTimelineItemViewModel = {
        legId: 'leg_canc',
        requestId: 'req_canc',
        legType: 'OUTBOUND',
        status: 'ASSIGNED',
        pickupLocation: 'Corporate HQ',
        destination: 'Plant B',
        scheduledDeparture: '2026-11-25T12:00:00.000Z',
        scheduledArrival: null,
        assignedResource: null,
        isParentRequestCancelled: true,
        isParentRequestRejected: false,
        stepNumber: 2,
        progressPercentage: 25.0,
      };

      const htmlCancelled = renderToStaticMarkup(<TripLegTimeline legs={[cancelledLeg]} />);
      expect(htmlCancelled).toContain('Parent Request Cancelled');
      expect(htmlCancelled).toContain('Vehicle &amp; Driver Assigned'); // Status is preserved

      const rejectedLeg: TripLegTimelineItemViewModel = {
        legId: 'leg_rej',
        requestId: 'req_rej',
        legType: 'OUTBOUND',
        status: 'PENDING_ASSIGNMENT',
        pickupLocation: 'Corporate HQ',
        destination: 'Plant B',
        scheduledDeparture: '2026-11-25T12:00:00.000Z',
        scheduledArrival: null,
        assignedResource: null,
        isParentRequestCancelled: false,
        isParentRequestRejected: true,
        stepNumber: 1,
        progressPercentage: 12.5,
      };

      const htmlRejected = renderToStaticMarkup(<TripLegTimeline legs={[rejectedLeg]} />);
      expect(htmlRejected).toContain('Parent Request Rejected');
      expect(htmlRejected).toContain('Awaiting Vehicle Allocation'); // Status is preserved
    });
  });
});
