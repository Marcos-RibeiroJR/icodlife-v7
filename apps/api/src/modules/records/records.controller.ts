// apps/api/src/modules/records/records.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordsService } from './records.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('records')
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private svc: RecordsService) {}

  @Get()
  list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u.id); }

  @Get(':id/download')
  url(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getSignedUrl(u.id, id); }

  @Get(':id')
  get(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.get(u.id, id); }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@CurrentUser() u: any, @UploadedFile() file: any, @Body() b: any) {
    // Se for PDF, roda OCR e retorna resultado para confirmação
    if (file && file.mimetype === 'application/pdf') {
      return this.svc.processOcr(u.id, file.buffer, file.originalname);
    }
    // Imagem ou outro: cria registro direto
    return this.svc.create(u.id, b);
  }

  @Post('upload/confirm')
  async confirmOcr(@CurrentUser() u: any, @Body() b: any) {
    // Frontend confirma os marcadores extraídos → cria ExamResult
    // b = { healthRecordId, examDate, labName, items: [{marker, value, unit}] }
    return this.svc.create(u.id, b);
  }

  @Delete(':id')
  delete(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.delete(u.id, id); }
}
