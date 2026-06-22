// apps/api/src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new UnauthorizedException('Token inválido ou expirado');
    return user;
  }
}

// apps/api/src/common/guards/active-user.guard.ts
import { CanActivate } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.status !== 'active') {
      throw new ForbiddenException('Conta não ativa. Verifique seu e-mail.');
    }
    return true;
  }
}
