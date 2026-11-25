import { describe, it, expect, beforeEach } from 'vitest';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import { vehicleService } from '@/services/vehicle-service';
import { driverService } from '@/services/driver-service';
import { analyticsService } from '@/services/analytics-service';

describe('Phase 4 Admin Services Unit Tests', () => {
  beforeEach(() => {
    useFleetFlowStore.getState().resetData();
  });

  describe('VehicleService', () => {
    it('returns all vehicles in directory with accurate active assignments', async () => {
      const items = await vehicleService.getVehicleDirectory();
      expect(items.length).toBe(4);

      // Verify known vehicles
      const veh01 = items.find((v) => v.id === 'veh_01');
      expect(veh01).toBeDefined();
      expect(veh01?.model).toBe('Ford Transit Passenger Van');
      expect(veh01?.status).toBe('IN_USE');
      expect(veh01?.activeAssignment).toBeDefined();

      const veh03 = items.find((v) => v.id === 'veh_03');
      expect(veh03).toBeDefined();
      expect(veh03?.model).toBe('Mercedes-Benz Sprinter Executive');
      expect(veh03?.status).toBe('AVAILABLE');
      expect(veh03?.activeAssignment).toBeUndefined();
    });

    it('computes accurate vehicle summary metrics', async () => {
      const summary = await vehicleService.getVehicleSummary();
      expect(summary.totalVehicles).toBe(4);
      expect(summary.availableVehicles).toBe(1);
      expect(summary.inUseVehicles).toBe(3);
      expect(summary.totalCapacity).toBe(8 + 4 + 12 + 4); // 28
    });

    it('filters vehicles correctly by status and search query', async () => {
      const items = await vehicleService.getVehicleDirectory();

      // Filter AVAILABLE
      const available = vehicleService.filterVehicles(items, 'AVAILABLE', '');
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('veh_03');

      // Filter IN_USE
      const inUse = vehicleService.filterVehicles(items, 'IN_USE', '');
      expect(inUse.length).toBe(3);

      // Search by model
      const camry = vehicleService.filterVehicles(items, 'ALL', 'Camry');
      expect(camry.length).toBe(1);
      expect(camry[0].registrationNumber).toBe('FLT-2020');

      // Search by registration
      const flt1010 = vehicleService.filterVehicles(items, 'ALL', 'FLT-1010');
      expect(flt1010.length).toBe(1);
      expect(flt1010[0].id).toBe('veh_01');

      // Search with no match
      const none = vehicleService.filterVehicles(items, 'ALL', 'NonExistent');
      expect(none.length).toBe(0);
    });
  });

  describe('DriverService', () => {
    it('returns all drivers enriched with user details and assignments', async () => {
      const items = await driverService.getDriverDirectory();
      expect(items.length).toBe(3);

      const drv01 = items.find((d) => d.id === 'drv_01');
      expect(drv01).toBeDefined();
      expect(drv01?.name).toBe('Abdul Karim');
      expect(drv01?.status).toBe('ON_TRIP');
      expect(drv01?.phone).toContain('1811-030101');
      expect(drv01?.activeAssignment).toBeDefined();

      const drv03 = items.find((d) => d.id === 'drv_03');
      expect(drv03).toBeDefined();
      expect(drv03?.name).toBe('Abdur Rahim');
      expect(drv03?.status).toBe('ON_TRIP');
      expect(drv03?.activeAssignment).toBeDefined();
    });

    it('computes accurate driver summary metrics based on seed data', async () => {
      const summary = await driverService.getDriverSummary();
      expect(summary.totalDrivers).toBe(3);
      expect(summary.availableDrivers).toBe(0);
      expect(summary.onTripDrivers).toBe(3);
      expect(summary.offDutyDrivers).toBe(0);
    });

    it('filters drivers correctly by status and search query', async () => {
      const items = await driverService.getDriverDirectory();

      // Filter ON_TRIP
      const onTrip = driverService.filterDrivers(items, 'ON_TRIP', '');
      expect(onTrip.length).toBe(3);

      // Filter AVAILABLE (none in seed)
      const available = driverService.filterDrivers(items, 'AVAILABLE', '');
      expect(available.length).toBe(0);

      // Search by name
      const rafiq = driverService.filterDrivers(items, 'ALL', 'Rafiqul');
      expect(rafiq.length).toBe(1);
      expect(rafiq[0].id).toBe('drv_02');

      // Search by phone
      const phoneMatch = driverService.filterDrivers(items, 'ALL', '030303');
      expect(phoneMatch.length).toBe(1);
      expect(phoneMatch[0].id).toBe('drv_03');
    });
  });

  describe('AnalyticsService', () => {
    it('returns comprehensive dashboard summary', async () => {
      const summary = await analyticsService.getDashboardSummary();
      expect(summary.totalRequests).toBeGreaterThanOrEqual(5);
      expect(summary.pendingRequests).toBeGreaterThanOrEqual(1);
      expect(summary.availableVehicles).toBe(1);
      expect(summary.activeTrips).toBeGreaterThanOrEqual(1);
    });

    it('returns request status distribution matching total requests', async () => {
      const dist = await analyticsService.getRequestStatusDistribution();
      const requests = useFleetFlowStore.getState().requests;
      const sum = Object.values(dist).reduce((acc, curr) => acc + curr, 0);
      expect(sum).toBe(requests.length);
      expect(dist.PENDING).toBeGreaterThanOrEqual(1);
    });

    it('returns monthly volume items with valid counts', async () => {
      const monthly = await analyticsService.getMonthlyRequestCounts();
      expect(monthly.length).toBeGreaterThan(0);
      const totalVolume = monthly.reduce((acc, curr) => acc + curr.requestCount, 0);
      expect(totalVolume).toBe(useFleetFlowStore.getState().requests.length);
    });

    it('returns frequently requested destinations sorted by frequency', async () => {
      const destinations = await analyticsService.getFrequentlyRequestedDestinations(5);
      expect(destinations.length).toBeGreaterThan(0);
      // Check descending order
      for (let i = 0; i < destinations.length - 1; i++) {
        expect(destinations[i].count).toBeGreaterThanOrEqual(destinations[i + 1].count);
      }
    });

    it('returns trip type distribution with valid percentages summing to 100', async () => {
      const tripTypes = await analyticsService.getTripTypeCounts();
      expect(tripTypes.length).toBe(2);
      const totalPct = tripTypes.reduce((acc, curr) => acc + curr.percentage, 0);
      expect(totalPct).toBeGreaterThanOrEqual(99);
      expect(totalPct).toBeLessThanOrEqual(101);
    });

    it('returns departmental distribution grouped by requester department', async () => {
      const depts = await analyticsService.getDepartmentDistribution();
      expect(depts.length).toBeGreaterThan(0);
      const totalRequests = depts.reduce((acc, curr) => acc + curr.count, 0);
      expect(totalRequests).toBe(useFleetFlowStore.getState().requests.length);
    });
  });
});
