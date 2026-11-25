import * as React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfflineIndicatorBanner } from '@/components/shared/offline-indicator-banner';
import { DriverOfflineQueueModal } from '../components/driver-offline-queue-modal';
import { DriverTripCard } from '../components/driver-trip-card';
import { DriverActiveHero } from '../components/driver-active-hero';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { DriverTripCardViewModel } from '../types/view-models';

// Mock useFleetFlowStore to evaluate selectors against current store state in Node SSR
vi.mock('@/stores/fleetflow-store', async () => {
  const actual = await vi.importActual<any>('@/stores/fleetflow-store');
  const store = actual.useFleetFlowStore;
  const useFleetFlowStoreMock = (selector?: any) => {
    return selector ? selector(store.getState()) : store.getState();
  };
  Object.assign(useFleetFlowStoreMock, store);
  return {
    useFleetFlowStore: useFleetFlowStoreMock,
  };
});

const mockTrip: DriverTripCardViewModel = {
  legId: 'leg_offline_ui_test',
  requestId: 'req_001',
  legType: 'OUTBOUND',
  status: 'IN_PROGRESS',
  pickupLocation: 'Corporate Headquarters',
  destination: 'North Assembly Plant',
  scheduledDeparture: '2026-11-25T08:00:00Z',
  scheduledArrival: '2026-11-25T10:00:00Z',
  passengerCount: 3,
  requesterName: 'Nusrat Jahan',
  requesterDepartment: 'Engineering',
  requesterPhone: '+880-1711-010101',
  purpose: 'Facility Inspection',
  vehicleId: 'veh_01',
  vehicleModel: 'Ford Transit',
  vehiclePlate: 'FLT-1010',
  vehicleCapacity: 8,
  driverId: 'drv_01',
  driverUserId: 'usr_drv_01',
  driverName: 'Abdul Karim',
  assignmentId: 'asg_001',
  assignmentStatus: 'ACTIVE',
};

describe('Offline UI Components (SSR / Static Rendering)', () => {
  beforeEach(() => {
    useFleetFlowStore.getState().resetData();
    useFleetFlowStore.setState({ isSimulatedOffline: false, pendingActions: [] });
  });

  describe('OfflineIndicatorBanner', () => {
    it('renders offline warning message when in simulated offline mode', () => {
      useFleetFlowStore.setState({ isSimulatedOffline: true });

      const html = renderToStaticMarkup(<OfflineIndicatorBanner />);
      expect(html).toContain('Working in Offline Mode');
      expect(html).toContain('Exit Demo Offline');
    });

    it('renders queue button when pending actions exist', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_drv_01',
        isSimulatedOffline: false,
        pendingActions: [
          {
            id: 'act_test_queue_1',
            tripLegId: 'leg_offline_ui_test',
            actorUserId: 'usr_drv_01',
            actionType: 'CONFIRM_PICKUP',
            currentStatus: 'ARRIVED_AT_PICKUP',
            targetStatus: 'PICKED_UP',
            queuedAt: '2026-11-25T09:00:00Z',
            status: 'PENDING',
            retryCount: 0,
          },
        ],
      });

      const html = renderToStaticMarkup(<OfflineIndicatorBanner />);
      expect(html).toContain('Queue (1)');
      expect(html).toContain('Sync Now');
    });
  });

  describe('DriverOfflineQueueModal', () => {
    it('renders empty queue message when no pending actions exist', () => {
      const html = renderToStaticMarkup(
        <DriverOfflineQueueModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('Offline Action Queue');
      expect(html).toContain('Queue is Empty');
    });

    it('renders queued action cards with milestone status and leg details', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_drv_01',
        pendingActions: [
          {
            id: 'act_queued_card',
            tripLegId: 'leg_offline_ui_test',
            actorUserId: 'usr_drv_01',
            actionType: 'CONFIRM_PICKUP',
            currentStatus: 'ARRIVED_AT_PICKUP',
            targetStatus: 'PICKED_UP',
            queuedAt: '2026-11-25T09:00:00Z',
            status: 'PENDING',
            retryCount: 0,
          },
        ],
      });

      const html = renderToStaticMarkup(
        <DriverOfflineQueueModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('Passengers Boarded');
      expect(html).toContain('leg_offline_ui_test');
      expect(html).toContain('PENDING');
      expect(html).toContain('Dismiss');
    });

    it('renders error message and retry button when action has failed', () => {
      useFleetFlowStore.setState({
        currentUserId: 'usr_drv_01',
        pendingActions: [
          {
            id: 'act_failed_card',
            tripLegId: 'leg_offline_ui_test',
            actorUserId: 'usr_drv_01',
            actionType: 'START_TRIP',
            currentStatus: 'PICKED_UP',
            targetStatus: 'IN_PROGRESS',
            queuedAt: '2026-11-25T09:00:00Z',
            status: 'FAILED',
            errorMessage: 'Vehicle already in use by concurrent trip',
            retryCount: 1,
          },
        ],
      });

      const html = renderToStaticMarkup(
        <DriverOfflineQueueModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('FAILED');
      expect(html).toContain('Vehicle already in use by concurrent trip');
      expect(html).toContain('Retry');
    });
  });

  describe('DriverTripCard & DriverActiveHero with isPendingSync', () => {
    it('renders Pending Sync badge on DriverTripCard', () => {
      const html = renderToStaticMarkup(
        <DriverTripCard trip={mockTrip} isPendingSync={true} />
      );

      expect(html).toContain('Pending Sync');
    });

    it('renders Pending Sync badge on DriverActiveHero', () => {
      const html = renderToStaticMarkup(
        <DriverActiveHero trip={mockTrip} isPendingSync={true} />
      );

      expect(html).toContain('Pending Sync');
    });
  });
});
