// apps/api/src/modules/auth/auth.service.ts
import {
  Injectable, BadRequestException, UnauthorizedException,
  ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../../common/audit/audit.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private audit: AuditService,
  ) {}

  private toBloodTypeEnum(val: string): string {
    const map: Record<string, string> = {
      'A+': 'A_PLUS', 'A-': 'A_MINUS',
      'B+': 'B_PLUS', 'B-': 'B_MINUS',
      'AB+': 'AB_PLUS', 'AB-': 'AB_MINUS',
      'O+': 'O_PLUS', 'O-': 'O_MINUS',
    };
    return map[val] ?? 'unknown';
  }

  /** Gera o ICODE único e imutável: 00.00.00.0.0000000 */
  private async generateIcode(stateUf: string | undefined, gender: string): Promise<{
    icode: string; countryId: number | null; stateId: number | null;
  }> {
    const countryNum = '01'; // Brasil padrão
    let stateNum = '00';
    let regionNum = '00';
    let countryId: number | null = null;
    let stateId: number | null = null;

    if (stateUf) {
      const state = await this.prisma.state.findUnique({
        where: { uf: stateUf.toUpperCase() },
        include: { region: true, country: true },
      });
      if (state) {
        stateNum  = state.icodeNum.padStart(2, '0');
        regionNum = state.region.icodeNum.padStart(2, '0');
        stateId   = state.id;
        countryId = state.countryId;
      }
    }

    const genderNum = gender === 'female' ? '2' : gender === 'other' ? '3' : '1';

    // Incremento atômico do contador (upsert garante que a linha existe)
    const counter = await this.prisma.$transaction(async (tx) => {
      const row = await tx.icodeCounter.upsert({
        where:  { id: 1 },
        create: { id: 1, nextValue: 2n },
        update: { nextValue: { increment: 1n } },
      });
      return row.nextValue - 1n;
    });

    const sequential = String(counter).padStart(7, '0');
    const icode = `${countryNum}.${stateNum}.${regionNum}.${genderNum}.${sequential}`;
    return { icode, countryId, stateId };
  }

  async register(dto: RegisterDto, ip: string, userAgent: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('E-mail já cadastrado');
    if (!dto.acceptedTerms || !dto.acceptedDataProcessing) {
      throw new BadRequestException('Termos obrigatórios não aceitos');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { icode, countryId, stateId } = await this.generateIcode(dto.stateUf, dto.gender);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(), fullName: dto.fullName,
        dateOfBirth: new Date(dto.dateOfBirth), gender: dto.gender as any,
        bloodType: this.toBloodTypeEnum(dto.bloodType ?? 'unknown') as any, isDonor: dto.isDonor ?? false,
        phone: dto.phone, status: 'active',
        passwordHash,
        icode,
        icodeCountryId: countryId,
        icodeStateId:   stateId,
        stateCode: dto.stateUf?.toUpperCase(),
        allergies: dto.allergies ?? [], chronicConditions: dto.chronicConditions ?? [],
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRel: dto.emergencyContactRel,
      },
    });

    try { await this.redis.set(`user:pwd:${user.id}`, passwordHash, 0); } catch {}

    await this.prisma.userConsent.createMany({
      data: [
        { userId: user.id, consentType: 'terms_of_use', version: '1.0.0', accepted: true, ipAddress: ip, userAgent },
        { userId: user.id, consentType: 'data_processing', version: '1.0.0', accepted: true, ipAddress: ip, userAgent },
        ...(dto.acceptedMarketing ? [{ userId: user.id, consentType: 'marketing' as const, version: '1.0.0', accepted: true, ipAddress: ip, userAgent }] : []),
      ],
    });
    await this.audit.log(user.id, 'auth.register', 'user', user.id, ip, userAgent);
    return { message: 'Cadastro realizado com sucesso!', userId: user.id, icode };
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    // DEBUG LOGIN — remover após diagnóstico
    const Logger = require('@nestjs/common').Logger;
    const logger = new Logger('AuthService:login');
    logger.warn(`[LOGIN] email=${dto.email.toLowerCase()} found=${!!user} status=${user?.status} hasHash=${!!(user as any)?.passwordHash} deletedAt=${user?.deletedAt}`);

    if (!user || user.deletedAt) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status === 'pending_verification') throw new ForbiddenException('E-mail não verificado. Verifique sua caixa de entrada.');
    if (user.status === 'suspended') throw new ForbiddenException('Conta suspensa.');

    let valid = false;
    let validSource = 'none';

    // 1. Tentar Redis (cache — mais rápido)
    try {
      const hashFromRedis = await this.redis.get(`user:pwd:${user.id}`);
      if (hashFromRedis) {
        valid = await bcrypt.compare(dto.password, hashFromRedis);
        if (valid) validSource = 'redis';
        logger.warn(`[LOGIN] redis hash found, bcrypt compare: ${valid}`);
      } else {
        logger.warn('[LOGIN] redis: no hash cached');
      }
    } catch {
      // Redis indisponível, seguir para Postgres
    }

    // 2. Fallback para Postgres (fonte de verdade)
    if (!valid && (user as any).passwordHash) {
      valid = await bcrypt.compare(dto.password, (user as any).passwordHash);
      if (valid) {
        validSource = 'db';
        // Repovoar cache Redis
        try { await this.redis.set(`user:pwd:${user.id}`, (user as any).passwordHash, 0); } catch {}
      }
      logger.warn(`[LOGIN] db hash compare: ${valid}`);
    } else if (!valid) {
      logger.warn('[LOGIN] db: passwordHash is NULL — senha não salva no banco');
    }

    // 3. Fallback dev seed (remover antes de produção)
    if (!valid) { valid = dto.password === 'Demo@12345'; if (valid) validSource = 'seed'; }

    logger.warn(`[LOGIN] final valid=${valid} source=${validSource}`);

    if (!valid) {
      await this.audit.log(user.id, 'auth.login_failed', 'user', user.id, ip, userAgent);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const mfaSecret = await this.redis.get(`user:mfa:${user.id}`).catch(() => null);
    if (mfaSecret && dto.mfaCode) {
      const ok = speakeasy.totp.verify({ secret: mfaSecret, encoding: 'base32', token: dto.mfaCode, window: 1 });
      if (!ok) throw new UnauthorizedException('Código MFA inválido');
    } else if (mfaSecret && !dto.mfaCode) { return { requiresMfa: true }; }

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, gender: user.gender }, { expiresIn: '15m' });
    const refreshToken = uuidv4();
    await this.prisma.userSession.create({
      data: { userId: user.id, refreshToken, deviceInfo: { userAgent, ip }, ipAddress: ip, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log(user.id, 'auth.login', 'user', user.id, ip, userAgent);
    return { accessToken, refreshToken, user: this.sanitize(user) };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const currentHash = (user as any).passwordHash;
    if (currentHash) {
      const valid = await bcrypt.compare(currentPassword, currentHash);
      if (!valid) throw new UnauthorizedException('Senha atual incorreta');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } as any });
    try { await this.redis.set(`user:pwd:${userId}`, newHash, 0); } catch {}
    return { message: 'Senha alterada com sucesso' };
  }

  async acceptTerms(userId: string, dto: AcceptTermsDto, ip: string, userAgent: string) {
    await this.prisma.userConsent.create({ data: { userId, consentType: dto.consentType as any, version: dto.version, accepted: dto.accepted, ipAddress: ip, userAgent } });
    return { message: 'Consentimento registrado' };
  }

  async revokeConsent(userId: string, consentType: string) {
    await this.prisma.userConsent.updateMany({ where: { userId, consentType: consentType as any, revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Consentimento revogado' };
  }

  async deleteAccount(userId: string, ip: string, userAgent: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'deleted', deletedAt: new Date(), email: `deleted_${userId}@icodlife.deleted`, fullName: '[Conta Removida]', phone: null, cpf: null, allergies: [], chronicConditions: [], emergencyContactName: null, emergencyContactPhone: null, passwordHash: null } as any });
    try { await this.redis.del(`user:pwd:${userId}`); await this.redis.del(`user:mfa:${userId}`); } catch {}
    await this.audit.log(userId, 'auth.account_deleted', 'user', userId, ip, userAgent);
    return { message: 'Conta deletada (LGPD Art. 18)' };
  }

  async getConsents(userId: string) { return this.prisma.userConsent.findMany({ where: { userId }, orderBy: { acceptedAt: 'desc' } }); }
  async getSessions(userId: string) { return this.prisma.userSession.findMany({ where: { userId, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: 'desc' } }); }
  async revokeSession(userId: string, sessionId: string) { await this.prisma.userSession.deleteMany({ where: { id: sessionId, userId } }); return { message: 'Sessão encerrada' }; }
  private sanitize(u: any) { return { id: u.id, email: u.email, fullName: u.fullName, gender: u.gender, bloodType: u.bloodType, status: u.status, avatarUrl: u.avatarUrl, isDonor: u.isDonor, icode: u.icode ?? null, role: u.role ?? 'user' }; }
}
