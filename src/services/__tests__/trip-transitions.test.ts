import { describe, it, expect, beforeEach } from "vitest";
import { TripService } from "../trip-service";
import { tripLegRepository } from "@/repositories/mock/mock-trip-leg-repository";
import { vehicleRequestRepository } from "@/repositories/mock/mock-vehicle-request-repository";
import { assignmentRepository } from "@/repositories/mock/mock-assignment-repository";
import { useFleetFlowStore } from "@/stores/fleetflow-store";
import { TripLeg } from "@/types/domain";

describe("TripService — Status Transition & Round-Trip Completion Logic", () => {
  let tripService: TripService;

  beforeEach(() => {
    tripService = new TripService();
    useFleetFlowStore.getState().resetData();
  });

  describe("Sequential State Progression", () => {
    it("executes valid linear lifecycle from ASSIGNED through COMPLETED", async () => {
      // Create a fresh test leg in ASSIGNED status
      const testLeg: TripLeg = {
        id: "leg_test_seq",
        requestId: "req_003",
        legType: "OUTBOUND",
        pickupLocation: "Headquarters",
        destination: "North Plant",
        scheduledDeparture: "2026-11-27T08:00:00Z",
        scheduledArrival: "2026-11-27T10:00:00Z",
        status: "ASSIGNED",
      };
      await tripLegRepository.create(testLeg);

      // Create active assignment for the test leg
      await assignmentRepository.create({
        id: "asg_test_seq",
        tripLegId: "leg_test_seq",
        vehicleId: "veh_02",
        driverId: "drv_01",
        assignedAt: "2026-11-27T07:30:00Z",
        status: "ACTIVE",
      });

      // Step 1: Accept
      const accepted = await tripService.acceptTrip("leg_test_seq", "usr_drv_01");
      expect(accepted.status).toBe("ACCEPTED");

      // Step 2: Arrived at Pickup
      const arrived = await tripService.markArrivedAtPickup(
        "leg_test_seq",
        "usr_drv_01",
      );
      expect(arrived.status).toBe("ARRIVED_AT_PICKUP");

      // Step 3: Confirm Pickup
      const pickedUp = await tripService.confirmPickup(
        "leg_test_seq",
        "usr_drv_01",
      );
      expect(pickedUp.status).toBe("PICKED_UP");

      // Step 4: Start Trip
      const inProgress = await tripService.startTrip("leg_test_seq", "usr_drv_01");
      expect(inProgress.status).toBe("IN_PROGRESS");

      // Step 5: Confirm Drop-off
      const droppedOff = await tripService.confirmDropoff(
        "leg_test_seq",
        "usr_drv_01",
      );
      expect(droppedOff.status).toBe("DROPPED_OFF");

      // Step 6: Complete Trip
      const completed = await tripService.completeTrip(
        "leg_test_seq",
        "usr_drv_01",
      );
      expect(completed.status).toBe("COMPLETED");
    });

    it("rejects skipping directly from ASSIGNED to COMPLETED", async () => {
      const testLeg: TripLeg = {
        id: "leg_test_skip",
        requestId: "req_003",
        legType: "OUTBOUND",
        pickupLocation: "Headquarters",
        destination: "North Plant",
        scheduledDeparture: "2026-11-27T08:00:00Z",
        scheduledArrival: "2026-11-27T10:00:00Z",
        status: "ASSIGNED",
      };
      await tripLegRepository.create(testLeg);

      // Attempting to complete directly from ASSIGNED must fail
      await expect(
        tripService.completeTrip("leg_test_skip", "usr_drv_01"),
      ).rejects.toThrow(
        /Invalid trip status transition from ASSIGNED to COMPLETED/,
      );
    });

    it("rejects starting trip before confirming pickup", async () => {
      const testLeg: TripLeg = {
        id: "leg_test_no_pickup",
        requestId: "req_003",
        legType: "OUTBOUND",
        pickupLocation: "Headquarters",
        destination: "North Plant",
        scheduledDeparture: "2026-11-27T08:00:00Z",
        scheduledArrival: "2026-11-27T10:00:00Z",
        status: "ARRIVED_AT_PICKUP",
      };
      await tripLegRepository.create(testLeg);

      // ARRIVED_AT_PICKUP -> IN_PROGRESS is invalid (must go to PICKED_UP first)
      await expect(
        tripService.startTrip("leg_test_no_pickup", "usr_drv_01"),
      ).rejects.toThrow(
        /Invalid trip status transition from ARRIVED_AT_PICKUP to IN_PROGRESS/,
      );
    });

    it("rejects any further transitions from terminal state COMPLETED", async () => {
      const testLeg: TripLeg = {
        id: "leg_test_terminal",
        requestId: "req_003",
        legType: "OUTBOUND",
        pickupLocation: "Headquarters",
        destination: "North Plant",
        scheduledDeparture: "2026-11-27T08:00:00Z",
        scheduledArrival: "2026-11-27T10:00:00Z",
        status: "COMPLETED",
      };
      await tripLegRepository.create(testLeg);

      await expect(
        tripService.acceptTrip("leg_test_terminal", "usr_drv_01"),
      ).rejects.toThrow(
        /Invalid trip status transition from COMPLETED to ACCEPTED/,
      );
    });
  });

  describe("Round-Trip Parent Request Synchronization", () => {
    it("does not complete parent round-trip request when only outbound leg finishes", async () => {
      // In seed data: req_004 has two legs: leg_004_out (IN_PROGRESS) and leg_004_ret (ASSIGNED)
      const initialRequest = await vehicleRequestRepository.getById("req_004");
      expect(initialRequest?.status).toBe("ASSIGNED");

      // Advance leg_004_out: IN_PROGRESS -> DROPPED_OFF -> COMPLETED
      await tripService.confirmDropoff("leg_004_out", "usr_drv_02");
      await tripService.completeTrip("leg_004_out", "usr_drv_02");

      const outboundLeg = await tripLegRepository.getById("leg_004_out");
      expect(outboundLeg?.status).toBe("COMPLETED");

      // Parent request should still remain ASSIGNED because return leg is not yet completed
      const updatedRequest = await vehicleRequestRepository.getById("req_004");
      expect(updatedRequest?.status).toBe("ASSIGNED");
    });

    it("completes parent round-trip request only after BOTH legs finish", async () => {
      // Complete outbound leg
      await tripService.confirmDropoff("leg_004_out", "usr_drv_02");
      await tripService.completeTrip("leg_004_out", "usr_drv_02");

      // Progress and complete return leg: leg_004_ret (starts ASSIGNED)
      await tripService.acceptTrip("leg_004_ret", "usr_drv_02");
      await tripService.markArrivedAtPickup("leg_004_ret", "usr_drv_02");
      await tripService.confirmPickup("leg_004_ret", "usr_drv_02");
      await tripService.startTrip("leg_004_ret", "usr_drv_02");
      await tripService.confirmDropoff("leg_004_ret", "usr_drv_02");
      await tripService.completeTrip("leg_004_ret", "usr_drv_02");

      const returnLeg = await tripLegRepository.getById("leg_004_ret");
      expect(returnLeg?.status).toBe("COMPLETED");

      // Now parent request must automatically be COMPLETED!
      const finalRequest = await vehicleRequestRepository.getById("req_004");
      expect(finalRequest?.status).toBe("COMPLETED");
    });
  });
});
