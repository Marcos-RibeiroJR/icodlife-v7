import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
@Module({ providers: [MedicationsService], controllers: [MedicationsController] })
export class MedicationsModule {}
