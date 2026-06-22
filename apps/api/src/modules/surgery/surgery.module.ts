// apps/api/src/modules/surgery/surgery.module.ts
import { Module } from '@nestjs/common';
import { SurgeryService } from './surgery.service';
import { SurgeryController } from './surgery.controller';

@Module({
  controllers: [SurgeryController],
  providers:   [SurgeryService],
  exports:     [SurgeryService],
})
export class SurgeryModule {}
