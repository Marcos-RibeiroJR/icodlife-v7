// apps/api/src/modules/meus-medicos/dto/add-doctor.dto.ts
import {
  IsString, IsOptional, ValidateIf, IsNotEmpty, Length, Matches,
} from 'class-validator';

export class AddDoctorDto {
  // Médico interno — informar o doctorId (DR.XXXXX.UF)
  @IsOptional()
  @IsString()
  doctorId?: string;

  // Médico externo — informar CRM + UF + nome
  @ValidateIf(o => !o.doctorId)
  @IsString()
  @IsNotEmpty()
  externalCrm?: string;

  @ValidateIf(o => !o.doctorId)
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'UF deve ter 2 letras maiúsculas' })
  externalUf?: string;

  @ValidateIf(o => !o.doctorId)
  @IsString()
  @IsNotEmpty()
  externalName?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
