import {
  VehicleRequest,
  TripLeg,
  Passenger,
  TripType,
  RequestStatus,
} from '@/types/domain';
import { vehicleRequestRepository } from '@/repositories/mock/mock-vehicle-request-repository';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';
import { notificationRepository } from '@/repositories/mock/mock-notification-repository';
import { DEFAULT_TRIP_DURATION_HOURS } from '@/lib/constants/domain';

export interface CreateRequestInput {
  requesterId: string;
  tripType: TripType;
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string; // ISO 8601
  returnDeparture?: string;   // ISO 8601 (required for ROUND_TRIP)
  returnPickup?: string;      // Optional override
  returnDestination?: string; // Optional override
  purpose: string;
  notes?: string;
  additionalColleagues?: Array<{
    name: string;
    employeeId?: string;
    department?: string;
  }>;
}

export class RequestService {
  async getRequests(): Promise<VehicleRequest[]> {
    return vehicleRequestRepository.getAll();
  }

  async getRequestById(id: string): Promise<VehicleRequest | null> {
    return vehicleRequestRepository.getById(id);
  }

  async getRequestsByRequester(requesterId: string): Promise<VehicleRequest[]> {
    return vehicleRequestRepository.getByRequesterId(requesterId);
  }

  async createRequest(input: CreateRequestInput): Promise<VehicleRequest> {
    // 1. Validation: Pickup & Destination cannot be identical
    if (input.pickupLocation.trim().toLowerCase() === input.destination.trim().toLowerCase()) {
      throw new Error('Pickup location and destination cannot be identical.');
    }

    // 2. Validation: Scheduled departure cannot be in the past (applied only to new requests per Decision 1)
    const departureDate = new Date(input.scheduledDeparture);
    if (isNaN(departureDate.getTime())) {
      throw new Error('Invalid scheduled departure date/time.');
    }
    const now = new Date();
    if (departureDate.getTime() < now.getTime()) {
      throw new Error('Scheduled departure date/time cannot be in the past.');
    }

    // 3. Validation: Round-trip return departure must follow outbound departure
    if (input.tripType === 'ROUND_TRIP') {
      if (!input.returnDeparture) {
        throw new Error('Return departure date/time is required for round-trip journeys.');
      }
      const returnDate = new Date(input.returnDeparture);
      if (isNaN(returnDate.getTime()) || returnDate.getTime() <= departureDate.getTime()) {
        throw new Error('Return departure date/time must be later than the outbound departure.');
      }
    }

    // 4. Passenger Model Calculation (Decision C)
    const additionalCount = input.additionalColleagues?.length || 0;
    const totalPassengerCount = additionalCount + 1; // Requester + colleagues

    const requestId = `req_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const request: VehicleRequest = {
      id: requestId,
      requesterId: input.requesterId,
      tripType: input.tripType,
      passengerCount: totalPassengerCount,
      purpose: input.purpose.trim(),
      notes: input.notes?.trim() || undefined,
      status: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Create Outbound TripLeg
    const outboundArrival = new Date(
      departureDate.getTime() + DEFAULT_TRIP_DURATION_HOURS * 60 * 60 * 1000
    ).toISOString();

    const outboundLeg: TripLeg = {
      id: `leg_${Date.now()}_out`,
      requestId,
      legType: 'OUTBOUND',
      pickupLocation: input.pickupLocation.trim(),
      destination: input.destination.trim(),
      scheduledDeparture: input.scheduledDeparture,
      scheduledArrival: outboundArrival,
      status: 'PENDING_ASSIGNMENT',
    };
    const tripLegs: TripLeg[] = [outboundLeg];

    // Create Return TripLeg if round-trip
    if (input.tripType === 'ROUND_TRIP' && input.returnDeparture) {
      const returnDepartureDate = new Date(input.returnDeparture);
      const returnArrival = new Date(
        returnDepartureDate.getTime() + DEFAULT_TRIP_DURATION_HOURS * 60 * 60 * 1000
      ).toISOString();

      const returnLeg: TripLeg = {
        id: `leg_${Date.now()}_ret`,
        requestId,
        legType: 'RETURN',
        pickupLocation: input.returnPickup?.trim() || input.destination.trim(),
        destination: input.returnDestination?.trim() || input.pickupLocation.trim(),
        scheduledDeparture: input.returnDeparture,
        scheduledArrival: returnArrival,
        status: 'PENDING_ASSIGNMENT',
      };
      tripLegs.push(returnLeg);
    }

    // Add Passenger records for colleagues
    const passengers: Passenger[] = [];
    if (input.additionalColleagues && input.additionalColleagues.length > 0) {
      input.additionalColleagues.forEach((c, idx) => {
        const passenger: Passenger = {
          id: `pas_${Date.now()}_${idx}`,
          requestId,
          name: c.name.trim(),
          employeeId: c.employeeId?.trim() || undefined,
          department: c.department?.trim() || undefined,
        };
        passengers.push(passenger);
      });
    }

    // Record ActivityLog
    const activityLog = {
      id: `act_${Date.now()}`,
      requestId,
      actorId: input.requesterId,
      action: 'REQUEST_SUBMITTED' as const,
      description: `Submitted a ${input.tripType.toLowerCase()} request for ${totalPassengerCount} passenger(s).`,
      timestamp,
    };

    // Create notification for admin
    const notification = {
      id: `notif_${Date.now()}`,
      recipientId: 'usr_adm_01',
      title: 'New Vehicle Request Submitted',
      message: `A new ${input.tripType.toLowerCase()} request (${requestId}) was submitted for review.`,
      read: false,
      createdAt: timestamp,
      link: `/admin/requests/${requestId}`,
    };

    // Atomic bundle creation via repository
    await vehicleRequestRepository.createWithBundle({
      request,
      tripLegs,
      passengers,
      activityLog,
      notification,
    });

    return request;
  }

  async approveRequest(requestId: string, adminId: string): Promise<VehicleRequest> {
    const request = await vehicleRequestRepository.getById(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Only PENDING requests can be approved. Current status: ${request.status}`);
    }

    const updated: VehicleRequest = {
      ...request,
      status: 'APPROVED',
      updatedAt: new Date().toISOString(),
    };
    await vehicleRequestRepository.update(updated);

    const timestamp = new Date().toISOString();
    await activityLogRepository.create({
      id: `act_${Date.now()}`,
      requestId,
      actorId: adminId,
      action: 'REQUEST_APPROVED',
      description: 'Request reviewed and approved by administrator.',
      timestamp,
    });

    await notificationRepository.create({
      id: `notif_${Date.now()}`,
      recipientId: request.requesterId,
      title: 'Vehicle Request Approved',
      message: `Your request (${requestId}) was approved and is awaiting vehicle/driver dispatch.`,
      read: false,
      createdAt: timestamp,
      link: `/employee/requests/${requestId}`,
    });

    return updated;
  }

  async rejectRequest(
    requestId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<VehicleRequest> {
    const request = await vehicleRequestRepository.getById(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Only PENDING requests can be rejected. Current status: ${request.status}`);
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('A valid rejection reason must be provided.');
    }

    const updated: VehicleRequest = {
      ...request,
      status: 'REJECTED',
      rejectionReason: rejectionReason.trim(),
      updatedAt: new Date().toISOString(),
    };
    await vehicleRequestRepository.update(updated);

    const timestamp = new Date().toISOString();
    await activityLogRepository.create({
      id: `act_${Date.now()}`,
      requestId,
      actorId: adminId,
      action: 'REQUEST_REJECTED',
      description: `Request rejected by administrator. Reason: ${rejectionReason.trim()}`,
      timestamp,
    });

    await notificationRepository.create({
      id: `notif_${Date.now()}`,
      recipientId: request.requesterId,
      title: 'Vehicle Request Rejected',
      message: `Your request (${requestId}) was rejected: ${rejectionReason.trim()}`,
      read: false,
      createdAt: timestamp,
      link: `/employee/requests/${requestId}`,
    });

    return updated;
  }

  async cancelRequest(requestId: string, employeeId: string): Promise<VehicleRequest> {
    const request = await vehicleRequestRepository.getById(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    // Approved Decision B: Cancellation allowed ONLY while PENDING
    if (request.status !== 'PENDING') {
      throw new Error(
        `Requests can only be cancelled while in PENDING status. Current status: ${request.status}`
      );
    }
    if (request.requesterId !== employeeId) {
      throw new Error('Only the original requester can cancel this request.');
    }

    const updated: VehicleRequest = {
      ...request,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };
    await vehicleRequestRepository.update(updated);

    const timestamp = new Date().toISOString();
    await activityLogRepository.create({
      id: `act_${Date.now()}`,
      requestId,
      actorId: employeeId,
      action: 'REQUEST_CANCELLED',
      description: 'Request was cancelled by the requester.',
      timestamp,
    });

    return updated;
  }
}

export const requestService = new RequestService();
