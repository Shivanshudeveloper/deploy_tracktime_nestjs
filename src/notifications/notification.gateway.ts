import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(`user_${userId}`);
    this.logger.log(`User ${userId} joined their notification room`);
  }

  @SubscribeMessage('leave_user_room')
  handleLeaveUserRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.leave(`user_${userId}`);
    this.logger.log(`User ${userId} left their notification room`);
  }

  @SubscribeMessage('join_organization_room')
  handleJoinOrganizationRoom(@MessageBody() organizationId: string, @ConnectedSocket() client: Socket) {
    client.join(`org_${organizationId}`);
    this.logger.log(`User joined organization room: ${organizationId}`);
  }

  @SubscribeMessage('leave_organization_room')
  handleLeaveOrganizationRoom(@MessageBody() organizationId: string, @ConnectedSocket() client: Socket) {
    client.leave(`org_${organizationId}`);
    this.logger.log(`User left organization room: ${organizationId}`);
  }

  // Emit build progress updates to specific user
  emitBuildProgress(userId: string, buildId: string, data: any) {
    this.server.to(`user_${userId}`).emit('build_progress', {
      buildId,
      timestamp: new Date(),
      ...data
    });
    this.logger.log(`Build progress emitted to user ${userId} for build ${buildId}`);
  }

  // Emit general notifications to specific user
  emitNotification(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
      id: this.generateNotificationId()
    });
    this.logger.log(`Notification emitted to user ${userId}: ${notification.type}`);
  }

  // Emit notifications to all users in an organization
  emitOrganizationNotification(organizationId: string, notification: any) {
    this.server.to(`org_${organizationId}`).emit('organization_notification', {
      ...notification,
      timestamp: new Date(),
      id: this.generateNotificationId()
    });
    this.logger.log(`Organization notification emitted to org ${organizationId}: ${notification.type}`);
  }

  // Emit to all connected clients (for system-wide notifications)
  emitBroadcast(notification: any) {
    this.server.emit('broadcast_notification', {
      ...notification,
      timestamp: new Date(),
      id: this.generateNotificationId()
    });
    this.logger.log(`Broadcast notification emitted: ${notification.type}`);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.server.sockets.sockets.size;
  }

  // Get users in a specific room
  getUsersInRoom(room: string): number {
    const roomSockets = this.server.sockets.adapter.rooms.get(room);
    return roomSockets ? roomSockets.size : 0;
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

