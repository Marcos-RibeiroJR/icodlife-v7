// apps/api/src/modules/family/dto/accept-invite.dto.ts
import { IsString } from 'class-validator';

export class AcceptFamilyInviteDto {
  @IsString()
  inviteToken: string;
}
