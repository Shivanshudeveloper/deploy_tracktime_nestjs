import { Module } from '@nestjs/common';
import { UpdateController } from './update.controller';
import { UpdateService } from './update.service';
import { BuildStatusModule } from '../build-status/build-status.module';

@Module({
  imports: [BuildStatusModule],
  controllers: [UpdateController],
  providers: [UpdateService],
  exports: [UpdateService],
})
export class UpdateModule {}





