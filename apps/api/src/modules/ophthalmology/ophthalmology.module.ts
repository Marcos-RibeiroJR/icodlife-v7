// apps/api/src/modules/ophthalmology/ophthalmology.module.ts
import { Module } from '@nestjs/common';
import { OphthalmologyService } from './ophthalmology.service';
import { OphthalmologyController } from './ophthalmology.controller';
import { OphthalmologyPdfService } from './ophthalmology-pdf.service';

@Module({
  providers: [OphthalmologyService, OphthalmologyPdfService],
  controllers: [OphthalmologyController],
})
export class OphthalmologyModule {}
