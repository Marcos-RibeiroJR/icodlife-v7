import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InviteFamilyDto } from './dto/invite-family.dto';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private familyService: FamilyService) {}
  @Get() list(@CurrentUser() u: any) { return this.familyService.getFamily(u.id); }
  @Post('invite') invite(@CurrentUser() u: any, @Body() dto: InviteFamilyDto, @Param() p: any) { return this.familyService.invite(u.id, dto, ''); }
  @Post('invite/:token/accept') accept(@CurrentUser() u: any, @Param('token') token: string) { return this.familyService.acceptInvite(token, u.id, ''); }
  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.familyService['prisma'].familyMember.delete({ where: { id, userId: u.id } }); }
  @Get('hereditary') hereditary(@CurrentUser() u: any) { return this.familyService.getHereditaryData(u.id); }
}
