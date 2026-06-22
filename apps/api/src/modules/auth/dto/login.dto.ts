// apps/api/src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString, IsOptional, Length } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'Código MFA deve ter 6 dígitos' })
  mfaCode?: string;
}
