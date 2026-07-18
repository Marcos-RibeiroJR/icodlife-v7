// apps/api/src/modules/clinic/dto/link-doctor.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkDoctorDto {
  // aceita o icode do médico (User.icode) OU "CRM.UF" (ex.: "123456.SP")
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsOptional()
  @IsIn(['owner', 'associated', 'visiting'])
  role?: 'owner' | 'associated' | 'visiting';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPct?: number;

  @IsOptional()
  @IsString()
  roomId?: string;
}
