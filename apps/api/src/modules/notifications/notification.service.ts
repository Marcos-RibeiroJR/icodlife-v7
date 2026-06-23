// apps/api/src/modules/notifications/notification.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateNotificationDto {
  type:   string;
  title:  string;
  body:   string;
  data?:  Re
