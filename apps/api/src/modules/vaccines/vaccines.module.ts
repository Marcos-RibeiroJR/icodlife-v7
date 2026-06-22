// apps/api/src/modules/vaccines/vaccines.module.ts
import { Module } from '@nestjs/common';
import { VaccinesService } from './vaccines.service';
import { VaccinesCatalogController, VaccinationsController } from './vaccines.controller';

@Module({
  controllers: [VaccinesCatalogController, VaccinationsController],
  providers:   [VaccinesService],
  exports:     [VaccinesService],
})
export class VaccinesModule {}
