// apps/api/src/common/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    resource?: string | null,
    resourceId?: string | null,
    ip?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource: resource ?? 'unknown',
          resourceId,
          ipAddress: ip,
          userAgent,
          metadata: metadata as any,
        },
      });
    } catch (e) {
      console.error('Audit log failed:', e);
    }
  }
}
