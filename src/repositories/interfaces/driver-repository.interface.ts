import { Driver, DriverStatus } from '@/types/domain';

export interface IDriverRepository {
  getAll(): Promise<Driver[]>;
  getById(id: string): Promise<Driver | null>;
  getByUserId(userId: string): Promise<Driver | null>;
  updateStatus(id: string, status: DriverStatus): Promise<Driver | null>;
}
