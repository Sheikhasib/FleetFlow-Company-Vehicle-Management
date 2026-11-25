/**
 * FleetFlow — Core Domain Types
 * Based on docs/reference/FleetFlow_Product_UX_Specification_and_Implementation_Blueprint.docx
 * and approved Phase 1 & 2 architectural decisions.
 */

// User and Session Roles
export type UserRole = 'EMPLOYEE' | 'ADMIN' | 'DRIVER';

export interface User {
  id: string;              // e.g., 'usr_emp_01'
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
}

// Physical Vehicle Resource
// Note: Per approved decision 3, MAINTENANCE is removed. Only AVAILABLE and IN_USE are permitted.
export type VehicleStatus = 'AVAILABLE' | 'IN_USE';

export interface Vehicle {
  id: string;              // e.g., 'veh_01'
  registrationNumber: string; // e.g., 'FLT-1010'
  model: string;           // e.g., 'Ford Transit Passenger Van'
  capacity: number;        // Maximum passenger headcount
  status: VehicleStatus;
}

// Driver Resource
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY';

export interface Driver {
  id: string;              // e.g., 'drv_01'
  userId: string;          // Links to User.id
  phone: string;
  status: DriverStatus;
}

// Transportation Demand (Request)
export type TripType = 'ONE_WAY' | 'ROUND_TRIP';

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface VehicleRequest {
  id: string;              // e.g., 'req_001'
  requesterId: string;     // References User.id
  tripType: TripType;
  passengerCount: number;  // Headcount (requester + additional colleagues)
  purpose: string;
  notes?: string;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: string;       // ISO 8601 string
  updatedAt: string;       // ISO 8601 string
}

// Passenger Model
// Note: Per provisional decision C, requester is tracked via requesterId.
// Passenger records represent additional colleagues.
// passengerCount = additionalPassengers.length + 1.
export interface Passenger {
  id: string;              // e.g., 'pas_001'
  requestId: string;       // References VehicleRequest.id
  name: string;
  employeeId?: string;
  department?: string;
}

// Physical Journey Execution (TripLeg)
export type LegType = 'OUTBOUND' | 'RETURN';

// Note: PENDING_ASSIGNMENT is an accepted prototype status indicating approved request awaiting dispatch.
export type TripLegStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_PROGRESS'
  | 'DROPPED_OFF'
  | 'COMPLETED';

export interface TripLeg {
  id: string;              // e.g., 'leg_001_out'
  requestId: string;       // References VehicleRequest.id
  legType: LegType;
  pickupLocation: string;
  destination: string;
  scheduledDeparture: string; // ISO 8601 string
  scheduledArrival: string;   // ISO 8601 string (estimated or specified)
  status: TripLegStatus;
}

// Dispatch Assignment
export interface Assignment {
  id: string;              // e.g., 'asg_001'
  tripLegId: string;       // References TripLeg.id (1:1 per assigned leg)
  vehicleId: string;       // References Vehicle.id
  driverId: string;        // References Driver.id
  assignedAt: string;      // ISO 8601 string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

// Activity Audit Log
export interface ActivityLog {
  id: string;              // e.g., 'act_001'
  requestId: string;       // References VehicleRequest.id
  tripLegId?: string;      // Optional TripLeg.id
  actorId: string;         // References User.id
  action: string;          // Action identifier, e.g., 'REQUEST_CREATED', 'ASSIGNMENT_CREATED'
  description: string;     // Human-readable narrative
  timestamp: string;       // ISO 8601 string
}

// In-App Notification
export interface Notification {
  id: string;              // e.g., 'notif_001'
  recipientId: string;     // References User.id
  title: string;
  message: string;
  read: boolean;
  createdAt: string;       // ISO 8601 string
  link?: string;           // Optional deep link route
}

// Atomic Request Intake Bundle
export interface RequestBundle {
  request: VehicleRequest;
  tripLegs: TripLeg[];
  passengers: Passenger[];
  activityLog: ActivityLog;
  notification: Notification;
}

