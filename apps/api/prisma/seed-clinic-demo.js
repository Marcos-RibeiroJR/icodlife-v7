// apps/api/prisma/seed-clinic-demo.js
//
// Seed de demonstração do Módulo 3 — Clínicas e Hospitais (Sprint 21.1b).
// Cria 1 clínica demo ("Clínica ICODLIFE Centro"), um 2º médico (para provar o
// conceito multi-tenant — 1 clínica com N médicos), vincula dr.marcos como
// médico-sócio (owner) e a nova doutora como associada, cria salas e um
// catálogo inicial de procedimentos com preço.
//
// Pré-requisito: rodar antes `npx prisma db seed` (ou seed-bigdata.js), para
// que dr.marcos@demo.icodlife.com já exista.
//
// Como rodar:
//   cd apps/api
//   node prisma/seed-clinic-demo.js
//
// Idempotente (upsert em tudo) — pode rodar de novo sem duplicar.

const bcrypt = require('bcrypt');
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();
const SENHA_PADRAO = 'Demo@12345';

async function generateClinicCode(uf) {
  const counter = await prisma.clinicCounter.upsert({
    where: { uf },
    update: { nextValue: { increment: 1 } },
    create: { uf, nextValue: 2 },
  });
  const num = (counter.nextValue - 1).toString().padStart(5, '0');
  return `CL.${num}.${uf}`;
}

async function ensureDoctorUser({ email, fullName, dateOfBirth, gender, bloodType, crm, uf, specialties, phone }) {
  const pwdHash = await bcrypt.hash(SENHA_PADRAO, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email, passwordHash: pwdHash, fullName, dateOfBirth: new Date(dateOfBirth),
      gender, bloodType, isDonor: false, status: 'active', role: 'doctor',
      phone, stateCode: uf, allergies: [], chronicConditions: [], emailVerifiedAt: new Date(),
    },
  });
  let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
  if (!doctor) {
    const counter = await prisma.doctorCounter.upsert({
      where: { uf }, update: { nextValue: { increment: 1 } }, create: { uf, nextValue: 2 },
    });
    const doctorId = `DR.${(counter.nextValue - 1).toString().padStart(5, '0')}.${uf}`;
    doctor = await prisma.doctor.create({
      data: {
        userId: user.id, doctorId, crm, uf, crmStatus: 'verified',
        specialties, healthPlans: ['Unimed', 'Bradesco Saúde'],
        bio: `${fullName} — ${specialties.join(', ')}.`,
        consultPrice: 220.0, addressCity: 'São Paulo', addressState: uf,
        phone, languages: ['Português'], education: [], certifications: [],
      },
    });
  }
  return { user, doctor };
}

