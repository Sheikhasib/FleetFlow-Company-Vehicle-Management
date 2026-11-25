import { ActivityLog } from '@/types/domain';
import { activityLogRepository } from '@/repositories/mock/mock-activity-log-repository';

export interface CreateActivityLogInput {
  requestId: string;
  tripLegId?: string;
  actorId: string;
  action: string;
  description: string;
}

export class ActivityService {
  async getActivityHistory(requestId: string): Promise<ActivityLog[]> {
    return activityLogRepository.getByRequestId(requestId);
  }

  async createActivityLog(input: CreateActivityLogInput): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: `act_${Date.now()}`,
      requestId: input.requestId,
      tripLegId: input.tripLegId,
      actorId: input.actorId,
      action: input.action.trim(),
      description: input.description.trim(),
      timestamp: new Date().toISOString(),
    };
    return activityLogRepository.create(log);
  }
}

export const activityService = new ActivityService();
