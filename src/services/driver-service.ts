import { Driver, DriverStatus } from '@/types/domain';
import { driverRepository } from '@/repositories/mock/mock-driver-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import { useFleetFlowStore } from '@/stores/fleetflow-store';
import {
  ResourceActiveAssignment,
  selectPrioritizedActiveAssignment,
} from '@/lib/utils/assignment-selection';

export interface DriverDirectoryItem extends Driver {
  name: string;
  email: string;
  department: string;
  activeAssignment?: ResourceActiveAssignment;
}

export interface DriverSummary {
  totalDrivers: number;
  availableDrivers: number;
  onTripDrivers: number;
  offDutyDrivers: number;
}

export class DriverService {
  async getDriverDirectory(): Promise<DriverDirectoryItem[]> {
    const drivers = await driverRepository.getAll();
    const assignments = await assignmentRepository.getAll();
    const legs = await tripLegRepository.getAll();
    const users = useFleetFlowStore.getState().users;

    const userMap = new Map(users.map((u) => [u.id, u]));
    const legMap = new Map(legs.map((l) => [l.id, l]));
    const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE');

    return drivers.map((d) => {
      const user = userMap.get(d.userId);
      const driverActiveAssignments = activeAssignments.filter((a) => a.driverId === d.id);
      const activeAssignment = selectPrioritizedActiveAssignment(driverActiveAssignments, legMap);

      return {
        ...d,
        name: user?.name || `Driver ${d.id}`,
        email: user?.email || '',
        department: user?.department || 'Transportation Services',
        phone: d.phone || user?.phone || '',
        activeAssignment,
      };
    });
  }

  async getDriverSummary(): Promise<DriverSummary> {
    const drivers = await driverRepository.getAll();
    const totalDrivers = drivers.length;
    const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE').length;
    const onTripDrivers = drivers.filter((d) => d.status === 'ON_TRIP').length;
    const offDutyDrivers = drivers.filter((d) => d.status === 'OFF_DUTY').length;

    return {
      totalDrivers,
      availableDrivers,
      onTripDrivers,
      offDutyDrivers,
    };
  }

  filterDrivers(
    drivers: DriverDirectoryItem[],
    statusFilter: string,
    searchQuery: string
  ): DriverDirectoryItem[] {
    const q = searchQuery.toLowerCase().trim();

    return drivers.filter((d) => {
      // Status filter
      if (statusFilter !== 'ALL' && d.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (q) {
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesPhone = d.phone.toLowerCase().includes(q);
        const matchesId = d.id.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesId;
      }

      return true;
    });
  }
}

export const driverService = new DriverService();
