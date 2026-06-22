import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  constructor(private svc: AiChatService) {}
  @Post('start')   start(@CurrentUser() u: any) { return this.svc.startDailySession(u.id); }
  @Post('message') msg(@CurrentUser() u: any, @Body('message') m: string) { return this.svc.sendMessage(u.id, m); }
  @Get('history')  history(@CurrentUser() u: any, @Query('days') d: string) { return this.svc.getChatHistory(u.id, d ? +d : 7); }
}
