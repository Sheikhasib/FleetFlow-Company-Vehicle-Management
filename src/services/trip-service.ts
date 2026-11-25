import { TripLeg, TripLegStatus, VehicleRequest } from '@/types/domain';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { vehicleRequestRepository } from '@/repositories/mock/mock-vehicle-request-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { driverRepository } from '@/repositories/mock/mock-driver-repository';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';
import { notificationRepository } from '@/repositories/mock/mock-notification-repository';
import { VALID_TRIP_TRANSITIONS } from '@/lib/constants/domain';

export class TripService {
  /**
   * Central state-machine validation for trip status advancement.
   * Throws if attempting to skip steps or transition from terminal states.
   */
  validateTransition(currentStatus: TripLegStatus, nextStatus: TripLegStatus): void {
    const allowedNext = VALID_TRIP_TRANSITIONS[currentStatus];
    if (!allowedNext || allowedNext !== nextStatus) {
      throw new Error(
        `Invalid trip status transition from ${currentStatus} to ${nextStatus}. Allowed next status: ${
          allowedNext ?? 'None (Terminal state)'
        }`
      );
    }
  }

  private async advanceTripStatus(
    tripLegId: string,
    driverId: string,
    nextStatus: TripLegStatus,
    actionName: string,
    actionNarrative: string
  ): Promise<TripLeg> {
    const leg = await tripLegRepository.getById(tripLegId);
    if (!leg) {
      throw new Error(`Trip leg not found: ${tripLegId}`);
    }

    this.validateTransition(leg.status, nextStatus);

    const timestamp = new Date().toISOString();
    const updatedLeg: TripLeg = {
      ...leg,
      status: nextStatus,
    };
    await tripLegRepository.update(updatedLeg);

    // Audit log
    await activityLogRepository.create({
      id: `act_${Date.now()}`,
      requestId: leg.requestId,
      tripLegId: leg.id,
      actorId: driverId,
      action: actionName,
      description: actionNarrative,
      timestamp,
    });

    const request = await vehicleRequestRepository.getById(leg.requestId);
    if (request) {
      // Notify employee
      await notificationRepository.create({
        id: `notif_${Date.now()}`,
        recipientId: request.requesterId,
        title: `Trip Update: ${actionName.replace(/_/g, ' ')}`,
        message: actionNarrative,
        read: false,
        createdAt: timestamp,
        link: `/employee/requests/${request.id}`,
      });

      // Special handling on final milestone: COMPLETED
      if (nextStatus === 'COMPLETED') {
        await this.handleTripLegCompletion(leg, request);
      }
    }

    return updatedLeg;
  }

  private async handleTripLegCompletion(
    completedLeg: TripLeg,
    request: VehicleRequest
  ): Promise<void> {
    // 1. Mark corresponding assignment as COMPLETED
    const assignment = await assignmentRepository.getByTripLegId(completedLeg.id);
    if (assignment) {
      await assignmentRepository.update({
        ...assignment,
        status: 'COMPLETED',
      });
      // Free vehicle and driver
      await vehicleRepository.updateStatus(assignment.vehicleId, 'AVAILABLE');
      await driverRepository.updateStatus(assignment.driverId, 'AVAILABLE');
    }

    // 2. Synchronize Parent VehicleRequest status:
    // For a one-way trip, completion of outbound leg completes the request.
    // For a round-trip, BOTH outbound and return legs must reach COMPLETED.
    const allLegs = await tripLegRepository.getByRequestId(request.id);
    const allCompleted = allLegs.every(
      (l) => l.id === completedLeg.id || l.status === 'COMPLETED'
    );

    if (allCompleted && request.status !== 'COMPLETED') {
      const timestamp = new Date().toISOString();
      await vehicleRequestRepository.update({
        ...request,
        status: 'COMPLETED',
        updatedAt: timestamp,
      });

      await activityLogRepository.create({
        id: `act_${Date.now()}_all_comp`,
        requestId: request.id,
        actorId: 'system',
        action: 'REQUEST_COMPLETED',
        description: 'All required trip legs have completed. Transportation request marked COMPLETED.',
        timestamp,
      });

      await notificationRepository.create({
        id: `notif_${Date.now()}_comp`,
        recipientId: request.requesterId,
        title: 'Transportation Request Completed',
        message: `Your transportation request (${request.id}) has been completed in full.`,
        read: false,
        createdAt: timestamp,
        link: `/employee/requests/${request.id}`,
      });
    }
  }

  // Driver action 1: Accept assignment
  async acceptTrip(tripLegId: string, driverId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      driverId,
      'ACCEPTED',
      'TRIP_ACCEPTED',
      'Driver accepted the trip leg assignment.'
    );
  }

  // Driver action 2: Mark arrival at pickup
  async markArrivedAtPickup(tripLegId: string, driverId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      driverId,
      'ARRIVED_AT_PICKUP',
      'ARRIVED_AT_PICKUP',
      'Driver marked arrival at the designated pickup location.'
    );
  }

  // Driver action 3: Confirm passenger boarding
  async confirmPickup(tripLegId: string, driverId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      driverId,
      'PICKED_UP',
      'PASSENGERS_PICKED_UP',
      'Driver confirmed passenger pickup and boarding.'
    );
  }

  // Driver action 4: Start transit
  async startTrip(tripLegId: string, driverId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      driverId,
      'IN_PROGRESS',
      'TRIP_STARTED',
      'Driver started the trip leg journey.'
    );
  }

  // Driver action 5: Confirm dropoff
  async confirmDropoff(tripLegId: string, driverId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      driverId,
      'DROPPED_OFF',
      'PASSENGERS_DROPPED_OFF',
      'Driver arrived at destination and confirmed passenger drop-off.'
    );
  }

  // Driver action 6: Complete trip leg
  async completeTrip(tripLegId: string, driverId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      driverId,
      'COMPLETED',
      'TRIP_LEG_COMPLETED',
      'Driver finalized and completed the trip leg.'
    );
  }
}

export const tripService = new TripService();
