// apps/api/src/modules/lifestyle/lifestyle.module.ts
import { Module } from '@nestjs/common';
import { LifestyleController } from './lifestyle.controller';
import { LifestyleService } from './lifestyle.service';

@Module({
  controllers: [LifestyleController],
  providers: [LifestyleService],
  exports: [LifestyleService],
})
export class LifestyleModule {}
