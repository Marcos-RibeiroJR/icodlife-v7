// apps/api/src/common/redis/redis.service.ts
// Redis opcional — se não estiver disponível, operações são no-op (não travam o boot)
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL não configurado — cache Redis desabilitado');
      return;
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      retryStrategy: () => null, // não fica tentando reconectar
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      // Log uma vez silenciosamente — não trava o app
      if ((err as any).logged) return;
      (err as any).logged = true;
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try { return await this.client.get(key); } catch { return null; }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) await this.client.setex(key, ttlSeconds, value);
      else await this.client.set(key, value);
    } catch { /* ignore */ }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try { await this.client.del(key); } catch { /* ignore */ }
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit().catch(() => {});
  }
}
