// apps/api/src/modules/doctor/dto/become-doctor.dto.ts
import {
  IsString, IsNotEmpty, IsOptional, IsArray,
  Length, Matches, IsUrl, IsNumber, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BecomeDoctorDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 10)
  crm: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve ter 2 letras maiúsculas, ex: SP' })
  uf: string;

  @IsArray()
  @IsString({ each: true })
  specialties: string[];

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
}
