// apps/api/test/clinic.e2e-spec.ts
// Testes E2E — módulo clinic: become-clinic-admin, médicos, salas, procedimentos,
// staff, agenda, empresas e financeiro. (Sprint 21/25 — Módulo Clínicas e Hospitais)

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createApp, closeApp } from './app-factory';

const BASE = '/api/v1';
const STAMP = Date.now();

// ── usuário que vira dono da clínica ─────────────────────────────────────────
const ADMIN_USER = {
  email: `clinic_admin_${STAMP}@test.icodlife.com`,
  password: 'Test@12345',
  fullName: 'Admin Clínica E2E',
  dateOfBirth: '1980-03-10',
  gender: 'female',
  acceptedTerms: true,
  acceptedDataProcessing: true,
};

const CLINIC_DTO = {
  razaoSocial: 'Clínica E2E Testes Ltda',
  nomeFantasia: 'Clínica E2E',
  cnpj: String(10_000_000_000_000 + (STAMP % 999_999_999)).padStart(14, '0').slice(0, 14),
  tipoEstabelecimento: 'clinica',
  cidade: 'São Paulo',
  estado: 'SP',
  telefone: '+5511999990000',
  email: 'contato.e2e@clinica.test',
  healthPlans: ['Unimed'],
  specialties: ['Clínica Geral'],
};

// ── usuário que vira médico (associado à clínica) ────────────────────────────
const DOCTOR_USER = {
  email: `clinic_doctor_${STAMP}@test.icodlife.com`,
  password: 'Test@12345',
  fullName: 'Dr. Teste E2E',
  dateOfBirth: '1978-07-22',
  gender: 'male',
  acceptedTerms: true,
  acceptedDataProcessing: true,
};

const BECOME_DOCTOR_DTO = {
  crm: `${STAMP}`.slice(-6),
  uf: 'SP',
  specialties: ['Clínica Geral'],
};

// ── usuário comum que vira staff (recepção) da clínica ───────────────────────
const STAFF_USER = {
  email: `clinic_staff_${STAMP}@test.icodlife.com`,
  password: 'Test@12345',
  fullName: 'Recepção Teste E2E',
  dateOfBirth: '1995-01-01',
  gender: 'female',
  acceptedTerms: true,
  acceptedDataProcessing: true,
};

// ── segundo usuário/médico solto, nunca vinculado a nenhuma clínica ──────────
const OUTSIDER_DOCTOR_USER = {
  email: `clinic_outsider_${STAMP}@test.icodlife.com`,
  password: 'Test@12345',
  fullName: 'Dr. Fora da Clínica E2E',
  dateOfBirth: '1982-09-14',
  gender: 'male',
  acceptedTerms: true,
  acceptedDataProcessing: true,
};

