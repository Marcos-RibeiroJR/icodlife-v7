// apps/api/src/modules/family/dto/invite-family.dto.ts
import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class InviteFamilyDto {
  @IsEnum(['father','mother','sibling','child','grandparent','grandchild','spouse','partner','other'])
  relationship: string;

  @IsOptional() @IsString() customLabel?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsBoolean() shareHereditary?: boolean;
  @IsOptional() @IsBoolean() shareConditions?: boolean;
}
