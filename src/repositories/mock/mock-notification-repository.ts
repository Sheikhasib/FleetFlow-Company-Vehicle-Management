import { Notification } from '@/types/domain';
import { INotificationRepository } from '../interfaces/notification-repository.interface';
import { useFleetFlowStore } from '@/stores/fleetflow-store';

export class MockNotificationRepository implements INotificationRepository {
  async getAll(): Promise<Notification[]> {
    return [...useFleetFlowStore.getState().notifications];
  }

  async getByRecipientId(recipientId: string): Promise<Notification[]> {
    return useFleetFlowStore
      .getState()
      .notifications.filter((n) => n.recipientId === recipientId)
      .map((n) => ({ ...n }));
  }

  async create(notification: Notification): Promise<Notification> {
    useFleetFlowStore.getState().addNotification(notification);
    return { ...notification };
  }

  async markAsRead(id: string): Promise<boolean> {
    useFleetFlowStore.getState().markNotificationRead(id);
    return true;
  }
}

export const notificationRepository = new MockNotificationRepository();
