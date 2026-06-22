// apps/api/src/common/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev_jwt_secret',
    });
  }

  async validate(payload: { sub: string; email: string; gender: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, fullName: true,
        gender: true, status: true, bloodType: true,
        isDonor: true, avatarUrl: true, role: true,
      },
    });
    if (!user || user.status === 'deleted') {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return user;
  }
}
