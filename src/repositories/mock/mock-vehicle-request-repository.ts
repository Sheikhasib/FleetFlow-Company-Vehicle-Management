import { VehicleRequest } from '@/types/domain';
import {
  IVehicleRequestRepository,
  RequestBundle,
} from '../interfaces/vehicle-request-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockVehicleRequestRepository implements IVehicleRequestRepository {
  async getAll(): Promise<VehicleRequest[]> {
    return [...useFleetFlowStore.getState().requests];
  }

  async getById(id: string): Promise<VehicleRequest | null> {
    const request = useFleetFlowStore.getState().requests.find((r) => r.id === id);
    return request ? { ...request } : null;
  }

  async getByRequesterId(requesterId: string): Promise<VehicleRequest[]> {
    return useFleetFlowStore
      .getState()
      .requests.filter((r) => r.requesterId === requesterId)
      .map((r) => ({ ...r }));
  }

  async create(request: VehicleRequest): Promise<VehicleRequest> {
    useFleetFlowStore.getState().addRequest(request);
    return { ...request };
  }

  async update(request: VehicleRequest): Promise<VehicleRequest> {
    useFleetFlowStore.getState().updateRequest(request);
    return { ...request };
  }

  async createWithBundle(bundle: RequestBundle): Promise<VehicleRequest> {
    useFleetFlowStore.getState().createRequestBundle(bundle);
    return { ...bundle.request };
  }
}

export const vehicleRequestRepository = new MockVehicleRequestRepository();
