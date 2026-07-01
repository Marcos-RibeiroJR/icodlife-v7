// apps/api/src/modules/records/records.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OcrService } from './ocr.service';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private ocr: OcrService,
  ) {}

  list(userId: string) {
    return this.prisma.healthRecord.findMany({
      where: { userId },
      orderBy: { recordDate: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    const r = await this.prisma.healthRecord.findFirst({ where: { id, userId } });
    if (!r) throw new NotFoundException();
    return r;
  }

  create(userId: string, d: any) {
    return this.prisma.healthRecord.create({
      data: {
        userId,
        category:   d.category   || 'general',
        title:      d.title      || 'Exame',
        recordDate: d.recordDate ? new Date(d.recordDate) : new Date(),
        fileName:   d.fileName   || d.title  || 'arquivo',
        fileUrl:    d.fileUrl    || '',
        fileSize:   d.fileSize   ? Number(d.fileSize) : undefined,
        mimeType:   d.mimeType,
        description: d.description,
        tags:       d.tags       || [],
        isProcessed: false,
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.healthRecord.delete({ where: { id } });
    return { message: 'Removido' };
  }

  async getSignedUrl(userId: string, id: string) {
    const r = await this.get(userId, id);
    return { url: r.fileUrl || null };
  }

  async processOcr(userId: string, fileBuffer: Buffer, originalName: string) {
    const ocrResult = await this.ocr.extractFromPdf(fileBuffer);

    const record = await this.prisma.healthRecord.create({
      data: {
        userId,
        category:     'blood',
        title:        originalName.replace(/\.[^.]+$/, '') || 'Exame',
        recordDate:   ocrResult.examDate ? new Date(ocrResult.examDate) : new Date(),
        fileName:     originalName,
        fileUrl:      '',
        tags:         [],
        isProcessed:  false,
      },
    });

    return {
      record,
      ocr: ocrResult,
      message: ocrResult.success
        ? `${ocrResult.markers.length} marcador(es) detectado(s). Confirme os valores antes de salvar.`
        : 'Não foi possível extrair dados automaticamente. Use o lançamento manual.',
    };
  }
}
