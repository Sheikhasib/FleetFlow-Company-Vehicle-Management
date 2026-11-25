import { Notification } from '@/types/domain';
import { notificationRepository } from '@/repositories/mock/mock-notification-repository';

export interface CreateNotificationInput {
  recipientId: string;
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  async getNotifications(recipientId: string): Promise<Notification[]> {
    return notificationRepository.getByRecipientId(recipientId);
  }

  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      recipientId: input.recipientId,
      title: input.title.trim(),
      message: input.message.trim(),
      read: false,
      createdAt: new Date().toISOString(),
      link: input.link,
    };
    return notificationRepository.create(notification);
  }

  async markAsRead(id: string): Promise<boolean> {
    return notificationRepository.markAsRead(id);
  }
}

export const notificationService = new NotificationService();
