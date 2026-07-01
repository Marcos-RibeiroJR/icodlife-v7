// apps/api/src/modules/body-metrics/body-metrics.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsOptional, IsString, IsNumber, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../common/prisma/prisma.service';

export class CreateBodyMetricDto {
  @IsOptional() @IsString()  measuredAt?:       string;
  @IsOptional() @IsNumber() @Type(() => Number) weightKg?:         number;
  @IsOptional() @IsNumber() @Type(() => Number) heightCm?:         number;
  @IsOptional() @IsNumber() @Type(() => Number) bodyFatPct?:       number;
  @IsOptional() @IsNumber() @Type(() => Number) muscleMassKg?:     number;
  @IsOptional() @IsNumber() @Type(() => Number) muscleMassPct?:    number;
  @IsOptional() @IsInt()    @Type(() => Number) visceralFatLevel?: number;
  @IsOptional() @IsNumber() @Type(() => Number) waterPct?:         number;
  @IsOptional() @IsNumber() @Type(() => Number) boneMassKg?:       number;
  @IsOptional() @IsInt()    @Type(() => Number) metabolicAge?:     number;
  @IsOptional() @IsInt()    @Type(() => Number) bmr?:              number;
  @IsOptional() @IsString()  deviceType?:       string;
  @IsOptional() @IsString()  notes?:            string;
}

export class UpdateBodyMetricDto extends CreateBodyMetricDto {}

function calcBmi(heightCm: number, weightKg: number) {
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const rounded = Math.round(bmi * 10) / 10;
  let bmiCategory = 'normal';
  if (bmi < 18.5)     bmiCategory = 'abaixo_peso';
  else if (bmi < 25)  bmiCategory = 'normal';
  else if (bmi < 30)  bmiCategory = 'sobrepeso';
  else if (bmi < 35)  bmiCategory = 'obesidade_1';
  else if (bmi < 40)  bmiCategory = 'obesidade_2';
  else                bmiCategory = 'obesidade_3';
  return { bmi: rounded, bmiCategory };
}

@Injectable()
export class BodyMetricsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBodyMetricDto) {
    let bmi: number | undefined;
    let bmiCategory: string | undefined;
    if (dto.heightCm && dto.weightKg) {
      const calc = calcBmi(dto.heightCm, dto.weightKg);
      bmi = calc.bmi;
      bmiCategory = calc.bmiCategory;
    }

    return this.prisma.bodyMetric.create({
      data: {
        userId,
        measuredAt:       dto.measuredAt ? new Date(dto.measuredAt) : undefined,
        weightKg:         dto.weightKg,
        heightCm:         dto.heightCm,
        bmi,
        bmiCategory,
        bodyFatPct:       dto.bodyFatPct,
        muscleMassKg:     dto.muscleMassKg,
        muscleMassPct:    dto.muscleMassPct,
        visceralFatLevel: dto.visceralFatLevel,
        waterPct:         dto.waterPct,
        boneMassKg:       dto.boneMassKg,
        metabolicAge:     dto.metabolicAge,
        bmr:              dto.bmr,
        deviceType:       dto.deviceType,
        notes:            dto.notes,
      },
    });
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.bodyMetric.findMany({
        where: { userId },
        orderBy: { measuredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bodyMetric.count({ where: { userId } }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getLatest(userId: string) {
    return this.prisma.bodyMetric.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });
  }

  async getStats(userId: string) {
    const all = await this.prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { measuredAt: 'asc' },
      select: {
        id: true,
        measuredAt: true,
        weightKg: true,
        bmi: true,
        bodyFatPct: true,
        muscleMassPct: true,
        waterPct: true,
        visceralFatLevel: true,
      },
    });

    const latest = all[all.length - 1] ?? null;
    const oldest = all[0] ?? null;

    const weightDelta = (latest?.weightKg && oldest?.weightKg && all.length > 1)
      ? Number(latest.weightKg) - Number(oldest.weightKg)
      : null;

    return {
      latest,
      totalEntries: all.length,
      weightDelta: weightDelta !== null ? Math.round(weightDelta * 10) / 10 : null,
      chart: {
        weight:     all.filter(r => r.weightKg).map(r => ({ date: r.measuredAt, value: Number(r.weightKg) })),
        bmi:        all.filter(r => r.bmi).map(r => ({ date: r.measuredAt, value: Number(r.bmi) })),
        bodyFat:    all.filter(r => r.bodyFatPct).map(r => ({ date: r.measuredAt, value: Number(r.bodyFatPct) })),
        muscleMass: all.filter(r => r.muscleMassPct).map(r => ({ date: r.measuredAt, value: Number(r.muscleMassPct) })),
      },
    };
  }

  async update(userId: string, id: string, dto: UpdateBodyMetricDto) {
    const rec = await this.prisma.bodyMetric.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Registro não encontrado');
    if (rec.userId !== userId) throw new ForbiddenException();

    const h = dto.heightCm ?? (rec.heightCm ? Number(rec.heightCm) : undefined);
    const w = dto.weightKg ?? (rec.weightKg ? Number(rec.weightKg) : undefined);
    let bmi: number | undefined;
    let bmiCategory: string | undefined;
    if (h && w) { const c = calcBmi(h, w); bmi = c.bmi; bmiCategory = c.bmiCategory; }

    return this.prisma.bodyMetric.update({
      where: { id },
      data: {
        measuredAt:       dto.measuredAt ? new Date(dto.measuredAt) : undefined,
        weightKg:         dto.weightKg,
        heightCm:         dto.heightCm,
        bmi,
        bmiCategory,
        bodyFatPct:       dto.bodyFatPct,
        muscleMassKg:     dto.muscleMassKg,
        muscleMassPct:    dto.muscleMassPct,
        visceralFatLevel: dto.visceralFatLevel,
        waterPct:         dto.waterPct,
        boneMassKg:       dto.boneMassKg,
        metabolicAge:     dto.metabolicAge,
        bmr:              dto.bmr,
        deviceType:       dto.deviceType,
        notes:            dto.notes,
      },
    });
  }

  async delete(userId: string, id: string) {
    const rec = await this.prisma.bodyMetric.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Registro não encontrado');
    if (rec.userId !== userId) throw new ForbiddenException();
    await this.prisma.bodyMetric.delete({ where: { id } });
    return { deleted: true };
  }
}
