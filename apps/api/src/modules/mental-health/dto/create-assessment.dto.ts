// apps/api/src/modules/mental-health/dto/create-assessment.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

export class MentalHealthAnswerDto {
  @IsString()
  questionId!: string;

  // Índice da opção Likert (0..5 conforme a escala)
  @IsInt() @Min(0) @Max(5)
  value!: number;
}

export class CreateMentalHealthAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentalHealthAnswerDto)
  answers!: MentalHealthAnswerDto[];

  // Quem aplicou: autoaplicado (paciente) ou por clínico
  @IsOptional() @IsIn(['self', 'clinician'])
  appliedBy?: 'self' | 'clinician';

  // Consentimento LGPD (dado sensível de saúde mental)
  @IsOptional() @IsBoolean()
  consentGiven?: boolean;

  // Contexto opcional (medicina do trabalho)
  @IsOptional() @IsString()
  sector?: string;

  @IsOptional() @IsString()
  role?: string;
}

export class ReviewAssessmentDto {
  @IsOptional() @IsString()
  notes?: string;
}
