// apps/api/src/modules/blood-pressure/dto/create-bp-reading.dto.ts
import {
  IsInt, IsOptional, IsBoolean, IsEnum, IsDateString, IsString, Min, Max,
} from 'class-validator';

export enum SleepQualityEnum { boa='boa', regular='regular', ruim='ruim', insonia='insonia' }
export enum PhysicalActivityEnum { nenhuma='nenhuma', leve='leve', moderada='moderada', intensa='intensa' }
export enum StressLevelEnum { baixo='baixo', moderado='moderado', alto='alto' }

export class CreateBpReadingDto {
  @IsInt() @Min(50) @Max(300)
  systolic: number;

  @IsInt() @Min(30) @Max(200)
  diastolic: number;

  @IsOptional() @IsInt() @Min(30) @Max(250)
  pulse?: number;

  @IsDateString()
  measuredAt: string;

  @IsOptional() @IsString()
  arm?: string;

  // Fatores contextuais
  @IsOptional() @IsEnum(SleepQualityEnum)
  sleepQuality?: SleepQualityEnum;

  @IsOptional() @IsBoolean()
  alcoholConsumed?: boolean;

  @IsOptional() @IsBoolean()
  heavyMeal?: boolean;

  @IsOptional() @IsBoolean()
  highSodium?: boolean;

  @IsOptional() @IsEnum(PhysicalActivityEnum)
  physicalActivity?: PhysicalActivityEnum;

  @IsOptional() @IsEnum(StressLevelEnum)
  stressLevel?: StressLevelEnum;

  @IsOptional() @IsBoolean()
  caffeine?: boolean;

  @IsOptional() @IsBoolean()
  tookMedication?: boolean;

  @IsOptional() @IsBoolean()
  headache?: boolean;

  @IsOptional() @IsBoolean()
  dizziness?: boolean;

  @IsOptional() @IsBoolean()
  smoking?: boolean;

  @IsOptional() @IsString()
  notes?: string;
}
