import {
  VehicleRequest,
  RequestBundle,
} from '@/types/domain';

export type { RequestBundle };

export interface IVehicleRequestRepository {
  getAll(): Promise<VehicleRequest[]>;
  getById(id: string): Promise<VehicleRequest | null>;
  getByRequesterId(requesterId: string): Promise<VehicleRequest[]>;
  create(request: VehicleRequest): Promise<VehicleRequest>;
  update(request: VehicleRequest): Promise<VehicleRequest>;
  createWithBundle(bundle: RequestBundle): Promise<VehicleRequest>;
}
