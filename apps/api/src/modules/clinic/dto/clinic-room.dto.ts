// apps/api/src/modules/clinic/dto/clinic-room.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ClinicRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  floor?: string;
}
