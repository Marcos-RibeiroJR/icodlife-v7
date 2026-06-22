// apps/api/test/app-factory.ts
// Cria uma instância NestJS completa para os testes E2E
// O banco de dados é controlado pela variável DATABASE_URL no environment.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

let app: INestApplication;

export async function createApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  // Mesmas configs do main.ts
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Registra /health igual ao main.ts
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await app.init();
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) await app.close();
}
