import { LegType, TripLegStatus, Passenger, ActivityLog } from '@/types/domain';

/**
 * Standardized View Model for driver trip cards (used on Dashboard and Trips list).
 */
export interface DriverTripCardViewModel {
  legId: string;
  requestId: string;
  legType: LegType;
  status: TripLegStatus;
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  passengerCount: number;
  requesterName: string;
  requesterDepartment: string;
  requesterPhone?: string;
  purpose: string;
  notes?: string;
  vehicleId: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleCapacity: number;
  driverId: string;
  driverUserId: string;
  driverName: string;
  assignmentId: string;
  assignmentStatus: string;
}

/**
 * Overview statistics and categorized queues for the Driver Dashboard.
 * All categories are mutually exclusive.
 */
export interface DriverDashboardOverview {
  activeTrip: DriverTripCardViewModel | null;
  todayTrips: DriverTripCardViewModel[];
  upcomingTrips: DriverTripCardViewModel[];
  completedTrips: DriverTripCardViewModel[];
  stats: {
    assignedCount: number;
    activeCount: number;
    todayCount: number;
    completedCount: number;
  };
}

/**
 * Detailed View Model for the Driver Trip Execution screen (/driver/trips/[id]).
 */
export interface DriverTripDetailViewModel extends DriverTripCardViewModel {
  passengers: Passenger[];
  activityLogs: ActivityLog[];
  nextAction: DriverNextActionDescriptor | null;
  isCompleted: boolean;
}

/**
 * Next-action descriptor guiding single linear lifecycle progression.
 */
export interface DriverNextActionDescriptor {
  currentStatus: TripLegStatus;
  nextStatus: TripLegStatus;
  buttonLabel: string;
  actionNarrative: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  iconName: 'CheckCircle2' | 'MapPin' | 'Users' | 'Navigation' | 'MapPinCheck' | 'Check';
}

/**
 * Canonical action descriptors for the 6 sequential driver status transitions.
 */
export const DRIVER_NEXT_ACTIONS: Record<
  Exclude<TripLegStatus, 'PENDING_ASSIGNMENT' | 'COMPLETED'>,
  DriverNextActionDescriptor
> = {
  ASSIGNED: {
    currentStatus: 'ASSIGNED',
    nextStatus: 'ACCEPTED',
    buttonLabel: 'Accept Assignment',
    actionNarrative: 'Driver accepted the trip leg assignment.',
    dialogTitle: 'Accept Trip Assignment?',
    dialogDescription:
      'Are you sure you want to accept this dispatch? This confirms your availability for the journey to dispatch.',
    confirmLabel: 'Confirm Acceptance',
    iconName: 'CheckCircle2',
  },
  ACCEPTED: {
    currentStatus: 'ACCEPTED',
    nextStatus: 'ARRIVED_AT_PICKUP',
    buttonLabel: 'Mark Arrived at Pickup',
    actionNarrative: 'Driver marked arrival at the designated pickup location.',
    dialogTitle: 'Confirm Arrival at Pickup?',
    dialogDescription:
      'Have you arrived at the designated pickup address? This notifies the passengers that you are staged outside.',
    confirmLabel: 'Confirm Arrival',
    iconName: 'MapPin',
  },
  ARRIVED_AT_PICKUP: {
    currentStatus: 'ARRIVED_AT_PICKUP',
    nextStatus: 'PICKED_UP',
    buttonLabel: 'Confirm Passenger Pickup',
    actionNarrative: 'Driver confirmed passenger pickup and boarding.',
    dialogTitle: 'Confirm Passenger Boarding?',
    dialogDescription:
      'Have all passengers boarded the vehicle? Verify headcount and safety requirements before proceeding.',
    confirmLabel: 'Confirm Boarding',
    iconName: 'Users',
  },
  PICKED_UP: {
    currentStatus: 'PICKED_UP',
    nextStatus: 'IN_PROGRESS',
    buttonLabel: 'Start Journey',
    actionNarrative: 'Driver started the trip leg journey.',
    dialogTitle: 'Start Journey to Destination?',
    dialogDescription:
      'Are you ready to depart? This sets the vehicle status to in-transit and notifies corporate dispatch.',
    confirmLabel: 'Start Journey',
    iconName: 'Navigation',
  },
  IN_PROGRESS: {
    currentStatus: 'IN_PROGRESS',
    nextStatus: 'DROPPED_OFF',
    buttonLabel: 'Confirm Drop-off',
    actionNarrative: 'Driver arrived at destination and confirmed passenger drop-off.',
    dialogTitle: 'Confirm Passenger Drop-off?',
    dialogDescription:
      'Have you safely arrived at the destination and dropped off all passengers?',
    confirmLabel: 'Confirm Drop-off',
    iconName: 'MapPinCheck',
  },
  DROPPED_OFF: {
    currentStatus: 'DROPPED_OFF',
    nextStatus: 'COMPLETED',
    buttonLabel: 'Complete Trip Leg',
    actionNarrative: 'Driver finalized and completed the trip leg.',
    dialogTitle: 'Finalize & Complete Trip Leg?',
    dialogDescription:
      'Finalize and complete this trip leg? This releases vehicle and driver resources back to available inventory.',
    confirmLabel: 'Complete Trip',
    iconName: 'Check',
  },
};
