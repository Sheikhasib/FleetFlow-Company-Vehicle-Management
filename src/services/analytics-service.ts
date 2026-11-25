import { RequestStatus, TripType } from '@/types/domain';
import { vehicleRequestRepository } from '@/repositories/mock/mock-vehicle-request-repository';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { isActiveTripStatus } from '@/lib/constants/domain';

export interface DashboardSummary {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  activeTrips: number;
  completedTrips: number;
  availableVehicles: number;
}

export interface MonthlyVolumeItem {
  month: string;      // e.g. 'Nov 2026'
  requestCount: number;
}

export interface DestinationVolumeItem {
  destination: string;
  count: number;
}

export interface TripTypeVolumeItem {
  tripType: TripType;
  label: string;
  count: number;
  percentage: number;
}

export interface DepartmentVolumeItem {
  department: string;
  count: number;
  percentage: number;
}

export class AnalyticsService {
  async getActiveTripCount(): Promise<number> {
    const legs = await tripLegRepository.getAll();
    return legs.filter((l) => isActiveTripStatus(l.status)).length;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const requests = await vehicleRequestRepository.getAll();
    const vehicles = await vehicleRepository.getAll();
    const activeTrips = await this.getActiveTripCount();

    const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(
      (r) => r.status === 'APPROVED' || r.status === 'ASSIGNED'
    ).length;
    const completedTrips = requests.filter((r) => r.status === 'COMPLETED').length;
    const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;

    return {
      totalRequests: requests.length,
      pendingRequests,
      approvedRequests,
      activeTrips,
      completedTrips,
      availableVehicles,
    };
  }

  async getRequestStatusDistribution(): Promise<Record<RequestStatus, number>> {
    const requests = await vehicleRequestRepository.getAll();
    const distribution: Record<RequestStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      ASSIGNED: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };

    requests.forEach((r) => {
      distribution[r.status] = (distribution[r.status] || 0) + 1;
    });

    return distribution;
  }

  async getMonthlyRequestCounts(): Promise<MonthlyVolumeItem[]> {
    const requests = await vehicleRequestRepository.getAll();
    const monthMap: Record<string, number> = {};

    requests.forEach((r) => {
      const date = new Date(r.createdAt);
      if (!isNaN(date.getTime())) {
        const key = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    });

    return Object.entries(monthMap).map(([month, requestCount]) => ({
      month,
      requestCount,
    }));
  }

  async getFrequentlyRequestedDestinations(limit = 5): Promise<DestinationVolumeItem[]> {
    const tripLegs = await tripLegRepository.getAll();
    const destinationMap: Record<string, number> = {};

    tripLegs.forEach((leg) => {
      if (leg.destination) {
        destinationMap[leg.destination] = (destinationMap[leg.destination] || 0) + 1;
      }
    });

    return Object.entries(destinationMap)
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getTripTypeCounts(): Promise<TripTypeVolumeItem[]> {
    const requests = await vehicleRequestRepository.getAll();
    const total = requests.length;
    const oneWayCount = requests.filter((r) => r.tripType === 'ONE_WAY').length;
    const roundTripCount = requests.filter((r) => r.tripType === 'ROUND_TRIP').length;

    return [
      {
        tripType: 'ONE_WAY',
        label: 'One-Way',
        count: oneWayCount,
        percentage: total > 0 ? Math.round((oneWayCount / total) * 100) : 0,
      },
      {
        tripType: 'ROUND_TRIP',
        label: 'Round-Trip',
        count: roundTripCount,
        percentage: total > 0 ? Math.round((roundTripCount / total) * 100) : 0,
      },
    ];
  }

  async getDepartmentDistribution(): Promise<DepartmentVolumeItem[]> {
    const requests = await vehicleRequestRepository.getAll();
    const users = (await import('@/stores/fleetflow-store')).useFleetFlowStore.getState().users;
    const userDeptMap = new Map(users.map((u) => [u.id, u.department]));

    const deptMap: Record<string, number> = {};
    requests.forEach((r) => {
      const dept = userDeptMap.get(r.requesterId) || 'Other';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const total = requests.length;
    return Object.entries(deptMap)
      .map(([department, count]) => ({
        department,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

export const analyticsService = new AnalyticsService();
