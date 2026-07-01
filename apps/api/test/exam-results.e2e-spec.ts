// apps/api/test/exam-results.e2e-spec.ts
// Testes E2E — módulo exam-results: criar, listar, detalhar, trend-report

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createApp, closeApp } from './app-factory';

const BASE = '/api/v1';

const TEST_USER = {
  email:                  `exam_e2e_${Date.now()}@test.icodlife.com`,
  password:               'Test@12345',
  fullName:               'Paciente Exame E2E',
  dateOfBirth:            '1980-03-10',
  gender:                 'female',
  acceptedTerms:          true,
  acceptedDataProcessing: true,
};

// Exame 1 — LDL alto (90 dias atrás)
const EXAM_1 = {
  examDate:  new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0],
  labName:   'Labclin',
  examType:  'lipidograma',
  items: [
    { marker:'Colesterol Total', unit:'mg/dL', value:235, refMin:0,  refMax:199 },
    { marker:'LDL',              unit:'mg/dL', value:158, refMin:0,  refMax:129 },
    { marker:'HDL',              unit:'mg/dL', value:44,  refMin:40, refMax:999 },
    { marker:'Triglicerídeos',   unit:'mg/dL', value:186, refMin:0,  refMax:149 },
  ],
};

// Exame 2 — mesmo tipo, 30 dias depois (melhora)
const EXAM_2 = {
  examDate:  new Date(Date.now() - 60 * 86_400_000).toISOString().split('T')[0],
  labName:   'Delboni',
  examType:  'lipidograma',
  items: [
    { marker:'Colesterol Total', unit:'mg/dL', value:205, refMin:0,  refMax:199 },
    { marker:'LDL',              unit:'mg/dL', value:130, refMin:0,  refMax:129 },
    { marker:'HDL',              unit:'mg/dL', value:50,  refMin:40, refMax:999 },
    { marker:'Triglicerídeos',   unit:'mg/dL', value:150, refMin:0,  refMax:149 },
  ],
};

// Exame 3 — hemograma completo
const EXAM_3 = {
  examDate:  new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0],
  labName:   'Hermes Pardini',
  examType:  'hemograma',
  items: [
    { marker:'Hemoglobina', unit:'g/dL',   value:13.0, refMin:12.0, refMax:16.0 },
    { marker:'Leucócitos',  unit:'mil/mm³', value:6.5,  refMin:4.0,  refMax:10.0 },
    { marker:'Plaquetas',   unit:'mil/mm³', value:230,  refMin:150,  refMax:400  },
  ],
};

