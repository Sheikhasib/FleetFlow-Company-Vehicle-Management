import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DriverTripCard } from '../components/driver-trip-card';
import { DriverActiveHero } from '../components/driver-active-hero';
import { DriverMilestoneStepper } from '../components/driver-milestone-stepper';
import { DriverConfirmationDialog } from '../components/driver-confirmation-dialog';
import { DriverTripCardViewModel, DRIVER_NEXT_ACTIONS } from '../types/view-models';

const mockTrip: DriverTripCardViewModel = {
  legId: 'leg_test_1',
  requestId: 'req_001',
  legType: 'OUTBOUND',
  status: 'IN_PROGRESS',
  pickupLocation: 'Corporate Headquarters — Gulshan',
  destination: 'North Assembly Plant — Gazipur',
  scheduledDeparture: '2026-11-25T08:00:00Z',
  scheduledArrival: '2026-11-25T10:00:00Z',
  passengerCount: 4,
  requesterName: 'Nusrat Jahan',
  requesterDepartment: 'Powertrain Engineering',
  requesterPhone: '+880-1711-010101',
  purpose: 'Facility Inspection',
  vehicleId: 'veh_01',
  vehicleModel: 'Ford Transit Passenger Van',
  vehiclePlate: 'FLT-1010',
  vehicleCapacity: 8,
  driverId: 'drv_01',
  driverUserId: 'usr_drv_01',
  driverName: 'Abdul Karim',
  assignmentId: 'asg_001',
  assignmentStatus: 'ACTIVE',
};

describe('Driver UI Components (SSR / Static Rendering)', () => {
  describe('DriverTripCard', () => {
    it('renders trip route, status, requester, and vehicle details', () => {
      const html = renderToStaticMarkup(<DriverTripCard trip={mockTrip} />);

      expect(html).toContain('req_001');
      expect(html).toContain('Outbound');
      expect(html).toContain('Corporate Headquarters — Gulshan');
      expect(html).toContain('North Assembly Plant — Gazipur');
      expect(html).toContain('Nusrat Jahan');
      expect(html).toContain('FLT-1010');
      expect(html).toContain('4 Passengers');
      expect(html).toContain('View Trip Details');
    });

    it('displays active priority badge and styling when isPriorityActive is true', () => {
      const html = renderToStaticMarkup(<DriverTripCard trip={mockTrip} isPriorityActive={true} />);
      expect(html).toContain('Resume Active Trip');
    });

    it('renders Completed badge when trip is COMPLETED', () => {
      const completedTrip: DriverTripCardViewModel = {
        ...mockTrip,
        status: 'COMPLETED',
      };
      const html = renderToStaticMarkup(<DriverTripCard trip={completedTrip} />);
      expect(html).toContain('Completed');
    });
  });

  describe('DriverActiveHero', () => {
    it('renders prominent hero card with next action CTA', () => {
      const html = renderToStaticMarkup(<DriverActiveHero trip={mockTrip} />);

      expect(html).toContain('Active In-Flight Journey');
      expect(html).toContain('Corporate Headquarters — Gulshan');
      expect(html).toContain('North Assembly Plant — Gazipur');
      expect(html).toContain('FLT-1010');
      expect(html).toContain('Open Trip Execution Console');
    });
  });

  describe('DriverMilestoneStepper', () => {
    it('renders all 7 operational driver milestones', () => {
      const html = renderToStaticMarkup(<DriverMilestoneStepper currentStatus="IN_PROGRESS" />);

      // Milestone short labels
      expect(html).toContain('Assigned');
      expect(html).toContain('Accepted');
      expect(html).toContain('At Pickup');
      expect(html).toContain('Boarded');
      expect(html).toContain('In Transit');
      expect(html).toContain('Dropped Off');
      expect(html).toContain('Completed');
    });
  });

  describe('DriverConfirmationDialog', () => {
    it('renders dialog title, description, and action narrative when open', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();
      const actionDescriptor = DRIVER_NEXT_ACTIONS.IN_PROGRESS;

      const html = renderToStaticMarkup(
        <DriverConfirmationDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          actionDescriptor={actionDescriptor}
          isLoading={false}
        />
      );

      expect(html).toContain(actionDescriptor.dialogTitle);
      expect(html).toContain(actionDescriptor.dialogDescription);
      expect(html).toContain(actionDescriptor.confirmLabel);
      expect(html).toContain('Cancel');
    });
  });
});
