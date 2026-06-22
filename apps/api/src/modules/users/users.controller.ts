import { Controller, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('users') @UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private svc: UsersService) {}
  @Get('me') me(@CurrentUser() u: any) { return this.svc.findMe(u.id); }
  @Patch('me') update(@CurrentUser() u: any, @Body() b: any) { return this.svc.update(u.id, b); }
  @Get('me/sessions') sessions(@CurrentUser() u: any) { return this.svc.getSessions(u.id); }
  @Delete('me/sessions/:id') revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revokeSession(u.id, id); }
  @Get('me/access-log') log(@CurrentUser() u: any) { return this.svc.getAccessLog(u.id); }
}
