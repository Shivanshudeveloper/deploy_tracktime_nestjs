import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthMiddleware } from '../users/auth.middleware';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthMiddleware)
  @Get()
  async getUserNotifications(
    @Request() req: any,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    return await this.notificationService.getUserNotifications(userId, limitNum, offsetNum);
  }

  @UseGuards(AuthMiddleware)
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const count = await this.notificationService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @UseGuards(AuthMiddleware)
  @Put(':id/read')
  async markAsRead(@Request() req: any, @Param('id') notificationId: string) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const notification = await this.notificationService.markAsRead(notificationId, userId);
    if (!notification) {
      return { error: 'Notification not found' };
    }

    return { success: true, notification };
  }

  @UseGuards(AuthMiddleware)
  @Put('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const count = await this.notificationService.markAllAsRead(userId);
    return { success: true, markedCount: count };
  }

  @UseGuards(AuthMiddleware)
  @Delete(':id')
  async deleteNotification(@Request() req: any, @Param('id') notificationId: string) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const deleted = await this.notificationService.deleteNotification(notificationId, userId);
    if (!deleted) {
      return { error: 'Notification not found' };
    }

    return { success: true };
  }

  @UseGuards(AuthMiddleware)
  @Post('create')
  async createNotification(@Request() req: any, @Body() notificationData: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const notification = await this.notificationService.createNotification({
      userId,
      ...notificationData
    });

    return { success: true, notification };
  }
}

