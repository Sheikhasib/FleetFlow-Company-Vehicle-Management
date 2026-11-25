import { Notification } from '@/types/domain';

export interface INotificationRepository {
  getAll(): Promise<Notification[]>;
  getByRecipientId(recipientId: string): Promise<Notification[]>;
  create(notification: Notification): Promise<Notification>;
  markAsRead(id: string): Promise<boolean>;
}
