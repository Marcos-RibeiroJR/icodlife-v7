// apps/api/src/modules/glucose/dto/create-glucose.dto.ts
import { IsNumber, IsString, IsOptional, IsBoolean, IsDateString, IsEnum, Min, Max } from 'class-validator';

export enum GlucoseContextDto {
  fasting       = 'fasting',
  pre_meal      = 'pre_meal',
  post_meal     = 'post_meal',
  bedtime       = 'bedtime',
  random        = 'random',
  post_exercise = 'post_exercise',
}

export class CreateGlucoseDto {
  @IsNumber()
  @Min(20)
  @Max(600)
  value: number; // mg/dL

  @IsEnum(GlucoseContextDto)
  context: GlucoseContextDto;

  @IsDateString()
  measuredAt: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  carbsGrams?: number;

  @IsOptional()
  @IsNumber()
  insulinUnits?: number;

  @IsOptional()
  @IsBoolean()
  exerciseBefore?: boolean;

  @IsOptional()
  @IsBoolean()
  sick?: boolean;
}

export class CreateHbA1cDto {
  @IsNumber()
  @Min(3)
  @Max(20)
  value: number; // %

  @IsDateString()
  measuredAt: string;

  @IsOptional()
  @IsString()
  labName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
