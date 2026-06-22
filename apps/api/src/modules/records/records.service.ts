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
      where: { userId, deletedAt: null },
      orderBy: { recordDate: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    const r = await this.prisma.healthRecord.findFirst({ where: { id, userId, deletedAt: null } });
    if (!r) throw new NotFoundException();
    return r;
  }

  create(userId: string, d: any) {
    return this.prisma.healthRecord.create({
      data: {
        userId,
        recordType: d.recordType || 'exam',
        category:   d.category   || 'general',
        title:      d.title      || 'Exame',
        recordDate: new Date(d.recordDate || new Date()),
        labName:    d.labName,
        doctorName: d.doctorName,
        resultStatus: 'pending',
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.prisma.healthRecord.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });
    return { message: 'Removido' };
  }

  async getSignedUrl(userId: string, id: string) {
    const r = await this.get(userId, id);
    return { url: r.s3Key ? `https://files.icodlife.com.br/${r.s3Key}` : null };
  }

  // ── OCR Pipeline ────────────────────────────────────────────────────────────
  async processOcr(userId: string, fileBuffer: Buffer, originalName: string) {
    const ocrResult = await this.ocr.extractFromPdf(fileBuffer);

    // Cria o HealthRecord base
    const record = await this.prisma.healthRecord.create({
      data: {
        userId,
        recordType:   'exam',
        category:     'blood',
        title:        originalName.replace(/\.[^.]+$/, '') || 'Exame',
        recordDate:   ocrResult.examDate ? new Date(ocrResult.examDate) : new Date(),
        labName:      ocrResult.labName ?? undefined,
        resultStatus: 'pending',
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
