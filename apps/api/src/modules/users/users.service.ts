import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
  update(userId: string, data: any) { return this.prisma.user.update({ where: { id: userId }, data }); }
  getSessions(userId: string) { return this.prisma.userSession.findMany({ where: { userId, expiresAt: { gt: new Date() } } }); }
  revokeSession(userId: string, id: string) { return this.prisma.userSession.deleteMany({ where: { id, userId } }); }
  getAccessLog(userId: string) { return this.prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
}
