import { TripLeg, TripLegStatus, VehicleRequest } from '@/types/domain';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { vehicleRequestRepository } from '@/repositories/mock/mock-vehicle-request-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { driverRepository } from '@/repositories/mock/mock-driver-repository';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';
import { notificationRepository } from '@/repositories/mock/mock-notification-repository';
import { VALID_TRIP_TRANSITIONS, isActiveTripStatus } from '@/lib/constants/domain';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { generateUniqueId } from '@/lib/utils/id';

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
    actorUserId: string,
    nextStatus: TripLegStatus,
    actionName: string,
    actionNarrative: string
  ): Promise<TripLeg> {
    // 1. Resolve TripLeg
    const leg = await tripLegRepository.getById(tripLegId);
    if (!leg) {
      throw new Error(`Trip leg not found: ${tripLegId}`);
    }

    // 2. Validate transition legality
    this.validateTransition(leg.status, nextStatus);

    // 3. Resolve active assignment
    const assignment = await assignmentRepository.getByTripLegId(leg.id);
    if (!assignment || assignment.status !== 'ACTIVE') {
      throw new Error(`No active assignment found for trip leg: ${tripLegId}`);
    }

    // 4. Resolve actor exclusively through an existing User record (User.id === actorUserId)
    const users = useFleetFlowStore.getState().users;
    const user = users.find((u) => u.id === actorUserId);
    if (!user) {
      throw new Error(`Unauthorized: Invalid or unknown actor user ID: ${actorUserId}`);
    }

    // 5. Evaluate role-based authorization
    let resolvedActorId: string;

    if (user.role === 'ADMIN') {
      // Authorized Admin workflow: preserves Phase 4 Admin trip monitoring & advancement
      resolvedActorId = user.id;
    } else if (user.role === 'DRIVER') {
      // Driver workflow: resolve driver profile by Driver.userId === User.id
      const drivers = useFleetFlowStore.getState().drivers;
      const driver = drivers.find((d) => d.userId === user.id);
      if (!driver) {
        throw new Error(
          `Unauthorized: No driver profile found for user ${user.id} (${user.name}).`
        );
      }
      // Require Driver.id === Assignment.driverId
      if (assignment.driverId !== driver.id) {
        throw new Error(
          `Unauthorized: Driver ${driver.id} (${user.name}) is not assigned to trip leg ${tripLegId}. Assigned driver is ${assignment.driverId}.`
        );
      }
      resolvedActorId = user.id;
    } else {
      // Reject EMPLOYEE and any other non-driver/non-admin roles
      throw new Error(
        `Unauthorized: User ${user.id} (${user.name}) with role ${user.role} cannot advance trip status.`
      );
    }

    // All authorization and validation checks passed. Now apply mutations.
    const timestamp = new Date().toISOString();
    const updatedLeg: TripLeg = {
      ...leg,
      status: nextStatus,
    };
    await tripLegRepository.update(updatedLeg);

    // Audit log
    await activityLogRepository.create({
      id: generateUniqueId('act'),
      requestId: leg.requestId,
      tripLegId: leg.id,
      actorId: resolvedActorId,
      action: actionName,
      description: actionNarrative,
      timestamp,
    });

    // Synchronize resource operational states with actual trip lifecycle:
    // When entering an active trip status, mark vehicle as IN_USE and driver as ON_TRIP.
    if (isActiveTripStatus(nextStatus)) {
      await vehicleRepository.updateStatus(assignment.vehicleId, 'IN_USE');
      await driverRepository.updateStatus(assignment.driverId, 'ON_TRIP');
    }

    const request = await vehicleRequestRepository.getById(leg.requestId);
    if (request) {
      // Notify employee
      await notificationRepository.create({
        id: generateUniqueId('notif'),
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

      // Safely release vehicle and driver:
      // Verify resource is not concurrently participating in another legitimate active trip
      const remainingAssignments = await assignmentRepository.getAll();
      const allTripLegs = await tripLegRepository.getAll();
      const legMap = new Map(allTripLegs.map((l) => [l.id, l]));

      const hasOtherActiveVehicleTrip = remainingAssignments.some((a) => {
        if (a.id === assignment.id || a.status !== 'ACTIVE' || a.vehicleId !== assignment.vehicleId) return false;
        const otherLeg = legMap.get(a.tripLegId);
        return otherLeg && isActiveTripStatus(otherLeg.status);
      });

      if (!hasOtherActiveVehicleTrip) {
        await vehicleRepository.updateStatus(assignment.vehicleId, 'AVAILABLE');
      }

      const hasOtherActiveDriverTrip = remainingAssignments.some((a) => {
        if (a.id === assignment.id || a.status !== 'ACTIVE' || a.driverId !== assignment.driverId) return false;
        const otherLeg = legMap.get(a.tripLegId);
        return otherLeg && isActiveTripStatus(otherLeg.status);
      });

      if (!hasOtherActiveDriverTrip) {
        await driverRepository.updateStatus(assignment.driverId, 'AVAILABLE');
      }
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
        id: generateUniqueId('act', 'all_comp'),
        requestId: request.id,
        actorId: 'system',
        action: 'REQUEST_COMPLETED',
        description: 'All required trip legs have completed. Transportation request marked COMPLETED.',
        timestamp,
      });

      await notificationRepository.create({
        id: generateUniqueId('notif', 'comp'),
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
  async acceptTrip(tripLegId: string, actorUserId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      actorUserId,
      'ACCEPTED',
      'TRIP_ACCEPTED',
      'Driver accepted the trip leg assignment.'
    );
  }

  // Driver action 2: Mark arrival at pickup
  async markArrivedAtPickup(tripLegId: string, actorUserId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      actorUserId,
      'ARRIVED_AT_PICKUP',
      'ARRIVED_AT_PICKUP',
      'Driver marked arrival at the designated pickup location.'
    );
  }

  // Driver action 3: Confirm passenger boarding
  async confirmPickup(tripLegId: string, actorUserId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      actorUserId,
      'PICKED_UP',
      'PASSENGERS_PICKED_UP',
      'Driver confirmed passenger pickup and boarding.'
    );
  }

  // Driver action 4: Start transit
  async startTrip(tripLegId: string, actorUserId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      actorUserId,
      'IN_PROGRESS',
      'TRIP_STARTED',
      'Driver started the trip leg journey.'
    );
  }

  // Driver action 5: Confirm dropoff
  async confirmDropoff(tripLegId: string, actorUserId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      actorUserId,
      'DROPPED_OFF',
      'PASSENGERS_DROPPED_OFF',
      'Driver arrived at destination and confirmed passenger drop-off.'
    );
  }

  // Driver action 6: Complete trip leg
  async completeTrip(tripLegId: string, actorUserId: string): Promise<TripLeg> {
    return this.advanceTripStatus(
      tripLegId,
      actorUserId,
      'COMPLETED',
      'TRIP_LEG_COMPLETED',
      'Driver finalized and completed the trip leg.'
    );
  }
}

export const tripService = new TripService();