async function main() {
  console.log('🏥 Seed CLÍNICA DEMO — Sprint 21.1b\n');

  // ── médico-sócio (já existe, criado pelo seed.ts) ─────────────────────────
  const drMarcosUser = await prisma.user.findUnique({ where: { email: 'dr.marcos@demo.icodlife.com' } });
  if (!drMarcosUser) {
    throw new Error('dr.marcos@demo.icodlife.com não encontrado. Rode antes: npx prisma db seed');
  }
  const drMarcos = await prisma.doctor.findUnique({ where: { userId: drMarcosUser.id } });

  // ── 2º médico da clínica (associado) — prova o conceito multi-médico ─────
  const { doctor: draFernanda } = await ensureDoctorUser({
    email: 'dra.fernanda@demo.icodlife.com',
    fullName: 'Dra. Fernanda Costa',
    dateOfBirth: '1985-11-02',
    gender: 'female',
    bloodType: 'O_PLUS',
    crm: '654321',
    uf: 'SP',
    specialties: ['Dermatologia', 'Estética Médica'],
    phone: '+5511944443333',
  });
  console.log(`✅ Médicos prontos: ${drMarcosUser.email} (sócio) + dra.fernanda@demo.icodlife.com (associada)`);

  // ── usuário administrativo da clínica (role clinic_admin) ────────────────
  const pwdHash = await bcrypt.hash(SENHA_PADRAO, 12);
  const clinicAdminUser = await prisma.user.upsert({
    where: { email: 'clinica.centro@demo.icodlife.com' },
    update: { role: 'clinic_admin' },
    create: {
      email: 'clinica.centro@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'Administração — Clínica ICODLIFE Centro',
      dateOfBirth: new Date('1990-01-01'), gender: 'other', status: 'active',
      role: 'clinic_admin', phone: '+5511933332222', stateCode: 'SP',
      allergies: [], chronicConditions: [], emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Usuário admin da clínica: ${clinicAdminUser.email}`);

  // ── clínica ────────────────────────────────────────────────────────────
  let clinic = await prisma.clinic.findUnique({ where: { cnpj: '12345678000199' } });
  if (!clinic) {
    const clinicCode = await generateClinicCode('SP');
    clinic = await prisma.clinic.create({
      data: {
        clinicCode,
        ownerUserId: clinicAdminUser.id,
        razaoSocial: 'Clínica ICODLIFE Centro Ltda',
        nomeFantasia: 'Clínica ICODLIFE Centro',
        cnpj: '12345678000199',
        tipoEstabelecimento: 'clinica',
        cidade: 'São Paulo', estado: 'SP',
        logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cep: '01310-100',
        telefone: '+5511933332222', email: 'contato@clinicaicodlife.com.br',
        healthPlans: ['Unimed', 'Bradesco Saúde', 'SulAmérica'],
        specialties: ['Cardiologia', 'Clínica Geral', 'Dermatologia', 'Estética Médica'],
        status: 'active',
      },
    });
  }
  console.log(`✅ Clínica: ${clinic.nomeFantasia} (${clinic.clinicCode})`);

  // ── salas ──────────────────────────────────────────────────────────────
  const roomNames = ['Consultório 1', 'Consultório 2', 'Sala de Coleta'];
  const rooms = [];
  for (const name of roomNames) {
    let room = await prisma.clinicRoom.findFirst({ where: { clinicId: clinic.id, name } });
    if (!room) room = await prisma.clinicRoom.create({ data: { clinicId: clinic.id, name } });
    rooms.push(room);
  }
  console.log(`✅ Salas: ${rooms.map((r) => r.name).join(', ')}`);

  // ── vínculo médico-clínica ────────────────────────────────────────────
  await prisma.clinicDoctor.upsert({
    where: { clinicId_doctorId: { clinicId: clinic.id, doctorId: drMarcos.id } },
    update: {},
    create: { clinicId: clinic.id, doctorId: drMarcos.id, role: 'owner', commissionPct: 100, roomId: rooms[0].id },
  });
  await prisma.clinicDoctor.upsert({
    where: { clinicId_doctorId: { clinicId: clinic.id, doctorId: draFernanda.id } },
    update: {},
    create: { clinicId: clinic.id, doctorId: draFernanda.id, role: 'associated', commissionPct: 70, roomId: rooms[1].id },
  });
  console.log('✅ Vínculos ClinicDoctor: Dr. Marcos (owner) + Dra. Fernanda (associated)');

  // ── staff administrativo (recepção) ──────────────────────────────────
  const recepcaoUser = await prisma.user.upsert({
    where: { email: 'recepcao.centro@demo.icodlife.com' },
    update: {},
    create: {
      email: 'recepcao.centro@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'Recepção Clínica Centro', dateOfBirth: new Date('1998-04-12'),
      gender: 'female', status: 'active', role: 'user', phone: '+5511922221111',
      allergies: [], chronicConditions: [], emailVerifiedAt: new Date(),
    },
  });
  await prisma.clinicStaff.upsert({
    where: { id: `seed-staff-${clinic.id}-${recepcaoUser.id}` },
    update: {},
    create: {
      id: `seed-staff-${clinic.id}-${recepcaoUser.id}`,
      clinicId: clinic.id, userId: recepcaoUser.id, role: 'reception',
    },
  });
  console.log(`✅ Staff: ${recepcaoUser.email} (recepção)`);

  // ── catálogo de procedimentos ──────────────────────────────────────────
  const procedures = [
    { name: 'Consulta Clínica Geral', category: 'consulta', defaultPrice: 220.0, durationMinutes: 30 },
    { name: 'Consulta Cardiológica', category: 'consulta', defaultPrice: 280.0, durationMinutes: 40 },
    { name: 'Consulta Dermatológica', category: 'consulta', defaultPrice: 250.0, durationMinutes: 30 },
    { name: 'ASO Admissional', category: 'procedimento', defaultPrice: 150.0, durationMinutes: 20 },
    { name: 'ASO Periódico', category: 'procedimento', defaultPrice: 120.0, durationMinutes: 15 },
    { name: 'Exame de Rotina (coleta)', category: 'exame', defaultPrice: 80.0, durationMinutes: 15 },
  ];
  for (const p of procedures) {
    const existing = await prisma.clinicProcedure.findFirst({ where: { clinicId: clinic.id, name: p.name } });
    if (!existing) await prisma.clinicProcedure.create({ data: { clinicId: clinic.id, ...p } });
  }
  console.log(`✅ Catálogo de procedimentos: ${procedures.length} itens`);

  console.log('\n🎉 Seed CLÍNICA DEMO concluído!');
  console.log(`   Clínica: ${clinic.nomeFantasia} (${clinic.clinicCode})`);
  console.log(`   Login admin da clínica: clinica.centro@demo.icodlife.com | senha: ${SENHA_PADRAO}`);
  console.log(`   Médicos: dr.marcos@demo.icodlife.com (owner) + dra.fernanda@demo.icodlife.com (associada) | senha: ${SENHA_PADRAO}`);
  console.log(`   Recepção: recepcao.centro@demo.icodlife.com | senha: ${SENHA_PADRAO}`);
  console.log('\n   Nota: os 400 pacientes de teste (seed-bigdata.js) continuam vinculados só ao dr.marcos');
  console.log('   via PatientDoctor — para aparecerem também na visão consolidada da clínica, rode uma');
  console.log('   atualização em lote de clinicId quando o módulo backend /clinic estiver pronto.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
