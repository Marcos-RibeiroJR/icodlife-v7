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
  refMin?: number;

  @IsOptional() @IsNumber()
  refMax?: number;

  @IsOptional() @IsString()
  refSource?: string;
}

export class CreateExamResultDto {
  @IsDateString()
  examDate: string;

  @IsOptional() @IsString()
  labName?: string;

  @IsOptional() @IsString()
  doctorName?: string;

  @IsString()
  @IsIn(['hemograma','bioquimica','hormonal','lipidograma','urina','outro'])
  examType: string;

  @IsOptional() @IsString()
  healthRecordId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamItemDto)
  items?: CreateExamItemDto[];
}
