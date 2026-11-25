import { Vehicle, VehicleStatus } from '@/types/domain';
import { vehicleRepository } from '@/repositories/mock/mock-vehicle-repository';
import { assignmentRepository } from '@/repositories/mock/mock-assignment-repository';
import { tripLegRepository } from '@/repositories/mock/mock-trip-leg-repository';
import {
  ResourceActiveAssignment,
  selectPrioritizedActiveAssignment,
} from '@/lib/utils/assignment-selection';

export interface VehicleDirectoryItem extends Vehicle {
  activeAssignment?: ResourceActiveAssignment;
}

export interface VehicleSummary {
  totalVehicles: number;
  availableVehicles: number;
  inUseVehicles: number;
  totalCapacity: number;
}

export class VehicleService {
  async getVehicleDirectory(): Promise<VehicleDirectoryItem[]> {
    const vehicles = await vehicleRepository.getAll();
    const assignments = await assignmentRepository.getAll();
    const legs = await tripLegRepository.getAll();

    const legMap = new Map(legs.map((l) => [l.id, l]));
    const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE');

    return vehicles.map((v) => {
      const vehicleActiveAssignments = activeAssignments.filter((a) => a.vehicleId === v.id);
      const activeAssignment = selectPrioritizedActiveAssignment(vehicleActiveAssignments, legMap);

      return {
        ...v,
        activeAssignment,
      };
    });
  }

  async getVehicleSummary(): Promise<VehicleSummary> {
    const vehicles = await vehicleRepository.getAll();
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const inUseVehicles = vehicles.filter((v) => v.status === 'IN_USE').length;
    const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);

    return {
      totalVehicles,
      availableVehicles,
      inUseVehicles,
      totalCapacity,
    };
  }

  filterVehicles(
    vehicles: VehicleDirectoryItem[],
    statusFilter: string,
    searchQuery: string
  ): VehicleDirectoryItem[] {
    const q = searchQuery.toLowerCase().trim();

    return vehicles.filter((v) => {
      // Status filter
      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (q) {
        const matchesModel = v.model.toLowerCase().includes(q);
        const matchesReg = v.registrationNumber.toLowerCase().includes(q);
        const matchesId = v.id.toLowerCase().includes(q);
        return matchesModel || matchesReg || matchesId;
      }

      return true;
    });
  }
}

export const vehicleService = new VehicleService();
