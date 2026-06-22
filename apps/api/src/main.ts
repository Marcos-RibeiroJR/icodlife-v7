// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://app.icodlife.com.br',
      'https://icodlife.com.br',
    ],
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT || 3001);
  console.log(`🚀 IcodLife API rodando em: ${await app.getUrl()}`);
}
bootstrap();
