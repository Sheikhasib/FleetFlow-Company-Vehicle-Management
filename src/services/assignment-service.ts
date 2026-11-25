import { Assignment, Vehicle, Driver, TripLeg } from '@/types/domain';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { driverRepository } from '@/repositories/mock/mock-driver-repository';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { vehicleRequestRepository } from '@/repositories/mock/mock-vehicle-request-repository';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';
import { notificationRepository } from '@/repositories/mock/mock-notification-repository';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { isActiveTripStatus } from '@/lib/constants/domain';

export interface TimeWindow {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEntity?: 'VEHICLE' | 'DRIVER' | 'BOTH';
  reason?: string;
  conflictingAssignmentId?: string;
}

export class AssignmentService {
  /**
   * Evaluates schedule overlap conflict rule:
   * newStart < existingEnd && newEnd > existingStart
   */
  hasTimeOverlap(windowA: TimeWindow, windowB: TimeWindow): boolean {
    const startA = new Date(windowA.start).getTime();
    const endA = new Date(windowA.end).getTime();
    const startB = new Date(windowB.start).getTime();
    const endB = new Date(windowB.end).getTime();

    return startA < endB && endA > startB;
  }

  async checkAssignmentConflict(
    targetWindow: TimeWindow,
    vehicleId?: string,
    driverId?: string,
    excludeAssignmentId?: string
  ): Promise<ConflictCheckResult> {
    const activeAssignments = (await assignmentRepository.getAll()).filter(
      (a) => a.status === 'ACTIVE' && a.id !== excludeAssignmentId
    );

    const tripLegs = await tripLegRepository.getAll();
    const legMap = new Map<string, TripLeg>(tripLegs.map((l) => [l.id, l]));

    let vehicleConflict = false;
    let driverConflict = false;
    let conflictDetails = '';
    let conflictingAssignmentId: string | undefined;

    for (const assignment of activeAssignments) {
      const leg = legMap.get(assignment.tripLegId);
      if (!leg) continue;

      const existingWindow: TimeWindow = {
        start: leg.scheduledDeparture,
        end: leg.scheduledArrival,
      };

      if (this.hasTimeOverlap(targetWindow, existingWindow)) {
        if (vehicleId && assignment.vehicleId === vehicleId) {
          vehicleConflict = true;
          conflictingAssignmentId = assignment.id;
          conflictDetails += `Vehicle (${vehicleId}) is already assigned to trip leg ${leg.id} between ${leg.scheduledDeparture} and ${leg.scheduledArrival}. `;
        }
        if (driverId && assignment.driverId === driverId) {
          driverConflict = true;
          conflictingAssignmentId = assignment.id;
          conflictDetails += `Driver (${driverId}) is already assigned to trip leg ${leg.id} between ${leg.scheduledDeparture} and ${leg.scheduledArrival}. `;
        }
      }
    }

    if (vehicleConflict && driverConflict) {
      return {
        hasConflict: true,
        conflictingEntity: 'BOTH',
        reason: conflictDetails.trim(),
        conflictingAssignmentId,
      };
    }
    if (vehicleConflict) {
      return {
        hasConflict: true,
        conflictingEntity: 'VEHICLE',
        reason: conflictDetails.trim(),
        conflictingAssignmentId,
      };
    }
    if (driverConflict) {
      return {
        hasConflict: true,
        conflictingEntity: 'DRIVER',
        reason: conflictDetails.trim(),
        conflictingAssignmentId,
      };
    }

    return { hasConflict: false };
  }

  async getAvailableVehicles(
    window: TimeWindow,
    requiredCapacity = 1
  ): Promise<Vehicle[]> {
    const allVehicles = await vehicleRepository.getAll();
    const candidates = allVehicles.filter((v) => v.capacity >= requiredCapacity);

    const available: Vehicle[] = [];
    for (const vehicle of candidates) {
      const check = await this.checkAssignmentConflict(window, vehicle.id, undefined);
      if (!check.hasConflict) {
        available.push(vehicle);
      }
    }
    return available;
  }

  async getAvailableDrivers(window: TimeWindow): Promise<Driver[]> {
    const allDrivers = await driverRepository.getAll();
    const activeDrivers = allDrivers.filter((d) => d.status !== 'OFF_DUTY');

    const available: Driver[] = [];
    for (const driver of activeDrivers) {
      const check = await this.checkAssignmentConflict(window, undefined, driver.id);
      if (!check.hasConflict) {
        available.push(driver);
      }
    }
    return available;
  }

