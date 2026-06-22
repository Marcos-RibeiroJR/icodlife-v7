import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('share')
export class ShareController {
  constructor(private svc: ShareService) {}
  @Get()         @UseGuards(JwtAuthGuard) list(@CurrentUser() u: any) { return this.svc.list(u.id); }
  @Post()        @UseGuards(JwtAuthGuard) create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u.id, b); }
  @Delete(':id') @UseGuards(JwtAuthGuard) revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revoke(u.id, id); }
  @Get('view/:token') view(@Param('token') t: string, @Req() req: any) { return this.svc.view(t, req.ip); }
}