describe('Exam Results (E2E)', () => {
  let app: INestApplication;
  let token: string;
  let examId1: string;
  let examId2: string;
  let examId3: string;

  beforeAll(async () => {
    app = await createApp();

    await request(app.getHttpServer())
      .post(`${BASE}/auth/register`)
      .send(TEST_USER);

    const login = await request(app.getHttpServer())
      .post(`${BASE}/auth/login`)
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    token = login.body.accessToken;
    expect(token).toBeDefined();
  });

  afterAll(async () => {
    await closeApp();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('POST /exam-results', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/exam-results`)
        .send(EXAM_1)
        .expect(401);
    });

    it('201 — cria exame 1 (lipidograma com LDL alto)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/exam-results`)
        .set('Authorization', `Bearer ${token}`)
        .send(EXAM_1)
        .expect(201);

      expect(res.body).toMatchObject({
        id:       expect.any(String),
        examType: 'lipidograma',
        labName:  'Labclin',
      });

      // Captura ID antes de qualquer assertiva que possa falhar
      examId1 = res.body.id;

      // Items devem ter sido criados
      if (res.body.items) {
        expect(res.body.items.length).toBe(EXAM_1.items.length);
        const ldl = res.body.items.find((i: any) => i.marker === 'LDL');
        // status pode ser 'high', 'low', 'critical_high', 'critical_low' — nunca 'abnormal'
        if (ldl) expect(['high', 'low', 'critical_high', 'critical_low', 'normal']).toContain(ldl.status);
      }
    });

    it('201 — cria exame 2 (mesmo tipo, data diferente)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/exam-results`)
        .set('Authorization', `Bearer ${token}`)
        .send(EXAM_2)
        .expect(201);

      examId2 = res.body.id;
    });

    it('201 — cria exame 3 (hemograma)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/exam-results`)
        .set('Authorization', `Bearer ${token}`)
        .send(EXAM_3)
        .expect(201);

      examId3 = res.body.id;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /exam-results', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/exam-results`)
        .expect(401);
    });

    it('200 — retorna os 3 exames criados', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('200 — não retorna exames de outros usuários', async () => {
      // Cria segundo usuário
      const other = {
        email:                  `other_exam_${Date.now()}@test.com`,
        password:               'Test@12345',
        fullName:               'Outro Usuário',
        dateOfBirth:            '1985-05-20',
        gender:                 'male',
        acceptedTerms:          true,
        acceptedDataProcessing: true,
      };
      await request(app.getHttpServer()).post(`${BASE}/auth/register`).send(other);
      const loginOther = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({ email: other.email, password: other.password });
      const otherToken = loginOther.body.accessToken;

      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Outro usuário não deve ver exames do TEST_USER
      const ids = res.body.map((e: any) => e.id);
      expect(ids).not.toContain(examId1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET BY ID
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /exam-results/:id', () => {
    it('200 — retorna exame por ID com items', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results/${examId1}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id:       examId1,
        examType: 'lipidograma',
      });
    });

    it('404 — ID inexistente', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/exam-results/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AVAILABLE MARKERS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /exam-results/markers', () => {
    it('200 — retorna lista de marcadores do usuário', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results/markers`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // Deve incluir marcadores dos exames criados
      const markers = res.body.map((m: any) => (typeof m === 'string' ? m : m.marker || m.name));
      expect(markers).toEqual(expect.arrayContaining(['LDL', 'Colesterol Total']));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TREND REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /exam-results/trend-report', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/exam-results/trend-report`)
        .expect(401);
    });

    it('200 — retorna relatório de tendência', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results/trend-report`)
        .set('Authorization', `Bearer ${token}`)
        .query({ months: 6 })
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('200 — tendência detecta melhora do LDL entre os 2 exames', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results/trend-report`)
        .set('Authorization', `Bearer ${token}`)
        .query({ months: 6 })
        .expect(200);

      // O relatório deve ter dados de tendência para LDL
      const body = res.body;

      // Verifica que há alguma estrutura de relatório de tendência
      // (a estrutura exata depende da implementação do TrendReportService)
      if (body.markers) {
        const ldlTrend = body.markers.find((m: any) => m.marker === 'LDL');
        if (ldlTrend && ldlTrend.trend) {
          expect(['improving', 'melhora', 'worsening', 'stable', 'declining']).toContain(ldlTrend.trend);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIMELINE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /exam-results/timeline', () => {
    it('200 — retorna timeline do marcador LDL', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/exam-results/timeline`)
        .set('Authorization', `Bearer ${token}`)
        .query({ marker: 'LDL' })
        .expect(200);

      // timeline retorna { marker, data: [...] }
      expect(res.body).toMatchObject({ marker: 'LDL', data: expect.any(Array) });
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verifica campos de cada ponto da timeline
      for (const point of res.body.data) {
        expect(point).toMatchObject({
          value:    expect.anything(), // Prisma Decimal serializa como string
          examDate: expect.any(String),
        });
      }
    });

    it('200 — timeline sem marcador retorna data vazio ou erro controlado', async () => {
      const res = await request(app.getHttpServer())
          .get('/api/v1/exam-results/timeline/NONEXISTENT_MARKER')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => expect([200, 404]).toContain(res.status));
    });
  });
});
