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
      if ((err as any).__logged) return;
      (err as any).__logged = true;
      this.logger.warn(`Redis indisponível (${err.message}) — cache desabilitado`);
    });

    this.client.connect().catch(() => {
      this.logger.warn('Redis não conectou — aplicação funcionando sem cache');
      this.client = null;
    });
  }

  private get isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable) return null;
    try { return await this.client!.get(key); } catch { return null; }
  }

  async set(key: string, value: string, ttlSeconds = 0): Promise<void> {
    if (!this.isAvailable) return;
    try {
      if (ttlSeconds > 0) await this.client!.setex(key, ttlSeconds, value);
      else await this.client!.set(key, value);
    } catch { /* silencioso */ }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable) return;
    try { await this.client!.del(key); } catch { /* silencioso */ }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;
    try { return (await this.client!.exists(key)) === 1; } catch { return false; }
  }

  async onModuleDestroy() {
    if (this.client) {
      try { await this.client.quit(); } catch { /* ignora */ }
    }
  }
}
