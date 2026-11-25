import { Driver, DriverStatus } from '@/types/domain';
import { IDriverRepository } from '../interfaces/driver-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockDriverRepository implements IDriverRepository {
  async getAll(): Promise<Driver[]> {
    return [...useFleetFlowStore.getState().drivers];
  }

  async getById(id: string): Promise<Driver | null> {
    const driver = useFleetFlowStore.getState().drivers.find((d) => d.id === id);
    return driver ? { ...driver } : null;
  }

  async getByUserId(userId: string): Promise<Driver | null> {
    const driver = useFleetFlowStore.getState().drivers.find((d) => d.userId === userId);
    return driver ? { ...driver } : null;
  }

  async updateStatus(id: string, status: DriverStatus): Promise<Driver | null> {
    useFleetFlowStore.getState().updateDriverStatus(id, status);
    return this.getById(id);
  }
}

export const driverRepository = new MockDriverRepository();
