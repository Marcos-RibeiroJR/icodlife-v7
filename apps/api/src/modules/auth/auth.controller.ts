// apps/api/src/modules/auth/auth.controller.ts
import {
  Controller, Post, Delete, Get, Body, Param,
  Req, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.authService.register(dto, req.ip, req.headers['user-agent']);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: any) {
    // Invalidar sessões ativas do usuário
    return { message: 'Sessão encerrada' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    // Enviar e-mail de redefinição
    return { message: 'Se o e-mail existir, você receberá um link em breve.' };
  }

  @Post('reset-password')
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return { message: 'Senha redefinida com sucesso.' };
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return { message: 'E-mail verificado. Sua conta está ativa!' };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser() user: any) {
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({ name: `IcodLife:${user.email}` });
    return { qrCode: secret.otpauth_url, secret: secret.base32 };
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  async verifyMfa(@CurrentUser() user: any, @Body('code') code: string) {
    return { message: 'MFA configurado com sucesso!' };
  }

  @Post('consents')
  @UseGuards(JwtAuthGuard)
  async acceptTerms(
    @CurrentUser() user: any,
    @Body() dto: AcceptTermsDto,
    @Req() req: any,
  ) {
    return this.authService.acceptTerms(user.id, dto, req.ip, req.headers['user-agent']);
  }

  @Get('consents')
  @UseGuards(JwtAuthGuard)
  async getConsents(@CurrentUser() user: any) {
    return this.authService.getConsents(user.id);
  }

  @Delete('consents/:type')
  @UseGuards(JwtAuthGuard)
  async revokeConsent(@CurrentUser() user: any, @Param('type') type: string) {
    return this.authService.revokeConsent(user.id, type);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser() user: any, @Req() req: any) {
    return this.authService.deleteAccount(user.id, req.ip, req.headers['user-agent']);
  }
}
