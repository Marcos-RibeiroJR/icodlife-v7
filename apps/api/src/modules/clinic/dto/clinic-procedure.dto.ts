// apps/api/src/modules/clinic/dto/clinic-procedure.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ClinicProcedureDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  tussCode?: string;

  @IsOptional()
  @IsString()
  category?: string; // consulta | exame | procedimento | cirurgia

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsObject()
  healthPlanPrices?: Record<string, number>;
}
