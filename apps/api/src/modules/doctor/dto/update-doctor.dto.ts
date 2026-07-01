// apps/api/src/modules/doctor/dto/update-doctor.dto.ts
import {
  IsString, IsOptional, IsArray, IsUrl, IsNumber, Min, Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDoctorDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthPlans?: string[];

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultPrice?: number;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  addressState?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  education?: any[];

  @IsOptional()
  @IsArray()
  certifications?: any[];
}
