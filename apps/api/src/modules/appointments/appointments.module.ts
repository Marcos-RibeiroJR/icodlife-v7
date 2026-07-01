import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PushModule } from '../push/push.module';

@Module({
  imports:     [PushModule],
  providers:   [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}
