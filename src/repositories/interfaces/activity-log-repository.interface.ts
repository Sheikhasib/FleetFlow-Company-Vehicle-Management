import { ActivityLog } from '@/types/domain';

export interface IActivityLogRepository {
  getAll(): Promise<ActivityLog[]>;
  getByRequestId(requestId: string): Promise<ActivityLog[]>;
  create(log: ActivityLog): Promise<ActivityLog>;
}
