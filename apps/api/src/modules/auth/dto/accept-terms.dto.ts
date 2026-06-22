// apps/api/src/modules/auth/dto/accept-terms.dto.ts
import { IsString, IsBoolean } from 'class-validator';

export class AcceptTermsDto {
  @IsString()
  consentType: string;

  @IsString()
  version: string;

  @IsBoolean()
  accepted: boolean;
}
