// apps/api/src/modules/ophthalmology/ophthalmology.module.ts
import { Module } from '@nestjs/common';
import { OphthalmologyService } from './ophthalmology.service';
import { OphthalmologyController } from './ophthalmology.controller';

@Module({
  providers: [OphthalmologyService],
  controllers: [OphthalmologyController],
})
export class OphthalmologyModule {}
