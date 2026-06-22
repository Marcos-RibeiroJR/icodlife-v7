// apps/api/src/modules/meus-medicos/dto/update-patient-doctor.dto.ts
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdatePatientDoctorDto {
  @IsOptional()
  @IsString()
  @IsIn(['active', 'ended'])
  status?: 'active' | 'ended';

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
