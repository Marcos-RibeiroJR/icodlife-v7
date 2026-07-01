// apps/api/src/modules/push/push.module.ts
import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  controllers: [PushController],
  providers:   [PushService],
  exports:     [PushService],
})
export class PushModule {}
