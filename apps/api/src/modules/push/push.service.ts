// apps/api/src/modules/push/push.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as admin from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const projectId   = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey  = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    // Credenciais ausentes ou placeholder → desabilita push silenciosamente
    if (!projectId || !clientEmail || !privateKey ||
        privateKey.includes('...') || privateKey.length < 100) {
      this.logger.warn('Firebase credentials not configured — push notifications disabled');
      return;
    }

    try {
      // Evita re-inicializar em hot-reload
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin initialized ✓');
    } catch (err: any) {
      this.logger.warn(`Firebase init failed — push disabled. Reason: ${err.message}`);
    }
  }

  // ── Token management ───────────────────────────────────────────────────────

  async registerToken(userId: string, token: string, platform: 'web' | 'android' | 'ios', deviceId?: string) {
    return this.prisma.deviceToken.upsert({
      where:  { userId_token: { userId, token } },
      update: { platform: platform as any, deviceId, updatedAt: new Date() },
      create: { userId, token, platform: platform as any, deviceId },
    });
  }

  async unregisterToken(userId: string, token: string) {
    try {
      await this.prisma.deviceToken.delete({ where: { userId_token: { userId, token } } });
    } catch { /* token já removido */ }
    return { removed: true };
  }

  async getTokensByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return rows.map(r => r.token);
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  /**
   * Envia push para todos os dispositivos de um usuário.
   * Tokens inválidos são removidos automaticamente.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.initialized) return;

    const tokens = await this.getTokensByUser(userId);
    if (tokens.length === 0) return;

    await this._sendToTokens(tokens, payload, userId);
  }

  /**
   * Envia para múltiplos usuários (ex: todos pacientes de um médico).
   */
  async sendToMany(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.initialized || userIds.length === 0) return;
    await Promise.all(userIds.map(uid => this.sendToUser(uid, payload)));
  }

  private async _sendToTokens(tokens: string[], payload: PushPayload, userId?: string) {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title:    payload.title,
        body:     payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      webpush: {
        notification: { icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png' },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      // Remove tokens inválidos/expirados
      const invalidTokens: string[] = [];
      response.responses.forEach((res, i) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[i]);
          }
        }
      });

      if (invalidTokens.length > 0 && userId) {
        await Promise.all(
          invalidTokens.map(t =>
            this.prisma.deviceToken.deleteMany({ where: { userId, token: t } }),
          ),
        );
        this.logger.debug(`Removed ${invalidTokens.length} stale token(s) for user ${userId}`);
      }

      this.logger.debug(
        `Push sent — success: ${response.successCount}, fail: ${response.failureCount}`,
      );
    } catch (err) {
      this.logger.error('FCM send error', err);
    }
  }
}
