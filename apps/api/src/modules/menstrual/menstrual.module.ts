import { Module } from '@nestjs/common';
import { MenstrualService } from './menstrual.service';
import { MenstrualController } from './menstrual.controller';
@Module({ providers: [MenstrualService], controllers: [MenstrualController] })
export class MenstrualModule {}
