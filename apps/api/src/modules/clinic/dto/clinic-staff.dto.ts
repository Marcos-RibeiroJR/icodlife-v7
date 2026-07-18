// apps/api/src/modules/clinic/dto/clinic-staff.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class AddClinicStaffDto {
  // icode ou e-mail do usuário já cadastrado no ICODLIFE
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsOptional()
  @IsIn(['admin', 'reception', 'financeiro', 'nurse'])
  role?: 'admin' | 'reception' | 'financeiro' | 'nurse';
}
