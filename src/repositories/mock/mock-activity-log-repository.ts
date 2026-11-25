import { ActivityLog } from '@/types/domain';
import { IActivityLogRepository } from '../interfaces/activity-log-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockActivityLogRepository implements IActivityLogRepository {
  async getAll(): Promise<ActivityLog[]> {
    return [...useFleetFlowStore.getState().activityLogs];
  }

  async getByRequestId(requestId: string): Promise<ActivityLog[]> {
    return useFleetFlowStore
      .getState()
      .activityLogs.filter((a) => a.requestId === requestId)
      .map((a) => ({ ...a }));
  }

  async create(log: ActivityLog): Promise<ActivityLog> {
    useFleetFlowStore.getState().addActivityLog(log);
    return { ...log };
  }
}

export const activityLogRepository = new MockActivityLogRepository();
