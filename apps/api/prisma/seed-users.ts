// apps/api/prisma/seed-users.ts
// Seed mínimo: cria usuários de teste (paciente + doutor) + catálogo PNI
// Execute: npx ts-node prisma/seed-users.ts

import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed de usuários de teste...\n');

  const pwdHash = await bcrypt.hash('Demo@12345', 12);

  // ── Região + País + Estado (mínimo necessário para ICODE) ─────────────────
  await prisma.region.upsert({ where: { id: 1 }, update: {}, create: { id: 1, icodeNum: '01', name: 'Sudeste' } });
  const brasil = await prisma.country.upsert({ where: { code: 'BR' }, update: {}, create: { icodeNum: '01', name: 'Brasil', nameEn: 'Brazil', code: 'BR' } });
  await prisma.state.upsert({
    where: { uf: 'SP' }, update: {},
    create: { icodeNum: '01', name: 'São Paulo', uf: 'SP', ibgeCode: '35', regionId: 1, countryId: brasil.id },
  });
  const hasCounter = await prisma.icodeCounter.count();
  if (!hasCounter) await prisma.icodeCounter.create({ data: { nextValue: 1 } });

  // ── Paciente de teste ─────────────────────────────────────────────────────
  const paciente = await prisma.user.upsert({
    where: { email: 'paciente@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active' },
    create: {
      email: 'paciente@demo.icodlife.com',
      passwordHash: pwdHash,
      fullName: 'João Carlos Silva',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'male',
      bloodType: 'A_PLUS',
      isDonor: true,
      status: 'active',
      role: 'user',
      icode: '01.01.01.1.0000001',
      allergies: ['Penicilina', 'Dipirona'],
      chronicConditions: ['Hipertensão leve'],
      emergencyContactName: 'Maria Silva',
      emergencyContactPhone: '+5511912345678',
      emergencyContactRel: 'Esposa',
      stateCode: 'SP',
    },
  });
  console.log(`✅ Paciente: ${paciente.email}`);

  // ── Doutor de teste ───────────────────────────────────────────────────────
  const doutorUser = await prisma.user.upsert({
    where: { email: 'doutor@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active', role: 'doctor' },
    create: {
      email: 'doutor@demo.icodlife.com',
      passwordHash: pwdHash,
      fullName: 'Dr. Carlos Eduardo Mendes',
      dateOfBirth: new Date('1978-06-20'),
      gender: 'male',
      bloodType: 'O_PLUS',
      isDonor: false,
      status: 'active',
      role: 'doctor',
      icode: '01.01.01.1.0000002',
      stateCode: 'SP',
    },
  });

  await prisma.doctorCounter.upsert({
    where: { uf: 'SP' }, update: {}, create: { uf: 'SP', nextValue: 2 },
  });

  const doctor = await prisma.doctor.upsert({
    where: { userId: doutorUser.id },
    update: { crmStatus: 'verified' },
    create: {
      userId: doutorUser.id,
      doctorId: 'DR.00001.SP',
      crm: '123456',
      uf: 'SP',
      crmStatus: 'verified',
      specialties: ['Cardiologia', 'Clínica Geral'],
      healthPlans: ['Unimed', 'Bradesco Saúde', 'SulAmérica'],
      bio: 'Cardiologista com 15 anos de experiência. Especialização em insuficiência cardíaca e hipertensão.',
      consultPrice: 350,
      addressCity: 'São Paulo',
      addressState: 'SP',
      phone: '+5511987654321',
      website: 'https://drcarlos.com.br',
    },
  });
  console.log(`✅ Doutor: ${doutorUser.email} → doctorId: ${doctor.doctorId}`);

  // ── Catálogo de Vacinas PNI ────────────────────────────────────────────────
  const vaccines: Array<{
    name: string; tradeName?: string; cvxCode?: string; diseases: string[];
    recommendedDoses: number; intervalDays?: number; boosterYears?: number;
    calendar: string; ageGroups: string[]; notes?: string; manufacturer?: string;
  }> = [
    // Recém-nascido
    { name: 'BCG', diseases: ['Tuberculose'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['recém-nascido'], notes: 'Dose única ao nascer' },
    { name: 'Hepatite B', tradeName: 'Engerix-B', cvxCode: '08', diseases: ['Hepatite B'], recommendedDoses: 3, intervalDays: 30, calendar: 'PNI', ageGroups: ['recém-nascido', 'criança', 'adulto'] },
    // Criança
    { name: 'Pentavalente (DTP+Hib+HepB)', cvxCode: '146', diseases: ['Difteria', 'Tétano', 'Coqueluche', 'Haemophilus influenzae b', 'Hepatite B'], recommendedDoses: 3, intervalDays: 60, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Poliomielite VIP', cvxCode: '10', diseases: ['Poliomielite'], recommendedDoses: 3, intervalDays: 60, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Poliomielite VOP (oral)', cvxCode: '02', diseases: ['Poliomielite'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['criança'], notes: 'Reforço oral a partir dos 15 meses' },
    { name: 'Rotavírus', cvxCode: '116', diseases: ['Gastroenterite por rotavírus'], recommendedDoses: 2, intervalDays: 30, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Pneumocócica 10-valente', cvxCode: '152', diseases: ['Pneumonia', 'Meningite pneumocócica', 'Otite média'], recommendedDoses: 3, intervalDays: 60, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Meningocócica C', cvxCode: '114', diseases: ['Meningite meningocócica C'], recommendedDoses: 2, intervalDays: 60, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Febre Amarela', cvxCode: '37', diseases: ['Febre Amarela'], recommendedDoses: 1, boosterYears: 10, calendar: 'PNI', ageGroups: ['criança', 'adulto'], notes: 'Reforço a cada 10 anos para viajantes' },
    { name: 'Tríplice Viral (SCR)', cvxCode: '03', diseases: ['Sarampo', 'Caxumba', 'Rubéola'], recommendedDoses: 2, intervalDays: 30, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Tetraviral (SCRV)', cvxCode: '94', diseases: ['Sarampo', 'Caxumba', 'Rubéola', 'Varicela'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Hepatite A', cvxCode: '85', diseases: ['Hepatite A'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['criança'] },
    { name: 'Varicela', cvxCode: '21', diseases: ['Catapora'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['criança', 'adulto'] },
    // Adolescente / Adulto
    { name: 'DTP (tríplice bacteriana)', cvxCode: '20', diseases: ['Difteria', 'Tétano', 'Coqueluche'], recommendedDoses: 1, boosterYears: 10, calendar: 'PNI', ageGroups: ['adolescente', 'adulto', 'gestante'], notes: 'Reforço a cada 10 anos; gestantes: 1 dose a cada gestação' },
    { name: 'dT (dupla adulto)', cvxCode: '09', diseases: ['Difteria', 'Tétano'], recommendedDoses: 3, intervalDays: 60, boosterYears: 10, calendar: 'PNI', ageGroups: ['adulto'] },
    { name: 'HPV Quadrivalente', cvxCode: '62', diseases: ['HPV (tipos 6, 11, 16, 18)'], recommendedDoses: 2, intervalDays: 180, calendar: 'PNI', ageGroups: ['adolescente'] },
    { name: 'Meningocócica ACWY', cvxCode: '136', diseases: ['Meningite meningocócica A/C/W/Y'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['adolescente'] },
    { name: 'Influenza (gripe)', cvxCode: '88', diseases: ['Influenza'], recommendedDoses: 1, boosterYears: 1, calendar: 'PNI', ageGroups: ['criança', 'adolescente', 'adulto', 'idoso', 'gestante'], notes: 'Dose anual — campanha nacional' },
    { name: 'Pneumocócica 23-valente', cvxCode: '33', diseases: ['Pneumonia pneumocócica'], recommendedDoses: 1, calendar: 'PNI', ageGroups: ['idoso', 'imunocomprometido'] },
    // COVID-19
    { name: 'COVID-19 — CoronaVac', tradeName: 'CoronaVac', cvxCode: '510', diseases: ['COVID-19'], recommendedDoses: 2, intervalDays: 28, boosterYears: 1, calendar: 'PNI', ageGroups: ['adulto', 'idoso'], manufacturer: 'Butantan/Sinovac' },
    { name: 'COVID-19 — Pfizer/BioNTech', tradeName: 'Comirnaty', cvxCode: '208', diseases: ['COVID-19'], recommendedDoses: 2, intervalDays: 21, boosterYears: 1, calendar: 'PNI', ageGroups: ['adulto', 'adolescente', 'criança'], manufacturer: 'Pfizer/BioNTech' },
    { name: 'COVID-19 — AstraZeneca/Fiocruz', tradeName: 'Vaxzevria', cvxCode: '210', diseases: ['COVID-19'], recommendedDoses: 2, intervalDays: 84, boosterYears: 1, calendar: 'PNI', ageGroups: ['adulto', 'idoso'], manufacturer: 'AstraZeneca/Fiocruz' },
    { name: 'COVID-19 — Janssen', tradeName: 'Janssen', cvxCode: '212', diseases: ['COVID-19'], recommendedDoses: 1, boosterYears: 1, calendar: 'PNI', ageGroups: ['adulto', 'idoso'], manufacturer: 'Janssen/J&J' },
    { name: 'COVID-19 — Moderna', tradeName: 'Spikevax', cvxCode: '207', diseases: ['COVID-19'], recommendedDoses: 2, intervalDays: 28, boosterYears: 1, calendar: 'Internacional', ageGroups: ['adulto', 'idoso'], manufacturer: 'Moderna' },
    // Recomendadas
    { name: 'Dengue (Dengvaxia)', cvxCode: '56', diseases: ['Dengue'], recommendedDoses: 3, intervalDays: 180, calendar: 'PNI', ageGroups: ['criança', 'adolescente'], notes: 'Somente soropositivos confirmados' },
    { name: 'Meningocócica B', cvxCode: '162', diseases: ['Meningite meningocócica B'], recommendedDoses: 2, intervalDays: 60, calendar: 'Recomendada', ageGroups: ['criança', 'adolescente', 'adulto'] },
    { name: 'Herpes Zóster (Shingrix)', cvxCode: '187', diseases: ['Herpes Zóster'], recommendedDoses: 2, intervalDays: 60, calendar: 'Recomendada', ageGroups: ['idoso'], notes: 'Indicada para maiores de 50 anos' },
  ];

  for (const v of vaccines) {
    const cvxKey = v.cvxCode ?? `no-cvx-${v.name.replace(/\s+/g, '-').toLowerCase()}`;
    await prisma.vaccine.upsert({
      where:  { cvxCode: cvxKey },
      update: { name: v.name, diseases: v.diseases, recommendedDoses: v.recommendedDoses },
      create: {
        name:             v.name,
        tradeName:        v.tradeName,
        cvxCode:          cvxKey,
        diseases:         v.diseases,
        recommendedDoses: v.recommendedDoses,
        intervalDays:     v.intervalDays ?? null,
        boosterYears:     v.boosterYears ?? null,
        ageGroups:        v.ageGroups,
        calendar:         v.calendar,
        notes:            v.notes,
      },
    });
  }
  console.log(`✅ ${vaccines.length} vacinas no catálogo PNI`);

  console.log('\n📋 Credenciais de teste:');
  console.log('  Paciente → http://localhost:3000/auth/login');
  console.log('    Email: paciente@demo.icodlife.com  |  Senha: Demo@12345');
  console.log('  Doutor   → http://localhost:3002/login');
  console.log('    Email: doutor@demo.icodlife.com    |  Senha: Demo@12345');
}

main()
  .catch(e => { console.error(e); process.exit(1); });