  async createAssignment(
    tripLegId: string,
    vehicleId: string,
    driverId: string,
    adminId: string
  ): Promise<Assignment> {
    const leg = await tripLegRepository.getById(tripLegId);
    if (!leg) {
      throw new Error(`Trip leg not found: ${tripLegId}`);
    }

    const request = await vehicleRequestRepository.getById(leg.requestId);
    if (!request) {
      throw new Error(`Associated request not found: ${leg.requestId}`);
    }

    // Rule 9: Only APPROVED requests can be assigned
    if (request.status !== 'APPROVED' && request.status !== 'ASSIGNED') {
      throw new Error(
        `Assignments can only be created for APPROVED requests. Current status: ${request.status}`
      );
    }

    // Rule 8: Vehicle capacity check
    const vehicle = await vehicleRepository.getById(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle not found: ${vehicleId}`);
    }
    if (vehicle.capacity < request.passengerCount) {
      throw new Error(
        `Selected vehicle capacity (${vehicle.capacity}) is insufficient for ${request.passengerCount} passenger(s).`
      );
    }

    const driver = await driverRepository.getById(driverId);
    if (!driver) {
      throw new Error(`Driver not found: ${driverId}`);
    }
    if (driver.status === 'OFF_DUTY') {
      throw new Error('Selected driver is currently OFF_DUTY.');
    }

    // Rules 10, 11, 12: Overlap conflict check
    const legWindow: TimeWindow = {
      start: leg.scheduledDeparture,
      end: leg.scheduledArrival,
    };
    const conflict = await this.checkAssignmentConflict(legWindow, vehicleId, driverId);
    if (conflict.hasConflict) {
      throw new Error(`Assignment conflict detected: ${conflict.reason}`);
    }

    // Create Assignment
    const assignmentId = `asg_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const assignment: Assignment = {
      id: assignmentId,
      tripLegId,
      vehicleId,
      driverId,
      assignedAt: timestamp,
      status: 'ACTIVE',
    };
    await assignmentRepository.create(assignment);

    // Update TripLeg status to ASSIGNED
    await tripLegRepository.update({
      ...leg,
      status: 'ASSIGNED',
    });

    // Check if ALL legs for this request are assigned.
    // If so, update parent request to ASSIGNED.
    const allLegs = await tripLegRepository.getByRequestId(request.id);
    const allAssigned = allLegs.length > 0 && allLegs.every(
      (l) => l.id === leg.id || l.status !== 'PENDING_ASSIGNMENT'
    );
    if (allAssigned && request.status !== 'ASSIGNED') {
      await vehicleRequestRepository.update({
        ...request,
        status: 'ASSIGNED',
        updatedAt: timestamp,
      });
    }

    // Critical Architecture Rule:
    // Future scheduled assignments must not immediately mark vehicles as IN_USE or drivers as ON_TRIP.
    // Resource states reflect actual current trip lifecycle execution (managed via TripService).
    // Only if the trip leg is already in an active operational lifecycle state should resources be IN_USE / ON_TRIP.
    if (isActiveTripStatus(leg.status)) {
      await vehicleRepository.updateStatus(vehicleId, 'IN_USE');
      await driverRepository.updateStatus(driverId, 'ON_TRIP');
    }

    // Audit Log
    await activityLogRepository.create({
      id: `act_${Date.now()}`,
      requestId: request.id,
      tripLegId,
      actorId: adminId,
      action: 'ASSIGNMENT_CREATED',
      description: `Assigned driver (${driverId}) and vehicle (${vehicle.registrationNumber}) to ${leg.legType.toLowerCase()} leg.`,
      timestamp,
    });

    // Notifications for Driver and Employee
    await notificationRepository.create({
      id: `notif_${Date.now()}_drv`,
      recipientId: driver.userId,
      title: 'New Trip Leg Assignment',
      message: `You have been assigned to trip leg ${leg.id} departing at ${leg.scheduledDeparture}.`,
      read: false,
      createdAt: timestamp,
      link: `/driver/trips/${leg.id}`,
    });

    await notificationRepository.create({
      id: `notif_${Date.now()}_emp`,
      recipientId: request.requesterId,
      title: 'Driver and Vehicle Dispatched',
      message: `Vehicle (${vehicle.model} - ${vehicle.registrationNumber}) has been assigned to your journey.`,
      read: false,
      createdAt: timestamp,
      link: `/employee/requests/${request.id}`,
    });

    return assignment;
  }
}

export const assignmentService = new AssignmentService();
