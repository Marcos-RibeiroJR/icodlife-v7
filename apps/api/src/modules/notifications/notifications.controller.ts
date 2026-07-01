// apps/api/src/modules/notifications/notifications.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Query, Req,
  UseGuards, Sse, Res,
} from '@nestjs/common';
// @ts-ignore – rxjs peer dep of NestJS; run `pnpm install` if unresolved
import { Observable, Subject, interval, merge } from 'rxjs';
// @ts-ignore
import { map } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  private static streams = new Map<string, Subject<any>>();

  /** Called by NotificationService after DB insert */
  static push(userId: string, notification: any): void {
    NotificationsController.streams.get(userId)?.next(notification);
  }

  constructor(private svc: NotificationService) {}

  // ── SSE stream ────────────────────────────────────────────────────────────
  @Sse('stream')
  stream(@Req() req: any, @Res() res: any): Observable<any> {
    const userId: string = req.user?.id ?? req.user?.userId;

    const subject = new Subject<any>();
    NotificationsController.streams.set(userId, subject);

    const heartbeat$ = interval(30_000).pipe(
      map(() => ({ data: JSON.stringify({ type: 'ping' }) })),
    );
    const notif$ = subject.pipe(
      map((n: any) => ({ data: JSON.stringify(n) })),
    );

    res.on('close', () => {
      subject.complete();
      NotificationsController.streams.delete(userId);
    });

    return merge(heartbeat$, notif$);
  }

  // ── REST ──────────────────────────────────────────────────────────────────
  @Get()
  list(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page')       page?:       string,
    @Query('limit')      limit?:      string,
  ) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.svc.findAll(userId, {
      unreadOnly: unreadOnly === 'true',
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.svc.getUnreadCount(req.user?.id ?? req.user?.userId);
  }

  @Patch('read-all')
  readAll(@Req() req: any) {
    return this.svc.markAllAsRead(req.user?.id ?? req.user?.userId);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.svc.markAsRead(req.user?.id ?? req.user?.userId, id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.delete(req.user?.id ?? req.user?.userId, id);
  }

  @Post('seed')
  seed(@Req() req: any) {
    return this.svc.seed(req.user?.id ?? req.user?.userId);
  }
}
