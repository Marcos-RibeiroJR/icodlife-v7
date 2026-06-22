import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { OcrService } from './ocr.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [MulterModule.register({ storage: undefined })], // memory storage para OCR
  providers: [RecordsService, OcrService],
  controllers: [RecordsController],
  exports: [OcrService],
})
export class RecordsModule {}
