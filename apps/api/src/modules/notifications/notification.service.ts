import { Injectable } from '@nestjs/common';
@Injectable()
export class NotificationService {
  async sendFamilyInvite(data: any) { console.log('[NOTIF] Convite familiar:', data.to); return true; }
  async sendPush(userId: string, title: string, body: string) { console.log(`[PUSH] ${userId}: ${title}`); return true; }
}