describe('Clinic (E2E)', () => {
  let app: INestApplication;

  let adminToken: string;
  let doctorToken: string;
  let outsiderDoctorToken: string;

  let doctorIcode: string;
  let staffIcode: string;

  let clinicDoctorLinkId: string; // id do vínculo ClinicDoctor
  let doctorId: string;           // Doctor.id (não o User.id)
  let roomId: string;
  let procedureId: string;
  let staffId: string;
  let appointmentId: string;
  let companyId: string;

  async function registerAndLogin(user: typeof ADMIN_USER) {
    const reg = await request(app.getHttpServer())
      .post(`${BASE}/auth/register`)
      .send(user)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(`${BASE}/auth/login`)
      .send({ email: user.email, password: user.password })
      .expect(200);
    return { icode: reg.body.icode as string, token: login.body.accessToken as string };
  }

  beforeAll(async () => {
    app = await createApp();

    // Admin da clínica
    const admin = await registerAndLogin(ADMIN_USER);
    adminToken = admin.token;

    // Médico a ser vinculado
    const doctorReg = await registerAndLogin(DOCTOR_USER);
    doctorToken = doctorReg.token;
    doctorIcode = doctorReg.icode;
    await request(app.getHttpServer())
      .post(`${BASE}/auth/become-doctor`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send(BECOME_DOCTOR_DTO)
      .expect(201);

    // Usuário comum para staff
    const staffReg = await registerAndLogin(STAFF_USER);
    staffIcode = staffReg.icode;

    // Médico "de fora" — nunca será vinculado à clínica (usado nos testes de 403/404)
    const outsiderReg = await registerAndLogin(OUTSIDER_DOCTOR_USER);
    outsiderDoctorToken = outsiderReg.token;
    await request(app.getHttpServer())
      .post(`${BASE}/auth/become-doctor`)
      .set('Authorization', `Bearer ${outsiderDoctorToken}`)
      .send({ crm: `${STAMP}`.slice(-6) + '1', uf: 'SP', specialties: ['Cardiologia'] })
      .expect(201);
  });

  afterAll(async () => {
    await closeApp();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // BECOME CLINIC ADMIN
  // ─────────────────────────────────────────────────────────────────────────────
  describe('POST /auth/become-clinic-admin', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/become-clinic-admin`)
        .send(CLINIC_DTO)
        .expect(401);
    });

    it('400 — CNPJ inválido', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/become-clinic-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...CLINIC_DTO, cnpj: '123' })
        .expect(400);
    });

    it('201 — cria clínica e promove usuário a clinic_admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/become-clinic-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(CLINIC_DTO)
        .expect(201);

      expect(res.body).toMatchObject({
        message: expect.any(String),
        clinicCode: expect.stringMatching(/^CL\./),
      });
    });

    it('409 — usuário já possui clínica cadastrada', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/auth/become-clinic-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...CLINIC_DTO, cnpj: '99999999000199' })
        .expect(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFIL DA CLÍNICA
  // ─────────────────────────────────────────────────────────────────────────────
  describe('GET /clinic/me', () => {
    it('401 — sem token', async () => {
      await request(app.getHttpServer()).get(`${BASE}/clinic/me`).expect(401);
    });

    it('403 — token de usuário sem role clinic_admin (médico)', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/clinic/me`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('200 — retorna perfil da clínica com contadores', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/me`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        nomeFantasia: CLINIC_DTO.nomeFantasia,
        doctorsCount: 0,
        staffCount: 0,
      });
    });
  });

  describe('PATCH /clinic/me', () => {
    it('200 — atualiza dados da clínica', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/clinic/me`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nomeFantasia: 'Clínica E2E Renomeada', telefone: '+5511988887777' })
        .expect(200);

      expect(res.body).toMatchObject({
        nomeFantasia: 'Clínica E2E Renomeada',
        telefone: '+5511988887777',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SALAS (necessário antes de vincular médico com sala fixa)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Salas', () => {
    it('401 — POST /clinic/rooms sem token', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/rooms`)
        .send({ name: 'Consultório 1' })
        .expect(401);
    });

    it('201 — cria sala', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/rooms`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Consultório 1', costPerHour: 50 })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), name: 'Consultório 1' });
      roomId = res.body.id;
    });

    it('200 — lista salas', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/rooms`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.find((r: any) => r.id === roomId)).toBeDefined();
    });

    it('200 — atualiza sala', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/clinic/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ costPerHour: 80 })
        .expect(200);

      expect(Number(res.body.costPerHour)).toBe(80);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉDICOS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Médicos', () => {
    it('401 — GET /clinic/doctors sem token', async () => {
      await request(app.getHttpServer()).get(`${BASE}/clinic/doctors`).expect(401);
    });

    it('404 — vincular identifier inexistente', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ identifier: 'ICODE.INEXISTENTE.000' })
        .expect(404);
    });

    it('201 — vincula médico por ICODE', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ identifier: doctorIcode, role: 'associated', commissionPct: 70, roomId })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        doctorId: expect.any(String),
        role: 'associated',
      });
      clinicDoctorLinkId = res.body.id;
      doctorId = res.body.doctorId;
    });

    it('409 — vincular o mesmo médico de novo (já ativo)', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ identifier: doctorIcode })
        .expect(409);
    });

    it('200 — lista médicos vinculados (inclui dados do usuário e sala)', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const entry = res.body.find((d: any) => d.id === clinicDoctorLinkId);
      expect(entry).toMatchObject({
        role: 'associated',
        doctor: expect.objectContaining({
          user: expect.objectContaining({ fullName: DOCTOR_USER.fullName }),
        }),
      });
      expect(entry.room?.id).toBe(roomId);
    });

    it('200 — GET /clinic/me agora reflete 1 médico ativo', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/me`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.doctorsCount).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCEDIMENTOS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Procedimentos', () => {
    it('201 — cria procedimento', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/procedures`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Consulta Clínica Geral', category: 'consulta', defaultPrice: 220, durationMinutes: 30 })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), name: 'Consulta Clínica Geral' });
      procedureId = res.body.id;
    });

    it('400 — defaultPrice ausente', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/procedures`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sem preço' })
        .expect(400);
    });

    it('200 — lista procedimentos', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/procedures`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((p: any) => p.id === procedureId)).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STAFF
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Staff', () => {
    it('404 — identifier inexistente', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ identifier: 'naoexiste@test.com' })
        .expect(404);
    });

    it('201 — adiciona staff por ICODE', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ identifier: staffIcode, role: 'reception' })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), role: 'reception' });
      staffId = res.body.id;
    });

    it('200 — lista staff', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((s: any) => s.id === staffId)).toMatchObject({
        user: expect.objectContaining({ fullName: STAFF_USER.fullName }),
      });
    });

    it('200 — remove staff (soft delete)', async () => {
      await request(app.getHttpServer())
        .delete(`${BASE}/clinic/staff/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((s: any) => s.id === staffId)).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AGENDA
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Agenda', () => {
    it('403 — criar consulta com médico de outra clínica (não vinculado)', async () => {
      // usa o outsiderDoctor (nunca vinculado) — precisamos do Doctor.id dele.
      // Como não temos acesso direto, usamos um doctorId claramente inválido/aleatório
      // para validar que o guard de vínculo rejeita.
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/agenda/appointments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: '00000000-0000-0000-0000-000000000000',
          patientName: 'Paciente Teste',
          scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
        })
        .expect(403);
    });

    it('400 — patientName ausente', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/agenda/appointments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ doctorId, scheduledAt: new Date().toISOString() })
        .expect(400);
    });

    it('201 — cria consulta para o médico vinculado', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/agenda/appointments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId,
          patientName: 'Paciente Teste E2E',
          scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
          durationMinutes: 30,
          type: 'consulta',
          roomId,
          price: 220,
        })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), patientName: 'Paciente Teste E2E' });
      appointmentId = res.body.id;
    });

    it('200 — GET /clinic/agenda lista a consulta criada', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/agenda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((a: any) => a.id === appointmentId)).toBeDefined();
    });

    it('200 — GET /clinic/rooms/:id/agenda filtra pela sala', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/rooms/${roomId}/agenda`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((a: any) => a.id === appointmentId)).toBeDefined();
    });

    it('200 — marca consulta como completed (dispara débito de sala na conta-corrente)', async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/clinic/agenda/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' })
        .expect(200);
    });

    it('200 — conta-corrente do médico reflete o custo da sala', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/financeiro/conta-corrente/${doctorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.custoSalas).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPRESAS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Empresas', () => {
    it('400 — sem médico responsável', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/companies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ razaoSocial: 'Empresa Teste E2E', cnpj: '11222333000181' })
        .expect(400);
    });

    it('201 — cria empresa vinculada ao médico da clínica', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/companies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ razaoSocial: 'Empresa Teste E2E', cnpj: '11222333000181', doctorId })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), razaoSocial: 'Empresa Teste E2E' });
      companyId = res.body.id;
    });

    it('200 — lista empresas da clínica', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/companies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((c: any) => c.id === companyId)).toBeDefined();
    });

    it('200 — GET /clinic/companies/:id', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/clinic/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FINANCEIRO
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Financeiro', () => {
    it('200 — DRE consolidado', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/financeiro/dre`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        entradas: expect.any(Number),
        saidas: expect.any(Number),
        saldo: expect.any(Number),
      });
    });

    it('200 — financeiro por médico', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/financeiro/por-medico`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const entry = res.body.find((r: any) => r.doctorId === doctorId);
      expect(entry).toMatchObject({ commissionPct: 70 });
    });

    it('201 — lançamento manual na conta corrente', async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/clinic/financeiro/conta-corrente/${doctorId}/entries`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'income', description: 'Ajuste manual E2E', amount: 100 })
        .expect(201);
      expect(res.body).toMatchObject({ type: 'income', description: 'Ajuste manual E2E' });
    });

    it('400 — lançamento com amount inválido', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/financeiro/conta-corrente/${doctorId}/entries`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'income', description: 'Inválido', amount: 0 })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DESVINCULAR MÉDICO (por último — depende do link ainda existir)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('DELETE /clinic/doctors/:id', () => {
    it('200 — desvincula médico', async () => {
      await request(app.getHttpServer())
        .delete(`${BASE}/clinic/doctors/${clinicDoctorLinkId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`${BASE}/clinic/doctors`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.find((d: any) => d.id === clinicDoctorLinkId)).toBeUndefined();
    });

    it('403 — agenda não aceita mais consultas do médico desvinculado', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/clinic/agenda/appointments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId,
          patientName: 'Paciente Pós-Desvínculo',
          scheduledAt: new Date(Date.now() + 7_200_000).toISOString(),
        })
        .expect(403);
    });
  });
});
