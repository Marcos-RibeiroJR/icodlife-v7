// apps/api/src/modules/push/push.controller.ts
import {
  Body, Controller, Delete, Get, HttpCode, Post, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PushService } from './push.service';

class RegisterTokenDto {
  token!: string;
  platform!: 'web' | 'android' | 'ios';
  deviceId?: string;
}

class UnregisterTokenDto {
  token!: string;
}

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private pushService: PushService) {}

  /** Registra (ou atualiza) um FCM token para o usuário logado */
  @Post('token')
  @HttpCode(200)
  async register(@Req() req: any, @Body() dto: RegisterTokenDto) {
    return this.pushService.registerToken(req.user.id, dto.token, dto.platform, dto.deviceId);
  }

  /** Remove um FCM token (logout ou troca de dispositivo) */
  @Delete('token')
  @HttpCode(200)
  async unregister(@Req() req: any, @Body() dto: UnregisterTokenDto) {
    return this.pushService.unregisterToken(req.user.id, dto.token);
  }

  /** Lista tokens registrados do usuário (debug) */
  @Get('tokens')
  async list(@Req() req: any) {
    const tokens = await this.pushService.getTokensByUser(req.user.id);
    return { count: tokens.length, tokens };
  }
}
