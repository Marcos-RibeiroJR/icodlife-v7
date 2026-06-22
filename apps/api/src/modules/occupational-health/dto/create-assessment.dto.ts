// apps/api/src/modules/occupational-health/dto/create-assessment.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

export class AssessmentAnswerDto {
  @IsString()
  questionId!: string;

  // Escala Likert 0–4: 0=Nunca 1=Raramente 2=Às vezes 3=Frequentemente 4=Sempre
  @IsInt() @Min(0) @Max(4)
  value!: number;
}

export class CreatePsychosocialAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers!: AssessmentAnswerDto[];

  // Contexto ocupacional (opcional, ajuda a contextualizar o laudo e o GHE)
  @IsOptional() @IsString()
  sector?: string; // setor / departamento

  @IsOptional() @IsString()
  role?: string; // cargo / função

  @IsOptional() @IsIn(['presencial', 'remoto', 'hibrido'])
  workRegime?: 'presencial' | 'remoto' | 'hibrido';

  @IsOptional() @IsIn(['clt', 'pj', 'terceirizado', 'estagio', 'outro'])
  employmentType?: 'clt' | 'pj' | 'terceirizado' | 'estagio' | 'outro';

  @IsOptional() @IsInt() @Min(0) @Max(60)
  weeklyOvertimeHours?: number;

  // Consentimento explícito (LGPD) — obrigatório para registrar a triagem
  @IsOptional()
  consentGiven?: boolean;
}
