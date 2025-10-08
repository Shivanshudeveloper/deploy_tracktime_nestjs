import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildStatus } from './build-status.entity';
import { BuildStatusService } from './build-status.service';
import { BuildStatusController } from './build-status.controller';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BuildStatus]),
    NotificationModule,
  ],
  controllers: [BuildStatusController],
  providers: [BuildStatusService],
  exports: [BuildStatusService],
})
export class BuildStatusModule {}

