import { Vehicle, VehicleStatus } from '@/types/domain';

export interface IVehicleRepository {
  getAll(): Promise<Vehicle[]>;
  getById(id: string): Promise<Vehicle | null>;
  updateStatus(id: string, status: VehicleStatus): Promise<Vehicle | null>;
}
