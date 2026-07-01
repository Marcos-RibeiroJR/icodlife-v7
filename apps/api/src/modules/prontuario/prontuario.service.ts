// apps/api/src/modules/prontuario/prontuario.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShareAccessLevel } from '../../generated/prisma';
import { randomUUID } from 'crypto';

export interface CreateShareDto {
  accessLevel: 'basic' | 'medium' | 'complete';
  expiresInHours?: number; // default 24
  maxViews?: number;
  accessedByName?: string; // nome do médico (opcional)
}

@Injectable()
export class ProntuarioService {
  constructor(private prisma: PrismaService) {}

  // ─── Gerar token de compartilhamento ────────────────────────────────────────

  async createShare(userId: string, dto: CreateShareDto) {
    const expiresInHours = dto.expiresInHours ?? 24;
    if (expiresInHours < 1 || expiresInHours > 720)
      throw new BadRequestException('expiresInHours deve ser entre 1 e 720');

    const level = dto.accessLevel as ShareAccessLevel;
    if (!['basic', 'medium', 'complete'].includes(level))
      throw new BadRequestException('accessLevel inválido');

    const expiresAt = new Date(Date.now() + expiresInHours * 3_600_000);

    const share = await this.prisma.shareToken.create({
      data: {
        userId,
        token: randomUUID(),
        accessLevel: level,
        expiresAt,
        maxViews: dto.maxViews ?? null,
        accessedByName: dto.accessedByName ?? null,
      },
    });

    return share;
  }

  // ─── Listar tokens ativos do usuário ────────────────────────────────────────

  async listMyShares(userId: string) {
    const now = new Date();
    return this.prisma.shareToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Revogar token ──────────────────────────────────────────────────────────

  async revokeShare(userId: string, shareId: string) {
    const share = await this.prisma.shareToken.findFirst({
      where: { id: shareId, userId },
    });
    if (!share) throw new NotFoundException('Token não encontrado');

    return this.prisma.shareToken.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Ler prontuário por token (público) ─────────────────────────────────────

  async readByToken(token: string, accessorName?: string, accessorIp?: string) {
    const share = await this.prisma.shareToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!share) throw new NotFoundException('Token inválido ou não encontrado');
    if (share.revokedAt) throw new ForbiddenException('Este link foi revogado');
    if (share.expiresAt < new Date()) throw new ForbiddenException('Este link expirou');
    if (share.maxViews !== null && share.viewCount >= share.maxViews)
      throw new ForbiddenException('Limite de visualizações atingido');

    // Incrementar viewCount e registrar acesso
    await this.prisma.shareToken.update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        accessedByName: accessorName ?? share.accessedByName,
      },
    });

    const user = share.user;
    const level = share.accessLevel as string;

    // ── Nível BASIC: dados pessoais + alergias + condições crônicas ───────────
    const basicData = {
      meta: {
        level,
        expiresAt: share.expiresAt,
        generatedFor: share.accessedByName,
      },
      personal: {
        fullName:     user.fullName,
        dateOfBirth:  user.dateOfBirth,
        gender:       user.gender,
        bloodType:    user.bloodType,
        icode:        user.icode,
      },
      allergies:         user.allergies,
      chronicConditions: user.chronicConditions,
      emergency: {
        name:  user.emergencyContactName,
        phone: user.emergencyContactPhone,
        rel:   user.emergencyContactRel,
      },
    };

    if (level === 'basic') return basicData;

    // ── Nível MEDIUM: + medicamentos + estilo de vida ─────────────────────────
    const [medications, lifestyle] = await Promise.all([
      this.prisma.medication.findMany({
        where: { userId: user.id, isActive: true },
        select: { name: true, dosage: true, frequency: true, prescribingDoctor: true },
      }),
      this.prisma.lifestyleProfile.findUnique({
        where: { userId: user.id },
        select: {
          heightCm: true, weightKg: true, bmi: true, bmiCategory: true,
          smokingStatus: true, alcoholStatus: true, exerciseFrequency: true,
          sleepHoursAvg: true, stressLevel: true,
        },
      }),
    ]);

    const mediumData = {
      ...basicData,
      medications,
      lifestyle: lifestyle ?? null,
    };

    if (level === 'medium') return mediumData;

    // ── Nível COMPLETE: + exames + PA + tendências ────────────────────────────
    const [examResults, bpReadings] = await Promise.all([
      this.prisma.examResult.findMany({
        where: { userId: user.id },
        orderBy: { examDate: 'desc' },
        take: 10,
        select: {
          examDate: true, examType: true, labName: true,
          aiSummary: true, aiRiskLevel: true,
          items: {
            select: { marker: true, value: true, unit: true, status: true, refMin: true, refMax: true },
          },
        },
      }),
      this.prisma.bloodPressureReading.findMany({
        where: { userId: user.id },
        orderBy: { measuredAt: 'desc' },
        take: 10,
        select: { systolic: true, diastolic: true, pulse: true, measuredAt: true, classification: true },
      }),
    ]);

    return {
      ...mediumData,
      examResults,
      bloodPressureReadings: bpReadings,
    };
  }
}
