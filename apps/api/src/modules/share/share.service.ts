import { Injectable, GoneException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}
  list(userId: string) { return this.prisma.shareToken.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }); }
  create(userId: string, d: any) { return this.prisma.shareToken.create({ data: { userId, accessLevel: (d.accessLevel||'basic') as any, customFields: d.customFields||[], expiresAt: new Date(Date.now()+(d.durationHours||1)*3600000) } }); }
  async revoke(userId: string, id: string) { await this.prisma.shareToken.updateMany({ where: { id, userId }, data: { revokedAt: new Date() } }); return { message: 'Revogado' }; }
  async view(token: string, ip: string) {
    const t = await this.prisma.shareToken.findFirst({ where: { token, revokedAt: null, expiresAt: { gt: new Date() } }, include: { user: { select: { fullName:true, bloodType:true, allergies:true, isDonor:true, emergencyContactName:true, emergencyContactPhone:true } } } });
    if (!t) throw new GoneException('Link expirado ou inválido');
    await this.prisma.shareToken.update({ where: { id: t.id }, data: { accessedAt: new Date(), accessIp: ip } });
    return t;
  }
}
