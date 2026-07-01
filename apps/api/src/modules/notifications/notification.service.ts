// apps/api/src/modules/notifications/notification.service.ts
import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushService } from '../push/push.service';

export interface CreateNotificationDto {
  type:   string;
  title:  string;
  body:   string;
  data?:  Record<string, any>;
}

export interface ListNotificationsQuery {
  unreadOnly?: boolean;
  page?:       number;
  limit?:      number;
}

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    @Optional() private pushService?: PushService,
  ) {}

  async findAll(userId: string, query: ListNotificationsQuery = {}) {
    const { unreadOnly = false, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notificação não encontrada');
    if (notif.userId !== userId) throw new ForbiddenException();
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async create(userId: string, dto: CreateNotificationDto) {
    const notif = await this.prisma.notification.create({
      data: { userId, type: dto.type, title: dto.title, body: dto.body, data: dto.data ?? undefined },
    });
    // Push to SSE stream if user is connected
    try {
      const { NotificationsController } = require('./notifications.controller');
      NotificationsController.push(userId, notif);
    } catch {}
    // FCM push notification (fire-and-forget)
    if (this.pushService) {
      const stringData: Record<string, string> = {
        notificationId: notif.id,
        type: dto.type,
        ...(dto.data
          ? Object.fromEntries(
              Object.entries(dto.data).map(([k, v]) => [k, String(v)]),
            )
          : {}),
      };
      this.pushService.sendToUser(userId, {
        title: dto.title,
        body:  dto.body,
        data:  stringData,
      }).catch(() => {});
    }
    return notif;
  }

  async delete(userId: string, id: string): Promise<{ deleted: boolean }> {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notificação não encontrada');
    if (notif.userId !== userId) throw new ForbiddenException();
    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }

  async seed(userId: string) {
    const examples = [
      { type: 'exam',        title: 'Resultado de Exame Disponível', body: 'Seu hemograma completo foi processado.' },
      { type: 'medication',  title: 'Lembrete de Medicamento',       body: 'Hora de tomar Losartana 50mg.' },
      { type: 'appointment', title: 'Consulta Amanhã',               body: 'Consulta com Dr. Ricardo Mendes amanhã às 14h.' },
      { type: 'vaccine',     title: 'Vacina Pendente',               body: 'Dose de reforço da vacina contra gripe agendada.' },
      { type: 'alert',       title: 'Pressão Arterial Elevada',      body: 'Última medição: 145/95. Consulte seu médico.' },
      { type: 'share',       title: 'Prontuário Acessado',           body: 'Dr. Ana Lima acessou seu prontuário hoje às 10h32.' },
      { type: 'family',      title: 'Convite de Família',            body: 'João Silva te adicionou como membro da família.' },
    ];
    const created = await Promise.all(examples.map(e => this.create(userId, e)));
    return { created: created.length };
  }

  async sendFamilyInvite(data: any) {
    if (data.userId) {
      await this.create(data.userId, { type: 'family', title: 'Convite de Família', body: `Convite de ${data.from ?? 'alguém'}.` });
    }
    return true;
  }

  async sendPush(userId: string, title: string, body: string) {
    await this.create(userId, { type: 'push', title, body });
    return true;
  }
}
