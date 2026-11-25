import { Vehicle, VehicleStatus } from '@/types/domain';
import { IVehicleRepository } from '../interfaces/vehicle-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockVehicleRepository implements IVehicleRepository {
  async getAll(): Promise<Vehicle[]> {
    return [...useFleetFlowStore.getState().vehicles];
  }

  async getById(id: string): Promise<Vehicle | null> {
    const vehicle = useFleetFlowStore.getState().vehicles.find((v) => v.id === id);
    return vehicle ? { ...vehicle } : null;
  }

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle | null> {
    useFleetFlowStore.getState().updateVehicleStatus(id, status);
    return this.getById(id);
  }
}

export const vehicleRepository = new MockVehicleRepository();
