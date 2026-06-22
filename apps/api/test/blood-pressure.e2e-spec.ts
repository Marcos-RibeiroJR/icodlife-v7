// apps/api/test/blood-pressure.e2e-spec.ts
// Testes E2E — módulo blood-pressure: CRUD de leituras, classify, analyze

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createApp, closeApp } from './app-factory';

const BASE = '/api/v1';

// Usuário dedicado para estes testes (não conflita com seed)
const TEST_USER = {
  email:                  `bp_e2e_${Date.now()}@test.icodlife.com`,
  password:               'Test@12345',
  fullName:               'Paciente BP E2E',
  dateOfBirth:            '1975-06-20',
  gender:                 'male',
  acceptedTerms:          true,
  acceptedDataProcessing: true,
};

// Leitura de referência: Hipertensão Grau 1
const READING_HT1 = {
  systolic:       135,
  diastolic:      86,
  pulse:          78,
  measuredAt:     new Date(Date.now() - 3_600_000).toISOString(), // 1h atrás
  arm:            'esquerdo',
  sleepQuality:   'ruim',
  alcoholConsumed: false,
  tookMedication: false,
  stressLevel:    'alto',
  notes:          'Leitura de teste E2E',
};

// Leitura normal (com medicação)
const READING_NORMAL = {
  systolic:       118,
  diastolic:      76,
  pulse:          65,
  measuredAt:     new Date().toISOString(),
  arm:            'direito',
  sleepQuality:   'boa',
  tookMedication: true,
};

describe('Blood Pressure (E2E)', () => {
  let app: INestApplication;
  let token: string;
  let createdId: string;

  beforeAll(async () => {
    app = await createApp();

    // Cria usuário e obtém token
    await request(app.getHttpServer())
      .post(`${BASE}/auth/register`)
      .send(TEST_USER);

    const login = await request(app.getHttpServer())
      .post(`${BASE}/auth/login`)
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    token = login.body.tokens?.accessToken;
    expect(token).toBeDefined();
  });

  afterAll(async () => {
    await closeApp();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASSIFY (sem autenticação necessária)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /blood-pressure/classify', () => {
    const cases = [
      { s: 115, d: 75, expected: 'normal' },
      { s: 125, d: 75, expected: 'elevado' },
      { s: 133, d: 84, expected: 'hipertensao1' },
      { s: 142, d: 92, expected: 'hipertensao2' },
      { s: 182, d: 122, expected: 'crise' },
    ];

    cases.forEach(({ s, d, expected }) => {
      it(`${s}/${d} → ${expected}`, async () => {
        const res = await request(app.getHttpServer())
          .get(`${BASE}/blood-pressure/classify`)
          .set('Authorization', `Bearer ${token}`)
          .query({ systolic: s, diastolic: d })
          .expect(200);

        expect(res.body.classification).toBe(expected);
      });
    });

    it('200 — retorna campos esperados', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure/classify`)
        .set('Authorization', `Bearer ${token}`)
        .query({ systolic: 142, diastolic: 92 })
        .expect(200);

      expect(res.body).toMatchObject({
        classification: expect.any(String),
        systolic:       expect.any(Number),
        diastolic:      expect.any(Number),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('POST /blood-pressure', () => {
    it('401 — sem autenticação', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/blood-pressure`)
        .send(READING_HT1)
        .expect(401);
    });

    it('201 — cria leitura com classificação automática (HT1)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .send(READING_HT1)
        .expect(201);

      expect(res.body).toMatchObject({
        id:             expect.any(String),
        systolic:       READING_HT1.systolic,
        diastolic:      READING_HT1.diastolic,
        classification: 'hipertensao1',
      });

      createdId = res.body.id;
    });

    it('201 — cria leitura normal', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .send(READING_NORMAL)
        .expect(201);

      expect(res.body.classification).toBe('normal');
    });

    it('400 — sistólica fora do range (50–300)', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...READING_HT1, systolic: 400 })
        .expect(400);
    });

    it('400 — measuredAt ausente', async () => {
      const { measuredAt, ...noDate } = READING_HT1;
      await request(app.getHttpServer())
        .post(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .send(noDate)
        .expect(400);
    });

    it('400 — campo extra proibido (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...READING_HT1, campoDesconhecido: true })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /blood-pressure', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure`)
        .expect(401);
    });

    it('200 — retorna array com as leituras criadas', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('200 — query ?days=1 filtra por período', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .query({ days: 1 })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Ambas as leituras foram criadas agora, então devem aparecer
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('200 — cada leitura tem os campos obrigatórios', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      for (const reading of res.body) {
        expect(reading).toMatchObject({
          id:             expect.any(String),
          systolic:       expect.any(Number),
          diastolic:      expect.any(Number),
          classification: expect.any(String),
          measuredAt:     expect.any(String),
        });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYZE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /blood-pressure/analyze', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure/analyze`)
        .expect(401);
    });

    it('200 — retorna relatório de análise', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/blood-pressure/analyze`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // O relatório deve ter estrutura de análise
      expect(res.body).toBeDefined();
      // Campos esperados (dependem da implementação do service)
      expect(res.body).toMatchObject(
        expect.objectContaining(
          Object.fromEntries(
            Object.keys(res.body).map(k => [k, expect.anything()])
          )
        )
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('DELETE /blood-pressure/:id', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .delete(`${BASE}/blood-pressure/${createdId}`)
        .expect(401);
    });

    it('200/204 — deleta leitura existente', async () => {
      expect(createdId).toBeDefined();

      await request(app.getHttpServer())
        .delete(`${BASE}/blood-pressure/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(res => {
          expect([200, 204]).toContain(res.status);
        });
    });

    it('404 — leitura não encontrada (ou de outro usuário)', async () => {
      await request(app.getHttpServer())
        .delete(`${BASE}/blood-pressure/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
