// apps/api/src/modules/clinic/dto/create-clinic.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, Length, Matches } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  razaoSocial: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos (sem pontuação)' })
  cnpj: string;

  @IsOptional()
  @IsString()
  tipoEstabelecimento?: string; // clinica | consultorio | hospital | laboratorio

  @IsOptional()
  @IsString()
  cnes?: string;

  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  estado?: string;

  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() site?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthPlans?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];
}
