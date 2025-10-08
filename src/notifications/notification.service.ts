import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationGateway: NotificationGateway,
  ) {}

  async createNotification(notificationData: {
    userId: string;
    organizationId?: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
    actionText?: string;
    priority?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create(notificationData);
    const savedNotification = await this.notificationRepository.save(notification);

    // Emit real-time notification
    this.notificationGateway.emitNotification(notificationData.userId, {
      id: savedNotification.id,
      type: savedNotification.type,
      title: savedNotification.title,
      message: savedNotification.message,
      data: savedNotification.data,
      actionUrl: savedNotification.actionUrl,
      actionText: savedNotification.actionText,
      priority: savedNotification.priority,
      isRead: savedNotification.isRead
    });

    this.logger.log(`Notification created for user ${notificationData.userId}: ${notificationData.type}`);
    return savedNotification;
  }

  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isActive: true, isRead: false }
    });

    return { notifications, total, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId, isActive: true }
    });

    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);

      // Emit real-time update
      this.notificationGateway.emitNotification(userId, {
        type: 'NOTIFICATION_READ',
        data: { notificationId }
      });

      this.logger.log(`Notification ${notificationId} marked as read by user ${userId}`);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isActive: true, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Emit real-time update
    this.notificationGateway.emitNotification(userId, {
      type: 'ALL_NOTIFICATIONS_READ',
      data: { count: result.affected }
    });

    this.logger.log(`All notifications marked as read for user ${userId} (${result.affected} notifications)`);
    return result.affected || 0;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.update(
      { id: notificationId, userId, isActive: true },
      { isActive: false }
    );

    if (result.affected && result.affected > 0) {
      // Emit real-time update
      this.notificationGateway.emitNotification(userId, {
        type: 'NOTIFICATION_DELETED',
        data: { notificationId }
      });

      this.logger.log(`Notification ${notificationId} deleted by user ${userId}`);
      return true;
    }

    return false;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, isActive: true, isRead: false }
    });
  }

  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository.update(
      { createdAt: { $lt: cutoffDate } as any, isActive: true },
      { isActive: false }
    );

    this.logger.log(`Cleaned up ${result.affected} old notifications`);
    return result.affected || 0;
  }

  // Helper method for build-related notifications
  async createBuildNotification(userId: string, buildId: string, status: string, data?: any) {
    const notificationTypes = {
      'pending': { title: 'Build Started', message: 'Your installer build has been initiated', priority: 'info' },
      'building': { title: 'Build In Progress', message: 'Your installer is being compiled', priority: 'info' },
      'completed': { title: 'Build Complete', message: 'Your installer is ready for download', priority: 'success', actionText: 'Download', actionUrl: data?.downloadUrl },
      'failed': { title: 'Build Failed', message: 'Your installer build failed. Please try again.', priority: 'error', actionText: 'Retry' }
    };

    const notificationType = notificationTypes[status] || notificationTypes['building'];

    return await this.createNotification({
      userId,
      type: 'BUILD_STATUS_UPDATE',
      title: notificationType.title,
      message: notificationType.message,
      data: { buildId, status, ...data },
      actionUrl: notificationType.actionUrl,
      actionText: notificationType.actionText,
      priority: notificationType.priority
    });
  }
}

