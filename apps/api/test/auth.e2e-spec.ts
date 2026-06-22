// apps/api/test/auth.e2e-spec.ts
// Testes E2E — autenticação: register, login, guards JWT

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createApp, closeApp } from './app-factory';

const BASE = '/api/v1';

// E-mail único por run de teste para evitar conflito com seed
const TEST_EMAIL = `e2e_${Date.now()}@test.icodlife.com`;
const TEST_PASS  = 'Test@12345';

const validUser = {
  email:                TEST_EMAIL,
  password:             TEST_PASS,
  fullName:             'Usuário Teste E2E',
  dateOfBirth:          '1990-01-15',
  gender:               'male',
  acceptedTerms:        true,
  acceptedDataProcessing: true,
};

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('201 — cria conta com dados válidos', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/register`)
        .send(validUser)
        .expect(201);

      expect(res.body).toMatchObject({
        user: expect.objectContaining({
          email:    TEST_EMAIL,
          fullName: 'Usuário Teste E2E',
          gender:   'male',
        }),
        tokens: expect.objectContaining({
          accessToken:  expect.any(String),
          refreshToken: expect.any(String),
        }),
      });
    });

    it('409 — e-mail já cadastrado', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/register`)
        .send(validUser)
        .expect(409);
    });

    it('400 — e-mail inválido', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/register`)
        .send({ ...validUser, email: 'nao-e-email', password: TEST_PASS })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('mail')]),
      );
    });

    it('400 — senha fraca (sem símbolo)', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/register`)
        .send({ ...validUser, email: `weak_${Date.now()}@test.com`, password: 'Senha1234' })
        .expect(400);
    });

    it('400 — campos obrigatórios ausentes', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/register`)
        .send({ email: TEST_EMAIL })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('200 — login com credenciais corretas', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({ email: TEST_EMAIL, password: TEST_PASS })
        .expect(200);

      expect(res.body).toMatchObject({
        user:   expect.objectContaining({ email: TEST_EMAIL }),
        tokens: expect.objectContaining({ accessToken: expect.any(String) }),
      });

      accessToken = res.body.tokens.accessToken;
    });

    it('401 — senha incorreta', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({ email: TEST_EMAIL, password: 'SenhaErrada@1' })
        .expect(401);
    });

    it('401 — e-mail não cadastrado', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({ email: 'naoexiste@test.com', password: TEST_PASS })
        .expect(401);
    });

    it('400 — body vazio', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ROTA PROTEGIDA — JWT Guard
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Rotas protegidas (JwtAuthGuard)', () => {
    it('401 — GET /users/profile sem token', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users/profile`)
        .expect(401);
    });

    it('200 — GET /users/profile com token válido', async () => {
      // Garante que temos token (pode ter falhado o login acima)
      if (!accessToken) {
        const res = await request(app.getHttpServer())
          .post(`${BASE}/auth/login`)
          .send({ email: TEST_EMAIL, password: TEST_PASS });
        accessToken = res.body.tokens?.accessToken;
      }

      const res = await request(app.getHttpServer())
        .get(`${BASE}/users/profile`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: TEST_EMAIL });
    });

    it('401 — token malformado', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users/profile`)
        .set('Authorization', 'Bearer token.invalido.aqui')
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTH ENDPOINT (fora do prefixo api/v1)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('200 — retorna status ok (sem autenticação)', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(res.body).toMatchObject({
        status:    'ok',
        timestamp: expect.any(String),
      });
    });
  });
});
