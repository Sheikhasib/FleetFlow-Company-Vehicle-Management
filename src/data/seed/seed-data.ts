import {
  User,
  Vehicle,
  Driver,
  VehicleRequest,
  TripLeg,
  Assignment,
  Passenger,
  ActivityLog,
  Notification,
} from "@/types/domain";

export interface SeedData {
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  requests: VehicleRequest[];
  tripLegs: TripLeg[];
  assignments: Assignment[];
  passengers: Passenger[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Helper to compute an ISO 8601 string relative to a base date.
 */
function relDate(base: Date, offsetMs: number): string {
  return new Date(base.getTime() + offsetMs).toISOString();
}

/**
 * Generates relationally consistent seed data with dates relative to `baseDate`.
 * Defaulting `baseDate` to `new Date()` guarantees that whenever the prototype
 * is loaded or reset, demo records reflect fresh, active, and logically coherent dates.
 */
export function getSeedData(baseDate = new Date()): SeedData {
  const hAgo = (h: number) => relDate(baseDate, -h * HOUR_MS);
  const hFromNow = (h: number) => relDate(baseDate, h * HOUR_MS);
  const dAgo = (d: number, extraHours = 0) =>
    relDate(baseDate, -d * DAY_MS + extraHours * HOUR_MS);
  const dFromNow = (d: number, extraHours = 0) =>
    relDate(baseDate, d * DAY_MS + extraHours * HOUR_MS);

  return {
    // 3 Employees, 2 Admins, 3 Drivers
    users: [
      {
        id: "usr_emp_01",
        name: "Nusrat Jahan",
        email: "nusrat.jahan@fleetflow.com",
        role: "EMPLOYEE",
        department: "Powertrain Engineering",
        phone: "+880-1711-010101",
      },
      {
        id: "usr_emp_02",
        name: "Tanvir Ahmed",
        email: "tanvir.ahmed@fleetflow.com",
        role: "EMPLOYEE",
        department: "Supply Chain & Logistics",
        phone: "+880-1711-010202",
      },
      {
        id: "usr_emp_03",
        name: "Farzana Yasmin",
        email: "farzana.yasmin@fleetflow.com",
        role: "EMPLOYEE",
        department: "Quality Assurance",
        phone: "+880-1711-010303",
      },
      {
        id: "usr_adm_01",
        name: "Mohammad Arif Hasan",
        email: "arif.hasan@fleetflow.com",
        role: "ADMIN",
        department: "Corporate Fleet Operations",
        phone: "+880-1711-020101",
      },
      {
        id: "usr_adm_02",
        name: "Syed Kamal Uddin",
        email: "kamal.uddin@fleetflow.com",
        role: "ADMIN",
        department: "Regional Dispatch Administration",
        phone: "+880-1711-020202",
      },
      {
        id: "usr_drv_01",
        name: "Abdul Karim",
        email: "abdul.karim@fleetflow.com",
        role: "DRIVER",
        department: "Transportation Services",
        phone: "+880-1811-030101",
      },
      {
        id: "usr_drv_02",
        name: "Md. Rafiqul Islam",
        email: "rafiqul.islam@fleetflow.com",
        role: "DRIVER",
        department: "Transportation Services",
        phone: "+880-1811-030202",
      },
      {
        id: "usr_drv_03",
        name: "Abdur Rahim",
        email: "abdur.rahim@fleetflow.com",
        role: "DRIVER",
        department: "Transportation Services",
        phone: "+880-1811-030303",
      },
    ],

    // 4 Vehicles (capacities: 8, 4, 12, 4)
    // Per decision 3: only AVAILABLE and IN_USE
    vehicles: [
      {
        id: "veh_01",
        registrationNumber: "FLT-1010",
        model: "Ford Transit Passenger Van",
        capacity: 8,
        status: "IN_USE", // Allocated to active trip req_004
      },
      {
        id: "veh_02",
        registrationNumber: "FLT-2020",
        model: "Toyota Camry Hybrid Sedan",
        capacity: 4,
        status: "IN_USE", // Allocated to active trip leg_006_out
      },
      {
        id: "veh_03",
        registrationNumber: "FLT-3030",
        model: "Mercedes-Benz Sprinter Executive",
        capacity: 12,
        status: "AVAILABLE",
      },
      {
        id: "veh_04",
        registrationNumber: "FLT-4040",
        model: "Honda Accord Hybrid",
        capacity: 4,
        status: "IN_USE", // Allocated to active trip req_005
      },
    ],

    // 3 Drivers
    drivers: [
      {
        id: "drv_01",
        userId: "usr_drv_01",
        phone: "+880-1811-030101",
        status: "ON_TRIP", // Operating active trip leg_006_out
      },
      {
        id: "drv_02",
        userId: "usr_drv_02",
        phone: "+880-1811-030202",
        status: "ON_TRIP", // Operating active trip req_004
      },
      {
        id: "drv_03",
        userId: "usr_drv_03",
        phone: "+880-1811-030303",
        status: "ON_TRIP", // Operating active trip leg_005_out
      },
    ],

    // 10 Requests covering all states (Pending, Approved, Assigned, Completed, Rejected, Cancelled)
    requests: [
      // 1. PENDING (One-way, Nusrat Jahan, 3 passengers, departure in future)
      {
        id: "req_001",
        requesterId: "usr_emp_01",
        tripType: "ONE_WAY",
        passengerCount: 3,
        purpose:
          "Emergency engineering assessment at North Assembly Plant — Gazipur",
        notes: "Carrying calibrated diagnostic equipment in trunk.",
        status: "PENDING",
        createdAt: hAgo(2),
        updatedAt: hAgo(2),
      },
      // 2. APPROVED (Round-trip, Tanvir Ahmed, 5 passengers, departure in future, awaiting dispatch)
      {
        id: "req_002",
        requesterId: "usr_emp_02",
        tripType: "ROUND_TRIP",
        passengerCount: 5,
        purpose:
          "Quarterly supply chain vendor alignment meeting and factory inspection — Narayanganj",
        notes: "Round-trip same day. Need a spacious van.",
        status: "APPROVED",
        createdAt: dAgo(1, 2),
        updatedAt: hAgo(3),
      },
      // 3. ASSIGNED (One-way, Farzana Yasmin, 2 passengers, scheduled future trip)
      {
        id: "req_003",
        requesterId: "usr_emp_03",
        tripType: "ONE_WAY",
        passengerCount: 2,
        purpose: "QA Audit inspection at South Manufacturing Complex — Narayanganj",
        status: "ASSIGNED",
        createdAt: dAgo(2, 4),
        updatedAt: hAgo(4),
      },
      // 4. ASSIGNED (Round-trip, Nusrat Jahan, 4 passengers; Outbound is IN_PROGRESS Active Trip)
      {
        id: "req_004",
        requesterId: "usr_emp_01",
        tripType: "ROUND_TRIP",
        passengerCount: 4,
        purpose: "Inter-facility manufacturing integration workshop — Gazipur",
        status: "ASSIGNED",
        createdAt: dAgo(2, 6),
        updatedAt: hAgo(1),
      },
      // 5. ASSIGNED (One-way, Tanvir Ahmed, 1 passenger; Outbound is ACCEPTED Active Trip)
      {
        id: "req_005",
        requesterId: "usr_emp_02",
        tripType: "ONE_WAY",
        passengerCount: 1,
        purpose: "Executive briefing at Hi-Tech Innovation Center — Kaliakoir",
        status: "ASSIGNED",
        createdAt: hAgo(4),
        updatedAt: hAgo(1),
      },
      // 6. ASSIGNED (Round-trip, Farzana Yasmin, 2 passengers; Outbound is ARRIVED_AT_PICKUP Active Trip)
      {
        id: "req_006",
        requesterId: "usr_emp_03",
        tripType: "ROUND_TRIP",
        passengerCount: 2,
        purpose: "Vendor component delivery verification — Tongi",
        status: "ASSIGNED",
        createdAt: hAgo(5),
        updatedAt: hAgo(0.5),
      },
      // 7. COMPLETED (Historical one-way trip, Nusrat Jahan, 2 passengers, past dates)
      {
        id: "req_007",
        requesterId: "usr_emp_01",
        tripType: "ONE_WAY",
        passengerCount: 2,
        purpose: "Client liaison at Central Distribution Hub — Tongi",
        status: "COMPLETED",
        createdAt: dAgo(8, 2),
        updatedAt: dAgo(8, 7),
      },
      // 8. COMPLETED (Historical round-trip, Tanvir Ahmed, 6 passengers, past dates)
      {
        id: "req_008",
        requesterId: "usr_emp_02",
        tripType: "ROUND_TRIP",
        passengerCount: 6,
        purpose: "Departmental quarterly review and factory tour — Gazipur",
        status: "COMPLETED",
        createdAt: dAgo(15, 2),
        updatedAt: dAgo(15, 11),
      },
      // 9. REJECTED (One-way, Farzana Yasmin, 4 passengers)
      {
        id: "req_009",
        requesterId: "usr_emp_03",
        tripType: "ONE_WAY",
        passengerCount: 4,
        purpose: "Unscheduled offsite supplier quality review — Airport Cargo",
        status: "REJECTED",
        rejectionReason:
          "No multi-passenger vehicles available for requested peak holiday window; please reschedule or consolidate transit.",
        createdAt: dAgo(5, 2),
        updatedAt: dAgo(5, 4),
      },
      // 10. CANCELLED (Round-trip, Nusrat Jahan, cancelled by employee prior to review)
      {
        id: "req_010",
        requesterId: "usr_emp_01",
        tripType: "ROUND_TRIP",
        passengerCount: 2,
        purpose: "Initial site scouting for warehouse expansion — Kaliakoir",
        status: "CANCELLED",
        createdAt: dAgo(4, 2),
        updatedAt: dAgo(4, 3),
      },
    ],

    // Trip legs (One-way has 1, Round-trip has 2)
    tripLegs: [
      // req_001 (PENDING) -> Departure in future (+1 day)
      {
        id: "leg_001_out",
        requestId: "req_001",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "North Assembly Plant — Gazipur Industrial Area",
        scheduledDeparture: dFromNow(1, 9),
        scheduledArrival: dFromNow(1, 11),
        status: "PENDING_ASSIGNMENT",
      },
      // req_002 (APPROVED - awaiting assignment) -> Departures in future (+2 days)
      {
        id: "leg_002_out",
        requestId: "req_002",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "South Manufacturing Complex — Narayanganj BSCIC",
        scheduledDeparture: dFromNow(2, 8.5),
        scheduledArrival: dFromNow(2, 10.5),
        status: "PENDING_ASSIGNMENT",
      },
      {
        id: "leg_002_ret",
        requestId: "req_002",
        legType: "RETURN",
        pickupLocation: "South Manufacturing Complex — Narayanganj BSCIC",
        destination: "Corporate Headquarters — Gulshan, Dhaka",
        scheduledDeparture: dFromNow(2, 16.5),
        scheduledArrival: dFromNow(2, 18.5),
        status: "PENDING_ASSIGNMENT",
      },
      // req_003 (ASSIGNED - scheduled future trip +3 days)
      {
        id: "leg_003_out",
        requestId: "req_003",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "South Manufacturing Complex — Narayanganj BSCIC",
        scheduledDeparture: dFromNow(3, 10),
        scheduledArrival: dFromNow(3, 12),
        status: "ASSIGNED",
      },
      // req_004 (ASSIGNED - Outbound is IN_PROGRESS active trip: started 1h ago, arrives in 1h!)
      {
        id: "leg_004_out",
        requestId: "req_004",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "North Assembly Plant — Gazipur Industrial Area",
        scheduledDeparture: hAgo(1),
        scheduledArrival: hFromNow(1),
        status: "IN_PROGRESS", // ACTIVE TRIP
      },
      {
        id: "leg_004_ret",
        requestId: "req_004",
        legType: "RETURN",
        pickupLocation: "North Assembly Plant — Gazipur Industrial Area",
        destination: "Corporate Headquarters — Gulshan, Dhaka",
        scheduledDeparture: hFromNow(6),
        scheduledArrival: hFromNow(8),
        status: "ASSIGNED",
      },
      // req_005 (ASSIGNED - Outbound is ACCEPTED active trip: departs in 30 mins!)
      {
        id: "leg_005_out",
        requestId: "req_005",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "Hi-Tech Innovation Center — Kaliakoir, Gazipur",
        scheduledDeparture: hFromNow(0.5),
        scheduledArrival: hFromNow(2.5),
        status: "ACCEPTED", // ACTIVE TRIP
      },
      // req_006 (ASSIGNED - Outbound is ARRIVED_AT_PICKUP active trip: driver arrived, waiting at pickup!)
      {
        id: "leg_006_out",
        requestId: "req_006",
        legType: "OUTBOUND",
        pickupLocation: "Central Distribution Hub — Tongi, Gazipur",
        destination: "Corporate Headquarters — Gulshan, Dhaka",
        scheduledDeparture: hFromNow(0.2),
        scheduledArrival: hFromNow(2.2),
        status: "ARRIVED_AT_PICKUP", // ACTIVE TRIP
      },
      {
        id: "leg_006_ret",
        requestId: "req_006",
        legType: "RETURN",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "Central Distribution Hub — Tongi, Gazipur",
        scheduledDeparture: dFromNow(1, 9),
        scheduledArrival: dFromNow(1, 11),
        status: "ASSIGNED",
      },
      // req_007 (COMPLETED historical one-way - past dates -8 days)
      {
        id: "leg_007_out",
        requestId: "req_007",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "Central Distribution Hub — Tongi, Gazipur",
        scheduledDeparture: dAgo(8, 1),
        scheduledArrival: dAgo(8, 3),
        status: "COMPLETED",
      },
      // req_008 (COMPLETED historical round-trip - past dates -15 days)
      {
        id: "leg_008_out",
        requestId: "req_008",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "North Assembly Plant — Gazipur Industrial Area",
        scheduledDeparture: dAgo(15, 1),
        scheduledArrival: dAgo(15, 3),
        status: "COMPLETED",
      },
      {
        id: "leg_008_ret",
        requestId: "req_008",
        legType: "RETURN",
        pickupLocation: "North Assembly Plant — Gazipur Industrial Area",
        destination: "Corporate Headquarters — Gulshan, Dhaka",
        scheduledDeparture: dAgo(15, 7),
        scheduledArrival: dAgo(15, 9),
        status: "COMPLETED",
      },
      // req_009 (REJECTED)
      {
        id: "leg_009_out",
        requestId: "req_009",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "Hazrat Shahjalal International Airport — Cargo Terminal",
        scheduledDeparture: dAgo(4, 7),
        scheduledArrival: dAgo(4, 8.5),
        status: "PENDING_ASSIGNMENT",
      },
      // req_010 (CANCELLED)
      {
        id: "leg_010_out",
        requestId: "req_010",
        legType: "OUTBOUND",
        pickupLocation: "Corporate Headquarters — Gulshan, Dhaka",
        destination: "Hi-Tech Innovation Center — Kaliakoir, Gazipur",
        scheduledDeparture: dAgo(3, 10),
        scheduledArrival: dAgo(3, 12),
        status: "PENDING_ASSIGNMENT",
      },
      {
        id: "leg_010_ret",
        requestId: "req_010",
        legType: "RETURN",
        pickupLocation: "Hi-Tech Innovation Center — Kaliakoir, Gazipur",
        destination: "Corporate Headquarters — Gulshan, Dhaka",
        scheduledDeparture: dAgo(3, 17),
        scheduledArrival: dAgo(3, 19),
        status: "PENDING_ASSIGNMENT",
      },
    ],

    // Assignments for assigned, active, and completed legs
    assignments: [
      {
        id: "asg_003_out",
        tripLegId: "leg_003_out",
        vehicleId: "veh_02",
        driverId: "drv_01",
        assignedAt: hAgo(4),
        status: "ACTIVE",
      },
      {
        id: "asg_004_out",
        tripLegId: "leg_004_out",
        vehicleId: "veh_01",
        driverId: "drv_02",
        assignedAt: hAgo(3),
        status: "ACTIVE",
      },
      {
        id: "asg_004_ret",
        tripLegId: "leg_004_ret",
        vehicleId: "veh_01",
        driverId: "drv_02",
        assignedAt: hAgo(3),
        status: "ACTIVE",
      },
      {
        id: "asg_005_out",
        tripLegId: "leg_005_out",
        vehicleId: "veh_04",
        driverId: "drv_03",
        assignedAt: hAgo(2),
        status: "ACTIVE",
      },
      {
        id: "asg_006_out",
        tripLegId: "leg_006_out",
        vehicleId: "veh_02",
        driverId: "drv_01",
        assignedAt: hAgo(2.5),
        status: "ACTIVE",
      },
      {
        id: "asg_006_ret",
        tripLegId: "leg_006_ret",
        vehicleId: "veh_01",
        driverId: "drv_02",
        assignedAt: hAgo(2.5),
        status: "ACTIVE",
      },
      {
        id: "asg_007_out",
        tripLegId: "leg_007_out",
        vehicleId: "veh_02",
        driverId: "drv_01",
        assignedAt: dAgo(8, 0.5),
        status: "COMPLETED",
      },
      {
        id: "asg_008_out",
        tripLegId: "leg_008_out",
        vehicleId: "veh_03",
        driverId: "drv_02",
        assignedAt: dAgo(16, 2),
        status: "COMPLETED",
      },
      {
        id: "asg_008_ret",
        tripLegId: "leg_008_ret",
        vehicleId: "veh_03",
        driverId: "drv_02",
        assignedAt: dAgo(16, 2),
        status: "COMPLETED",
      },
    ],

    // Additional passengers (colleagues)
    passengers: [
      // req_001 (Nusrat + 2 colleagues = 3)
      {
        id: "pas_001",
        requestId: "req_001",
        name: "Kazi Tariqul Islam",
        employeeId: "EMP-701",
        department: "Powertrain Engineering",
      },
      {
        id: "pas_002",
        requestId: "req_001",
        name: "Sadia Sultana",
        employeeId: "EMP-702",
        department: "Powertrain Engineering",
      },
      // req_002 (Tanvir + 4 colleagues = 5)
      {
        id: "pas_003",
        requestId: "req_002",
        name: "Zubair Hossain",
        employeeId: "EMP-703",
        department: "Logistics",
      },
      {
        id: "pas_004",
        requestId: "req_002",
        name: "Roxana Akhter",
        employeeId: "EMP-704",
        department: "Procurement",
      },
      {
        id: "pas_005",
        requestId: "req_002",
        name: "Anisur Rahman",
        employeeId: "EMP-705",
        department: "Supplier Quality",
      },
      {
        id: "pas_006",
        requestId: "req_002",
        name: "Shafiqul Alam",
        employeeId: "EMP-706",
        department: "Data Systems",
      },
      // req_003 (Farzana + 1 colleague = 2)
      {
        id: "pas_007",
        requestId: "req_003",
        name: "Tasnim Ferdous",
        employeeId: "EMP-707",
        department: "Quality Assurance",
      },
      // req_004 (Nusrat + 3 colleagues = 4)
      {
        id: "pas_008",
        requestId: "req_004",
        name: "Mahmudur Rahman",
        employeeId: "EMP-708",
        department: "Embedded Software",
      },
      {
        id: "pas_009",
        requestId: "req_004",
        name: "Nabila Zerin",
        employeeId: "EMP-709",
        department: "Hardware Systems",
      },
      {
        id: "pas_010",
        requestId: "req_004",
        name: "Imtiaz Hossain",
        employeeId: "EMP-710",
        department: "Telematics",
      },
      // req_006 (Farzana + 1 colleague = 2)
      {
        id: "pas_011",
        requestId: "req_006",
        name: "Mehnaz Parveen",
        employeeId: "EMP-711",
        department: "Quality Assurance",
      },
      // req_007 (Nusrat + 1 colleague = 2)
      {
        id: "pas_012",
        requestId: "req_007",
        name: "Sharmin Akter",
        employeeId: "EMP-712",
        department: "Calculations",
      },
      // req_008 (Tanvir + 5 colleagues = 6)
      {
        id: "pas_013",
        requestId: "req_008",
        name: "Shirin Shila",
        employeeId: "EMP-713",
        department: "Operations",
      },
      {
        id: "pas_014",
        requestId: "req_008",
        name: "Tahmina Begum",
        employeeId: "EMP-714",
        department: "Operations",
      },
      {
        id: "pas_015",
        requestId: "req_008",
        name: "Monirul Haque",
        employeeId: "EMP-715",
        department: "Field Ops",
      },
      {
        id: "pas_016",
        requestId: "req_008",
        name: "Ashraful Islam",
        employeeId: "EMP-716",
        department: "Field Ops",
      },
      {
        id: "pas_017",
        requestId: "req_008",
        name: "Golam Mostafa",
        employeeId: "EMP-717",
        department: "Field Ops",
      },
      // req_009 (Farzana + 3 colleagues = 4)
      {
        id: "pas_018",
        requestId: "req_009",
        name: "Sabbir Hossain",
        employeeId: "EMP-718",
        department: "Flight Testing",
      },
      {
        id: "pas_019",
        requestId: "req_009",
        name: "Rezaul Karim",
        employeeId: "EMP-719",
        department: "Flight Control",
      },
      {
        id: "pas_020",
        requestId: "req_009",
        name: "Nazmul Huda",
        employeeId: "EMP-720",
        department: "Flight Control",
      },
      // req_010 (Nusrat + 1 colleague = 2)
      {
        id: "pas_021",
        requestId: "req_010",
        name: "Farhana Haque",
        employeeId: "EMP-721",
        department: "Engineering",
      },
    ],

    // Activity audit logs
    activityLogs: [
      {
        id: "act_001",
        requestId: "req_001",
        actorId: "usr_emp_01",
        action: "REQUEST_SUBMITTED",
        description:
          "Nusrat Jahan submitted a one-way vehicle request for 3 passengers.",
        timestamp: hAgo(2),
      },
      {
        id: "act_002",
        requestId: "req_002",
        actorId: "usr_emp_02",
        action: "REQUEST_SUBMITTED",
        description:
          "Tanvir Ahmed submitted a round-trip vehicle request for 5 passengers.",
        timestamp: dAgo(1, 2),
      },
      {
        id: "act_003",
        requestId: "req_002",
        actorId: "usr_adm_01",
        action: "REQUEST_APPROVED",
        description:
          "Mohammad Arif Hasan reviewed and approved the transportation request.",
        timestamp: hAgo(3),
      },
      {
        id: "act_004",
        requestId: "req_003",
        actorId: "usr_adm_01",
        action: "ASSIGNMENT_DISPATCHED",
        description:
          "Mohammad Arif Hasan assigned Abdul Karim with Toyota Camry (FLT-2020) to outbound leg.",
        timestamp: hAgo(4),
      },
      {
        id: "act_005",
        requestId: "req_004",
        tripLegId: "leg_004_out",
        actorId: "usr_drv_02",
        action: "TRIP_STARTED",
        description:
          "Md. Rafiqul Islam departed from Corporate Headquarters with 4 passengers.",
        timestamp: hAgo(0.9),
      },
      {
        id: "act_006",
        requestId: "req_009",
        actorId: "usr_adm_02",
        action: "REQUEST_REJECTED",
        description:
          "Syed Kamal Uddin rejected the request: No multi-passenger vehicles available for requested peak holiday window.",
        timestamp: dAgo(5, 4),
      },
      {
        id: "act_007",
        requestId: "req_010",
        actorId: "usr_emp_01",
        action: "REQUEST_CANCELLED",
        description:
          "Nusrat Jahan cancelled the request before administrative review.",
        timestamp: dAgo(4, 3),
      },
    ],

    // In-app notifications
    notifications: [
      {
        id: "notif_001",
        recipientId: "usr_adm_01",
        title: "New Vehicle Request Submitted",
        message:
          "Nusrat Jahan submitted a request (req_001) for travel to North Assembly Plant.",
        read: false,
        createdAt: hAgo(2),
        link: "/admin/requests/req_001",
      },
      {
        id: "notif_002",
        recipientId: "usr_emp_02",
        title: "Vehicle Request Approved",
        message:
          "Your round-trip request (req_002) has been approved and is queued for driver assignment.",
        read: false,
        createdAt: hAgo(3),
        link: "/employee/requests/req_002",
      },
      {
        id: "notif_003",
        recipientId: "usr_drv_01",
        title: "New Trip Assignment",
        message:
          "You have been assigned to trip leg (leg_003_out) scheduled for upcoming departure.",
        read: false,
        createdAt: hAgo(4),
        link: "/driver/trips/leg_003_out",
      },
      {
        id: "notif_004",
        recipientId: "usr_emp_01",
        title: "Driver En Route",
        message:
          "Md. Rafiqul Islam has begun transit for your journey to North Assembly Plant.",
        read: true,
        createdAt: hAgo(0.9),
        link: "/employee/requests/req_004",
      },
      {
        id: "notif_005",
        recipientId: "usr_emp_03",
        title: "Vehicle Request Rejected",
        message:
          "Your request (req_009) could not be accommodated due to vehicle unavailability.",
        read: true,
        createdAt: dAgo(5, 4),
        link: "/employee/requests/req_009",
      },
    ],
  };
}

export const initialSeedData: SeedData = getSeedData();
