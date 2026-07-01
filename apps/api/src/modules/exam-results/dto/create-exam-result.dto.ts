// apps/api/src/modules/exam-results/dto/create-exam-result.dto.ts
import {
  IsString, IsOptional, IsNumber, IsArray,
  IsDateString, ValidateNested, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamItemDto {
  @IsString()
  marker: string;

  @IsOptional() @IsString()
  markerCode?: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsNumber()
  value: number;

  @IsOptional() @IsString()
  rawValue?: string;

  @IsOptional() @IsNumber()
  refValue?: number;
}

export class CreateExamResultDto {
  @IsDateString()
  examDate: string;

  @IsOptional() @IsString()
  labName?: string;

  @IsOptional() @IsString()
  doctorName?: string;

  @IsOptional() @IsString()
  examType?: string;

  @IsOptional() @IsString()
  healthRecordId?: string;

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamItemDto)
  items?: CreateExamItemDto[];
}
