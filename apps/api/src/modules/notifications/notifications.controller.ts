// apps/api/src/modules/notifications/notifications.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationService) {}

  @Get()
  list(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page')       page?:       string,
    @Query('limit')      limit?:      string,
  ) {
    return this.svc.findAll(req.user.userId, {
      unreadOnly: unreadOnly === 'true',
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.svc.getUnreadCount(req.user.userId);
  }

  @Patch('read-all')
  readAll(@Request() req: any) {
    return this.svc.markAllAsRead(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.svc.markAsRead(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user.userId, id);
  }

  @Post('seed')
  seed(@Request() req: any) {
    return this.svc.seed(req.user.userId);
  }
}
