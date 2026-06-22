// apps/api/src/modules/auth/dto/register.dto.ts
import {
  IsEmail, IsString, IsEnum, IsDateString, IsOptional,
  IsBoolean, IsArray, MinLength, MaxLength, Matches, IsPhoneNumber
} from 'class-validator';

export enum GenderType { male = 'male', female = 'female', other = 'other' }
export enum BloodType {
  A_PLUS='A+', A_MINUS='A-', B_PLUS='B+', B_MINUS='B-',
  AB_PLUS='AB+', AB_MINUS='AB-', O_PLUS='O+', O_MINUS='O-', UNKNOWN='unknown'
}

export class RegisterDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Senha deve conter maiúscula, minúscula, número e símbolo',
  })
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  fullName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(GenderType, { message: 'Gênero deve ser male, female ou other' })
  gender: GenderType;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsBoolean()
  isDonor?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido' })
  phone?: string;

  // Emergency
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() emergencyContactRel?: string;

  // Health (optional on registration)
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) chronicConditions?: string[];

  // Localização (para ICODE)
  @IsOptional()
  @IsString()
  stateUf?: string;   // "SP", "RJ", etc.

  // Consent — obrigatório
  @IsBoolean()
  acceptedTerms: boolean;

  @IsBoolean()
  acceptedDataProcessing: boolean;

  @IsOptional()
  @IsBoolean()
  acceptedMarketing?: boolean;
}
