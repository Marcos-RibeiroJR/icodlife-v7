// apps/api/src/modules/ophthalmology/dto/create-exam.dto.ts
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateOphthalmologyExamDto {
  // Módulo 1 – distância
  @IsOptional() @IsInt() @Min(20) @Max(500)
  estimatedDistanceCm?: number;

  @IsOptional() @IsString()
  deviceType?: string;

  // Módulo 2 – Snellen
  @IsOptional() @IsString()
  acuityRightEye?: string;

  @IsOptional() @IsString()
  acuityLeftEye?: string;

  @IsOptional()
  snellenRightRaw?: any;

  @IsOptional()
  snellenLeftRaw?: any;

  // Módulo 3 – Astigmatismo
  @IsOptional() @IsBoolean()
  astigmatismRight?: boolean;

  @IsOptional() @IsBoolean()
  astigmatismLeft?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(180)
  astigmatismAxisRight?: number;

  @IsOptional() @IsInt() @Min(0) @Max(180)
  astigmatismAxisLeft?: number;

  // Módulo 4 – Contraste
  @IsOptional() @IsNumber()
  contrastScoreRight?: number;

  @IsOptional() @IsNumber()
  contrastScoreLeft?: number;

  // Sintomas declarados
  @IsOptional() @IsArray() @IsString({ each: true })
  symptoms?: string[];

  @IsOptional() @IsInt() @Min(1) @Max(120)
  userAge?: number;
}

export class UpdateConsultHistoryDto {
  @IsOptional() @IsString()
  examId?: string;

  @IsOptional() @IsString()
  doctorName?: string;

  @IsOptional() @IsString()
  crmNumber?: string;

  @IsOptional() @IsNumber()
  sphericalRight?: number;

  @IsOptional() @IsNumber()
  sphericalLeft?: number;

  @IsOptional() @IsNumber()
  cylinderRight?: number;

  @IsOptional() @IsNumber()
  cylinderLeft?: number;

  @IsOptional() @IsInt()
  axisRight?: number;

  @IsOptional() @IsInt()
  axisLeft?: number;

  @IsOptional() @IsNumber()
  additionRight?: number;

  @IsOptional() @IsNumber()
  additionLeft?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  diagnoses?: string[];

  @IsOptional() @IsString()
  notes?: string;
}
