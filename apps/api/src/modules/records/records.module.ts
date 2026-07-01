import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { OcrService } from './ocr.service';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [MulterModule.register({
    storage: memoryStorage(),   // file.buffer disponível para OCR
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  })],
  providers: [RecordsService, OcrService],
  controllers: [RecordsController],
  exports: [OcrService],
})
export class RecordsModule {}
