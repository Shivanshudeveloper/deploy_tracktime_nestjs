import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { AuthService } from '../users/auth.service';
import { AuthMiddleware } from '../users/auth.middleware';
import { User } from '../users/user.entity';
import { PaidUser } from '../users/paid_users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, PaidUser]),
    JwtModule.register({
      secret: 'crazy-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, AuthService, AuthMiddleware],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}

