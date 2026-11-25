import { RequestStatus } from '@/types/domain';
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
}

export const analyticsService = new AnalyticsService();
