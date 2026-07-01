// apps/api/src/modules/records/records.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, Query, Logger, InternalServerErrorException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordsService } from './records.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('records')
@UseGuards(JwtAuthGuard)
export class RecordsController {
  private readonly logger = new Logger(RecordsController.name);

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
    this.logger.log(`Upload recebido — file: ${file ? file.originalname : 'NENHUM'}, mimetype: ${file?.mimetype}, buffer: ${file?.buffer ? file.buffer.length + ' bytes' : 'UNDEFINED'}`);

    if (!file) {
      throw new InternalServerErrorException('Nenhum arquivo recebido. Verifique o formulário.');
    }

    try {
      if (file.mimetype === 'application/pdf') {
        if (!file.buffer) {
          this.logger.error('file.buffer é undefined — storage não está em memória');
          throw new InternalServerErrorException('Erro interno: buffer do arquivo não disponível.');
        }
        return await this.svc.processOcr(u.id, file.buffer, file.originalname);
      }
      return await this.svc.create(u.id, b);
    } catch (err: any) {
      this.logger.error('Erro no upload/OCR: ' + err.message, err.stack);
      throw new InternalServerErrorException(err.message ?? 'Erro ao processar arquivo');
    }
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
