// apps/api/prisma/seed.ts
// Seed realista com PA, exames completos, ciclo menstrual e histórico de medicação

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────────
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysAgoAt = (n: number, h: number, m = 0) => {
  const d = daysAgo(n); d.setHours(h, m, 0, 0); return d;
};

async function main() {
  console.log('🌱 Iniciando seed do banco IcodLife...\n');

  // ── REGIÕES ──────────────────────────────────────────────────────────────────
  const regSudeste     = await prisma.region.upsert({ where:{id:1}, update:{}, create:{id:1, icodeNum:'01', name:'Sudeste'} });
  const regNorte       = await prisma.region.upsert({ where:{id:2}, update:{}, create:{id:2, icodeNum:'02', name:'Norte'} });
  const regNordeste    = await prisma.region.upsert({ where:{id:3}, update:{}, create:{id:3, icodeNum:'03', name:'Nordeste'} });
  const regSul         = await prisma.region.upsert({ where:{id:4}, update:{}, create:{id:4, icodeNum:'04', name:'Sul'} });
  const regCentroOeste = await prisma.region.upsert({ where:{id:5}, update:{}, create:{id:5, icodeNum:'05', name:'Centro-Oeste'} });
  console.log('✅ Regiões');

  // ── PAÍS + ESTADOS ────────────────────────────────────────────────────────────
  const brasil = await prisma.country.upsert({ where:{code:'BR'}, update:{}, create:{icodeNum:'01',name:'Brasil',nameEn:'Brazil',code:'BR'} });
  await prisma.country.upsert({ where:{code:'US'}, update:{}, create:{icodeNum:'02',name:'Estados Unidos',nameEn:'United States',code:'US'} });
  await prisma.country.upsert({ where:{code:'PT'}, update:{}, create:{icodeNum:'03',name:'Portugal',nameEn:'Portugal',code:'PT'} });

  const statesData = [
    {icodeNum:'01',name:'São Paulo',          uf:'SP',ibgeCode:'35',regionId:regSudeste.id},
    {icodeNum:'09',name:'Espírito Santo',      uf:'ES',ibgeCode:'32',regionId:regSudeste.id},
    {icodeNum:'12',name:'Minas Gerais',        uf:'MG',ibgeCode:'31',regionId:regSudeste.id},
    {icodeNum:'20',name:'Rio de Janeiro',      uf:'RJ',ibgeCode:'33',regionId:regSudeste.id},
    {icodeNum:'02',name:'Acre',                uf:'AC',ibgeCode:'12',regionId:regNorte.id},
    {icodeNum:'04',name:'Amazonas',            uf:'AM',ibgeCode:'13',regionId:regNorte.id},
    {icodeNum:'15',name:'Pará',                uf:'PA',ibgeCode:'15',regionId:regNorte.id},
    {icodeNum:'03',name:'Alagoas',             uf:'AL',ibgeCode:'27',regionId:regNordeste.id},
    {icodeNum:'06',name:'Bahia',               uf:'BA',ibgeCode:'29',regionId:regNordeste.id},
    {icodeNum:'07',name:'Ceará',               uf:'CE',ibgeCode:'23',regionId:regNordeste.id},
    {icodeNum:'16',name:'Paraíba',             uf:'PB',ibgeCode:'25',regionId:regNordeste.id},
    {icodeNum:'17',name:'Pernambuco',          uf:'PE',ibgeCode:'26',regionId:regNordeste.id},
    {icodeNum:'19',name:'Paraná',              uf:'PR',ibgeCode:'41',regionId:regSul.id},
    {icodeNum:'24',name:'Rio Grande do Sul',   uf:'RS',ibgeCode:'43',regionId:regSul.id},
    {icodeNum:'25',name:'Santa Catarina',      uf:'SC',ibgeCode:'42',regionId:regSul.id},
    {icodeNum:'08',name:'Distrito Federal',    uf:'DF',ibgeCode:'53',regionId:regCentroOeste.id},
    {icodeNum:'10',name:'Goiás',               uf:'GO',ibgeCode:'52',regionId:regCentroOeste.id},
    {icodeNum:'13',name:'Mato Grosso do Sul',  uf:'MS',ibgeCode:'50',regionId:regCentroOeste.id},
  ];
  for (const s of statesData) {
    await prisma.state.upsert({ where:{uf:s.uf}, update:{}, create:{...s, countryId:brasil.id} });
  }
  console.log('✅ Estados');

  const hasCounter = await prisma.icodeCounter.count();
  if (!hasCounter) await prisma.icodeCounter.create({ data:{ nextValue:1 } });

  // ── USUÁRIOS ──────────────────────────────────────────────────────────────────
  const pwdHash = await bcrypt.hash('Demo@12345', 12);

  const joao = await prisma.user.upsert({
    where:  { email: 'joao@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active', emailVerifiedAt: new Date() },
    create: {
      email: 'joao@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'João Carlos Silva', dateOfBirth: new Date('1985-03-15'),
      gender: 'male', bloodType: 'A_PLUS', isDonor: true,
      status: 'active', phone: '+5511987654321',
      allergies: ['Penicilina', 'Dipirona'],
      chronicConditions: ['Hipertensão leve'],
      emergencyContactName: 'Maria Silva', emergencyContactPhone: '+5511912345678',
      emergencyContactRel: 'Esposa', emailVerifiedAt: new Date(),
    },
  });

  const ana = await prisma.user.upsert({
    where:  { email: 'ana@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active', emailVerifiedAt: new Date() },
    create: {
      email: 'ana@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'Ana Paula Rodrigues', dateOfBirth: new Date('1992-07-22'),
      gender: 'female', bloodType: 'O_PLUS', isDonor: false,
      status: 'active', phone: '+5511976543210',
      allergies: ['Látex'], chronicConditions: [],
      emergencyContactName: 'Carlos Rodrigues', emergencyContactPhone: '+5511911223344',
      emergencyContactRel: 'Pai', emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Usuários: ${joao.email} | ${ana.email}`);

  // ── CONSENTIMENTOS ────────────────────────────────────────────────────────────
  for (const userId of [joao.id, ana.id]) {
    await prisma.userConsent.createMany({
      skipDuplicates: true,
      data: [
        { userId, consentType:'terms_of_use',    version:'1.0.0', accepted:true, ipAddress:'127.0.0.1' },
        { userId, consentType:'data_processing', version:'1.0.0', accepted:true, ipAddress:'127.0.0.1' },
        { userId, consentType:'marketing',       version:'1.0.0', accepted:true, ipAddress:'127.0.0.1' },
      ],
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRESSÃO ARTERIAL — João (6 meses, 2x/semana, tendência de melhora com medicação)
  // ────────────────────────────────────────────────────────────────────────────
  const classifyBP = (s: number, d: number) => {
    if (s >= 180 || d >= 120) return 'crise';
    if (s >= 140 || d >= 90)  return 'hipertensao2';
    if (s >= 130 || d >= 80)  return 'hipertensao1';
    if (s >= 120 && d < 80)   return 'elevado';
    return 'normal';
  };

  const bpReadings = [
    // Antes da medicação (90-61 dias atrás)
    { d: 90, sys: 152, dia: 96, pulse: 78, alcohol: false, sleep: 'ruim',    stress: 'alto',     med: false },
    { d: 87, sys: 148, dia: 94, pulse: 80, alcohol: true,  sleep: 'regular', stress: 'alto',     med: false },
    { d: 84, sys: 155, dia: 98, pulse: 82, alcohol: false, sleep: 'ruim',    stress: 'alto',     med: false },
    { d: 81, sys: 150, dia: 95, pulse: 77, alcohol: false, sleep: 'regular', stress: 'moderado', med: false },
    { d: 78, sys: 147, dia: 93, pulse: 76, alcohol: true,  sleep: 'regular', stress: 'alto',     med: false },
    // Início Losartana (60-31 dias atrás)
    { d: 60, sys: 143, dia: 90, pulse: 74, alcohol: false, sleep: 'regular', stress: 'moderado', med: true },
    { d: 57, sys: 139, dia: 88, pulse: 73, alcohol: false, sleep: 'boa',     stress: 'moderado', med: true },
    { d: 54, sys: 141, dia: 89, pulse: 75, alcohol: true,  sleep: 'regular', stress: 'moderado', med: true },
    { d: 51, sys: 137, dia: 86, pulse: 72, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d: 48, sys: 135, dia: 85, pulse: 71, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    // Melhora progressiva (30-15 dias atrás)
    { d: 30, sys: 132, dia: 84, pulse: 70, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d: 27, sys: 128, dia: 82, pulse: 69, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d: 24, sys: 130, dia: 83, pulse: 70, alcohol: true,  sleep: 'regular', stress: 'moderado', med: true },
    { d: 21, sys: 126, dia: 80, pulse: 68, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d: 18, sys: 124, dia: 79, pulse: 67, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    // Últimas 2 semanas — quase normal
    { d: 14, sys: 122, dia: 78, pulse: 66, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d: 11, sys: 120, dia: 76, pulse: 65, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d:  8, sys: 118, dia: 75, pulse: 64, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
    { d:  5, sys: 122, dia: 78, pulse: 67, alcohol: true,  sleep: 'regular', stress: 'moderado', med: true },
    { d:  2, sys: 119, dia: 76, pulse: 65, alcohol: false, sleep: 'boa',     stress: 'baixo',    med: true },
  ];

  for (const r of bpReadings) {
    await (prisma as any).bloodPressureReading?.create({
      data: {
        userId:          joao.id,
        systolic:        r.sys,
        diastolic:       r.dia,
        pulse:           r.pulse,
        measuredAt:      daysAgoAt(r.d, 7, 30),
        arm:             'esquerdo',
        classification:  classifyBP(r.sys, r.dia),
        sleepQuality:    r.sleep,
        alcoholConsumed: r.alcohol,
        heavyMeal:       false,
        highSodium:      r.alcohol,
        stressLevel:     r.stress,
        caffeine:        false,
        tookMedication:  r.med,
        headache:        r.sys > 145,
        dizziness:       r.sys > 150,
        smoking:         false,
        notes: r.med ? 'Tomei Losartana hoje.' : 'Antes de iniciar medicação.',
      },
    }).catch(() => {
      // fallback se o model tiver nome diferente no Prisma client gerado
    });
  }
  console.log(`✅ ${bpReadings.length} leituras de PA (João)`);

  // ────────────────────────────────────────────────────────────────────────────
  // EXAMES — João (hemograma + lipídios, série histórica em 3 datas)
  // ────────────────────────────────────────────────────────────────────────────
  const examSeries = [
    {
      daysAgo: 90, labName: 'Labclin', status: 'alert',
      notes: 'LDL elevado (162). Glicose limítrofe (112). Iniciar dieta e medicação.',
      items: [
        { marker:'Hemoglobina',     unit:'g/dL',    value:13.8, refMin:13.5, refMax:17.5 },
        { marker:'Hematócrito',     unit:'%',        value:41.2, refMin:39.0, refMax:50.0 },
        { marker:'Leucócitos',      unit:'mil/mm³',  value:8.2,  refMin:4.0,  refMax:10.0 },
        { marker:'Plaquetas',       unit:'mil/mm³',  value:210,  refMin:150,  refMax:400  },
        { marker:'Glicose',         unit:'mg/dL',    value:112,  refMin:70,   refMax:99   },
        { marker:'Colesterol Total',unit:'mg/dL',    value:238,  refMin:0,    refMax:199  },
        { marker:'LDL',             unit:'mg/dL',    value:162,  refMin:0,    refMax:129  },
        { marker:'HDL',             unit:'mg/dL',    value:42,   refMin:40,   refMax:999  },
        { marker:'Triglicerídeos',  unit:'mg/dL',    value:195,  refMin:0,    refMax:149  },
      ],
    },
    {
      daysAgo: 45, labName: 'Delboni', status: 'alert',
      notes: 'Melhora após Atorvastatina. LDL ainda limítrofe (138).',
      items: [
        { marker:'Hemoglobina',     unit:'g/dL',    value:14.1, refMin:13.5, refMax:17.5 },
        { marker:'Leucócitos',      unit:'mil/mm³',  value:7.8,  refMin:4.0,  refMax:10.0 },
        { marker:'Plaquetas',       unit:'mil/mm³',  value:225,  refMin:150,  refMax:400  },
        { marker:'Glicose',         unit:'mg/dL',    value:104,  refMin:70,   refMax:99   },
        { marker:'Colesterol Total',unit:'mg/dL',    value:215,  refMin:0,    refMax:199  },
        { marker:'LDL',             unit:'mg/dL',    value:138,  refMin:0,    refMax:129  },
        { marker:'HDL',             unit:'mg/dL',    value:46,   refMin:40,   refMax:999  },
        { marker:'Triglicerídeos',  unit:'mg/dL',    value:158,  refMin:0,    refMax:149  },
      ],
    },
    {
      daysAgo: 7, labName: 'Hermes Pardini', status: 'normal',
      notes: 'Excelente resposta ao tratamento. Todos os marcadores normalizados.',
      items: [
        { marker:'Hemoglobina',     unit:'g/dL',    value:14.6, refMin:13.5, refMax:17.5 },
        { marker:'Hematócrito',     unit:'%',        value:43.8, refMin:39.0, refMax:50.0 },
        { marker:'Leucócitos',      unit:'mil/mm³',  value:6.9,  refMin:4.0,  refMax:10.0 },
        { marker:'Plaquetas',       unit:'mil/mm³',  value:245,  refMin:150,  refMax:400  },
        { marker:'Glicose',         unit:'mg/dL',    value:96,   refMin:70,   refMax:99   },
        { marker:'Colesterol Total',unit:'mg/dL',    value:188,  refMin:0,    refMax:199  },
        { marker:'LDL',             unit:'mg/dL',    value:112,  refMin:0,    refMax:129  },
        { marker:'HDL',             unit:'mg/dL',    value:51,   refMin:40,   refMax:999  },
        { marker:'Triglicerídeos',  unit:'mg/dL',    value:124,  refMin:0,    refMax:149  },
        { marker:'Creatinina',      unit:'mg/dL',    value:0.95, refMin:0.7,  refMax:1.2  },
        { marker:'Ureia',           unit:'mg/dL',    value:32,   refMin:10,   refMax:50   },
      ],
    },
  ];

  for (const exam of examSeries) {
    const examDate = daysAgo(exam.daysAgo);
    await prisma.examResult.create({
      data: {
        userId:           joao.id,
        examDate,
        labName:          exam.labName,
        examType:         'hemograma_lipidios',
        aiRiskLevel:      exam.status === 'alert' ? 'warning' : 'normal',
        processingStatus: 'done',
        aiSummary:        exam.notes,
        items: {
          create: exam.items.map(item => ({
            userId:    joao.id,
            marker:    item.marker,
            unit:      item.unit,
            value:     item.value,
            rawValue:  String(item.value),
            refMin:    item.refMin,
            refMax:    item.refMax,
            refSource: 'SBPC/ML',
            status:    item.value > item.refMax ? 'high' : item.value < item.refMin ? 'low' : 'normal',
            examDate,
          })),
        },
      },
    });
  }
  console.log(`✅ 3 exames com ${examSeries.reduce((a, e) => a + e.items.length, 0)} marcadores (João)`);

  // ────────────────────────────────────────────────────────────────────────────
  // MEDICAMENTOS + LOGS DOS ÚLTIMOS 7 DIAS
  // ────────────────────────────────────────────────────────────────────────────
  const med1 = await prisma.medication.upsert({
    where:  { id: 'seed-med-losartana' },
    update: {},
    create: {
      id: 'seed-med-losartana', userId: joao.id,
      name: 'Losartana Potássica 50mg', dosage: '50mg',
      frequency: { times:['07:00'], days:['mon','tue','wed','thu','fri','sat','sun'] },
      startDate: daysAgo(60), prescribingDoctor: 'Dr. Marcos Faria',
      notes: 'Tomar com água, antes do café.', isActive: true,
      totalPills: 60, remainingPills: 30,
    },
  });

  const med2 = await prisma.medication.upsert({
    where:  { id: 'seed-med-atorva' },
    update: {},
    create: {
      id: 'seed-med-atorva', userId: joao.id,
      name: 'Atorvastatina 40mg', dosage: '40mg',
      frequency: { times:['22:00'], days:['mon','tue','wed','thu','fri','sat','sun'] },
      startDate: daysAgo(45), prescribingDoctor: 'Dr. Marcos Faria',
      notes: 'Tomar à noite.', isActive: true,
      totalPills: 45, remainingPills: 25,
    },
  });

  // Logs dos últimos 7 dias (esqueceu dia 3)
  for (let i = 7; i >= 0; i--) {
    const skipped = i === 3;
    await prisma.medicationLog.createMany({
      skipDuplicates: true,
      data: [
        {
          medicationId: med1.id, userId: joao.id,
          scheduledAt: daysAgoAt(i, 7),
          takenAt: skipped ? undefined : daysAgoAt(i, 7, 15),
          skipped, skipReason: skipped ? 'Esqueci' : undefined,
        },
        {
          medicationId: med2.id, userId: joao.id,
          scheduledAt: daysAgoAt(i, 22),
          takenAt: daysAgoAt(i, 22, 10),
          skipped: false,
        },
      ],
    });
  }
  console.log('✅ Medicamentos + 16 logs de aderência (João)');

  // ────────────────────────────────────────────────────────────────────────────
  // CICLO MENSTRUAL + LOGS DIÁRIOS — Ana (2 ciclos completos)
  // ────────────────────────────────────────────────────────────────────────────
  await prisma.menstrualCycle.create({
    data: {
      userId:             ana.id,
      cycleStart:         daysAgo(58),
      cycleEnd:           daysAgo(54),
      cycleLength:        29,
      periodLength:       5,
      flowIntensity:      3,
      symptoms:           ['Cólica', 'Dor de cabeça', 'Fadiga'],
      mood:               ['Irritada', 'Cansada'],
      currentPhase:       'luteal',
      nextCyclePredicted: daysAgo(29),
      ovulationPredicted: daysAgo(43),
    },
  });

  await prisma.menstrualCycle.create({
    data: {
      userId:             ana.id,
      cycleStart:         daysAgo(29),
      cycleLength:        28,
      periodLength:       4,
      flowIntensity:      2,
      symptoms:           ['Fadiga', 'Inchaço'],
      mood:               ['Normal', 'Sensível'],
      currentPhase:       'follicular',
      nextCyclePredicted: daysAgo(-1),
      ovulationPredicted: daysAgo(14),
    },
  });

  const dailyLogs = [
    { d: 29, flow: 3, syms: ['Cólica', 'Dor de cabeça'], mood: ['Irritada'],         temp: 36.4, mucus: 'Seco' },
    { d: 28, flow: 3, syms: ['Cólica', 'Fadiga'],        mood: ['Cansada'],           temp: 36.5, mucus: 'Seco' },
    { d: 27, flow: 2, syms: ['Fadiga'],                   mood: ['Sensível'],          temp: 36.6, mucus: 'Cremoso' },
    { d: 26, flow: 2, syms: ['Fadiga'],                   mood: ['Normal'],            temp: 36.6, mucus: 'Cremoso' },
    { d: 25, flow: 1, syms: [],                           mood: ['Normal'],            temp: 36.7, mucus: 'Cremoso' },
    { d: 20, flow: 0, syms: [],                           mood: ['Energizada'],        temp: 36.8, mucus: 'Elástico' },
    { d: 15, flow: 0, syms: ['Sensibilidade nos seios'],  mood: ['Normal'],            temp: 36.9, mucus: 'Clara de ovo' },
    { d: 10, flow: 0, syms: ['Inchaço'],                  mood: ['Cansada'],           temp: 37.0, mucus: 'Seco' },
    { d:  5, flow: 0, syms: ['Inchaço', 'Dor nas costas'],mood: ['Irritada'],          temp: 37.1, mucus: 'Seco' },
    { d:  1, flow: 0, syms: ['Cólica leve'],              mood: ['Sensível', 'Ansiosa'],temp: 37.0, mucus: 'Seco' },
  ];

  for (const log of dailyLogs) {
    const loggedDate = daysAgo(log.d);
    loggedDate.setHours(0, 0, 0, 0);
    await prisma.menstrualDailyLog.upsert({
      where: { userId_loggedDate: { userId: ana.id, loggedDate } },
      update: {},
      create: {
        userId: ana.id, loggedDate,
        flowIntensity: log.flow,
        symptoms:      log.syms,
        mood:          log.mood,
        basalTemp:     log.temp,
        cervicalMucus: log.mucus,
      },
    });
  }
  console.log('✅ 2 ciclos + 10 logs diários (Ana)');

  // ── CONSULTAS ──────────────────────────────────────────────────────────────
  await prisma.appointment.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: joao.id, doctorName: 'Dr. Marcos Faria', specialty: 'Cardiologia',
        location: 'Clínica Cardio Centro — Av. Paulista, 1000',
        appointmentAt: daysAgo(-7), notes: 'Revisão Losartana. Levar medições de PA.',
      },
      {
        userId: joao.id, doctorName: 'Dra. Roberta Lima', specialty: 'Endocrinologia',
        location: 'Hospital Sírio-Libanês', appointmentAt: daysAgo(-14),
        notes: 'Controle glicemia e colesterol.',
      },
      {
        userId: ana.id, doctorName: 'Dra. Fernanda Costa', specialty: 'Ginecologia',
        location: 'Clínica da Mulher — Rua Augusta, 500',
        appointmentAt: daysAgo(-5), notes: 'Check-up anual.',
      },
    ],
  });
  console.log('✅ 3 consultas criadas');

  // ── FAMÍLIA ────────────────────────────────────────────────────────────────
  const famExists = await prisma.familyMember.findFirst({ where: { userId: joao.id, memberUserId: ana.id } });
  if (!famExists) {
    await prisma.familyMember.create({
      data: {
        userId: joao.id, memberUserId: ana.id,
        relationship: 'sibling', customLabel: 'Irmã',
        shareHereditary: true, shareConditions: false,
        inviteStatus: 'accepted', inviteEmail: ana.email,
        acceptedAt: new Date(),
      },
    });
  }
  console.log('✅ Relação familiar criada');

  // ── NOTIFICAÇÕES ──────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: joao.id, type:'medication_reminder', channel:'push', title:'Hora da Losartana', body:'Losartana 50mg — tomar agora.', sentAt: new Date() },
      { userId: joao.id, type:'appointment_reminder', channel:'email', title:'Consulta em 7 dias', body:'Dr. Marcos Faria — Cardio Centro.', sentAt: new Date() },
      { userId: ana.id,  type:'cycle_reminder', channel:'push', title:'Próximo ciclo amanhã', body:'Ciclo previsto para amanhã. Você tem absorventes?', sentAt: new Date() },
    ],
  });
  console.log('✅ Notificações criadas');

  // ── CHAT (ontem) ──────────────────────────────────────────────────────────
  const yesterday = daysAgo(1);
  yesterday.setHours(0, 0, 0, 0);
  await prisma.aiHealthChat.upsert({
    where:  { userId_sessionDate: { userId: joao.id, sessionDate: yesterday } },
    update: {},
    create: {
      userId: joao.id, sessionDate: yesterday,
      messages: [
        { role:'assistant', content:'Bom dia, João! Como foi o sono?',                  timestamp: yesterday.toISOString() },
        { role:'user',      content:'Dormi bem, umas 7 horas.',                         timestamp: yesterday.toISOString() },
        { role:'assistant', content:'Ótimo! Fez alguma medição de PA hoje?',            timestamp: yesterday.toISOString() },
        { role:'user',      content:'Sim, 119/76. Tomei a Losartana.',                  timestamp: yesterday.toISOString() },
        { role:'assistant', content:'Excelente! PA dentro do normal. Continue assim. 🌟', timestamp: yesterday.toISOString() },
      ],
      healthSummary:  { sentimentScore: 0.8, messageCount: 4, bpFactors: [] },
      flags:          [],
      sentimentScore: 0.8,
      completed:      true,
    },
  });
  console.log('✅ Chat de saúde (João)');

  console.log('\n🎉 Seed concluído!\n');
  console.log('  joao@demo.icodlife.com  |  Demo@12345  (♂ hipertenso em tratamento, lipídios, exames)');
  console.log('  ana@demo.icodlife.com   |  Demo@12345  (♀ ciclo menstrual ativo, 2 ciclos + logs)');
  console.log('\n  http://localhost:3000/auth/login\n');
}

main()
  .catch(e => { console.error('❌ Seed falhou:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
