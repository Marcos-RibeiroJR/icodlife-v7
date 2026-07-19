// apps/api/src/modules/clinic/dto/clinic-room.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ClinicRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  floor?: string;

  // custo de ocupação da sala — usado pro débito automático na conta corrente do médico
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPerHour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPerUse?: number;
}
