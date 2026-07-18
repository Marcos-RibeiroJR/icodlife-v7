// apps/api/src/modules/clinic/dto/update-clinic.dto.ts
import { IsString, IsOptional, IsArray, Length } from 'class-validator';

export class UpdateClinicDto {
  @IsOptional() @IsString() razaoSocial?: string;
  @IsOptional() @IsString() nomeFantasia?: string;
  @IsOptional() @IsString() tipoEstabelecimento?: string;
  @IsOptional() @IsString() cnes?: string;

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
  @IsOptional() @IsString() logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthPlans?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];
}
