// apps/api/prisma/seed.ts
// Popular banco com dados iniciais para desenvolvimento

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco IcodLife...\n');

  // ── REGIÕES ─────────────────────────────────────────────────────────────────
  const regSudeste    = await prisma.region.upsert({ where:{id:1}, update:{}, create:{id:1, icodeNum:'01', name:'Sudeste'} });
  const regNorte      = await prisma.region.upsert({ where:{id:2}, update:{}, create:{id:2, icodeNum:'02', name:'Norte'} });
  const regNordeste   = await prisma.region.upsert({ where:{id:3}, update:{}, create:{id:3, icodeNum:'03', name:'Nordeste'} });
  const regSul        = await prisma.region.upsert({ where:{id:4}, update:{}, create:{id:4, icodeNum:'04', name:'Sul'} });
  const regCentroOeste= await prisma.region.upsert({ where:{id:5}, update:{}, create:{id:5, icodeNum:'05', name:'Centro-Oeste'} });
  console.log('✅ Regiões criadas');

  // ── PAÍS BRASIL ──────────────────────────────────────────────────────────────
  const brasil = await prisma.country.upsert({ where:{code:'BR'}, update:{}, create:{icodeNum:'01',name:'Brasil',nameEn:'Brazil',code:'BR'} });
  await prisma.country.upsert({ where:{code:'US'}, update:{}, create:{icodeNum:'02',name:'Estados Unidos',nameEn:'United States',code:'US'} });
  await prisma.country.upsert({ where:{code:'AR'}, update:{}, create:{icodeNum:'03',name:'Argentina',nameEn:'Argentina',code:'AR'} });
  await prisma.country.upsert({ where:{code:'PT'}, update:{}, create:{icodeNum:'04',name:'Portugal',nameEn:'Portugal',code:'PT'} });
  console.log('✅ Países criados');

  // ── ESTADOS (SP=01, demais em ordem alfabética por região) ──────────────────
  const statesData = [
    // Sudeste
    {icodeNum:'01',name:'São Paulo',          uf:'SP',ibgeCode:'35',regionId:regSudeste.id},
    {icodeNum:'09',name:'Espírito Santo',      uf:'ES',ibgeCode:'32',regionId:regSudeste.id},
    {icodeNum:'12',name:'Minas Gerais',        uf:'MG',ibgeCode:'31',regionId:regSudeste.id},
    {icodeNum:'20',name:'Rio de Janeiro',      uf:'RJ',ibgeCode:'33',regionId:regSudeste.id},
    // Norte
    {icodeNum:'02',name:'Acre',                uf:'AC',ibgeCode:'12',regionId:regNorte.id},
    {icodeNum:'04',name:'Amazonas',            uf:'AM',ibgeCode:'13',regionId:regNorte.id},
    {icodeNum:'05',name:'Amapá',               uf:'AP',ibgeCode:'16',regionId:regNorte.id},
    {icodeNum:'15',name:'Pará',                uf:'PA',ibgeCode:'15',regionId:regNorte.id},
    {icodeNum:'22',name:'Rondônia',            uf:'RO',ibgeCode:'11',regionId:regNorte.id},
    {icodeNum:'23',name:'Roraima',             uf:'RR',ibgeCode:'14',regionId:regNorte.id},
    {icodeNum:'27',name:'Tocantins',           uf:'TO',ibgeCode:'17',regionId:regNorte.id},
    // Nordeste
    {icodeNum:'03',name:'Alagoas',             uf:'AL',ibgeCode:'27',regionId:regNordeste.id},
    {icodeNum:'06',name:'Bahia',               uf:'BA',ibgeCode:'29',regionId:regNordeste.id},
    {icodeNum:'07',name:'Ceará',               uf:'CE',ibgeCode:'23',regionId:regNordeste.id},
    {icodeNum:'11',name:'Maranhão',            uf:'MA',ibgeCode:'21',regionId:regNordeste.id},
    {icodeNum:'16',name:'Paraíba',             uf:'PB',ibgeCode:'25',regionId:regNordeste.id},
    {icodeNum:'17',name:'Pernambuco',          uf:'PE',ibgeCode:'26',regionId:regNordeste.id},
    {icodeNum:'18',name:'Piauí',               uf:'PI',ibgeCode:'22',regionId:regNordeste.id},
    {icodeNum:'21',name:'Rio Grande do Norte', uf:'RN',ibgeCode:'24',regionId:regNordeste.id},
    {icodeNum:'26',name:'Sergipe',             uf:'SE',ibgeCode:'28',regionId:regNordeste.id},
    // Sul
    {icodeNum:'19',name:'Paraná',              uf:'PR',ibgeCode:'41',regionId:regSul.id},
    {icodeNum:'24',name:'Rio Grande do Sul',   uf:'RS',ibgeCode:'43',regionId:regSul.id},
    {icodeNum:'25',name:'Santa Catarina',      uf:'SC',ibgeCode:'42',regionId:regSul.id},
    // Centro-Oeste
    {icodeNum:'08',name:'Distrito Federal',    uf:'DF',ibgeCode:'53',regionId:regCentroOeste.id},
    {icodeNum:'10',name:'Goiás',               uf:'GO',ibgeCode:'52',regionId:regCentroOeste.id},
    {icodeNum:'13',name:'Mato Grosso do Sul',  uf:'MS',ibgeCode:'50',regionId:regCentroOeste.id},
    {icodeNum:'14',name:'Mato Grosso',         uf:'MT',ibgeCode:'51',regionId:regCentroOeste.id},
  ];
  for (const s of statesData) {
    await prisma.state.upsert({ where:{uf:s.uf}, update:{}, create:{...s, countryId:brasil.id} });
  }
  console.log(`✅ ${statesData.length} estados criados`);

  // ── CONTADOR ICODE ───────────────────────────────────────────────────────────
  const hasCounter = await prisma.icodeCounter.count();
  if (hasCounter === 0) await prisma.icodeCounter.create({ data:{ nextValue:1 } });
  console.log('✅ IcodeCounter inicializado');

  // ── USUÁRIO DEMO MASCULINO ──────────────────────────────────────────────────
  const pwdHash = await bcrypt.hash('Demo@12345', 12);

  const userMale = await prisma.user.upsert({
    where: { email: 'joao@demo.icodlife.com' },
    update: {},
    create: {
      email:          'joao@demo.icodlife.com',
      fullName:       'João Carlos Silva',
      dateOfBirth:    new Date('1985-03-15'),
      gender:         'male',
      bloodType:      'A_PLUS',
      isDonor:        true,
      status:         'active',
      phone:          '+5511987654321',
      allergies:      ['Penicilina', 'Dipirona'],
      chronicConditions: ['Hipertensão leve'],
      emergencyContactName:  'Maria Silva',
      emergencyContactPhone: '+5511912345678',
      emergencyContactRel:   'Esposa',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Usuário masculino: ${userMale.email}`);

  // ── USUÁRIO DEMO FEMININO ───────────────────────────────────────────────────
  const userFemale = await prisma.user.upsert({
    where: { email: 'ana@demo.icodlife.com' },
    update: {},
    create: {
      email:          'ana@demo.icodlife.com',
      fullName:       'Ana Paula Rodrigues',
      dateOfBirth:    new Date('1992-07-22'),
      gender:         'female',
      bloodType:      'O_PLUS',
      isDonor:        false,
      status:         'active',
      phone:          '+5511976543210',
      allergies:      ['Látex'],
      chronicConditions: [],
      emergencyContactName:  'Carlos Rodrigues',
      emergencyContactPhone: '+5511911223344',
      emergencyContactRel:   'Pai',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Usuária feminina: ${userFemale.email}`);

  // Salvar senhas no Redis seria feito pela API — aqui só criamos o user no PG
  // Em dev, a senha para ambos é: Demo@12345

  // ── CONSENTIMENTOS ──────────────────────────────────────────────────────────
  for (const userId of [userMale.id, userFemale.id]) {
    await prisma.userConsent.createMany({
      skipDuplicates: true,
      data: [
        { userId, consentType: 'terms_of_use',    version: '1.0.0', accepted: true, ipAddress: '127.0.0.1' },
        { userId, consentType: 'data_processing', version: '1.0.0', accepted: true, ipAddress: '127.0.0.1' },
        { userId, consentType: 'marketing',       version: '1.0.0', accepted: true, ipAddress: '127.0.0.1' },
      ],
    });
  }
  console.log('✅ Consentimentos criados');

  // ── EXAMES (João) ───────────────────────────────────────────────────────────
  await prisma.healthRecord.createMany({
    skipDuplicates: true,
    data: [
      {
        userId:       userMale.id,
        recordType:   'exam',
        category:     'blood',
        title:        'Hemograma Completo',
        labName:      'Labclin',
        recordDate:   new Date('2025-06-08'),
        resultStatus: 'normal',
        resultNotes:  'Todos os índices dentro da normalidade.',
      },
      {
        userId:       userMale.id,
        recordType:   'exam',
        category:     'cardiology',
        title:        'Colesterol Total e Frações',
        labName:      'Delboni',
        recordDate:   new Date('2025-06-01'),
        resultStatus: 'alert',
        resultNotes:  'LDL: 148 mg/dL — acima do ideal (<100). Iniciar Atorvastatina.',
      },
      {
        userId:       userMale.id,
        recordType:   'exam',
        category:     'cardiology',
        title:        'Eletrocardiograma (ECG)',
        labName:      'Hospital São Lucas',
        recordDate:   new Date('2025-05-15'),
        resultStatus: 'normal',
        resultNotes:  'Ritmo sinusal. Sem alterações.',
      },
    ],
  });
  console.log('✅ Exames criados (João)');

  // ── MEDICAMENTOS (João) ─────────────────────────────────────────────────────
  const med1 = await prisma.medication.create({
    data: {
      userId:            userMale.id,
      name:              'Losartana Potássica 50mg',
      dosage:            '50mg',
      frequency:         { times: ['07:00'], days: ['mon','tue','wed','thu','fri','sat','sun'] },
      startDate:         new Date('2025-04-15'),
      prescribingDoctor: 'Dr. Marcos Faria',
      notes:             'Tomar com água, antes do café da manhã.',
      isActive:          true,
    },
  });
  const med2 = await prisma.medication.create({
    data: {
      userId:            userMale.id,
      name:              'Atorvastatina 40mg',
      dosage:            '40mg',
      frequency:         { times: ['22:00'], days: ['mon','tue','wed','thu','fri','sat','sun'] },
      startDate:         new Date('2025-06-01'),
      prescribingDoctor: 'Dr. Marcos Faria',
      notes:             'Tomar à noite.',
      isActive:          true,
    },
  });
  console.log('✅ Medicamentos criados (João)');

  // ── CONSULTAS (João) ────────────────────────────────────────────────────────
  await prisma.appointment.createMany({
    data: [
      {
        userId:        userMale.id,
        doctorName:    'Dr. Marcos Faria',
        specialty:     'Cardiologia',
        location:      'Clínica Cardio Centro — Av. Paulista, 1000',
        appointmentAt: new Date('2025-06-19T14:00:00'),
        notes:         'Levar resultados do colesterol',
      },
      {
        userId:        userMale.id,
        doctorName:    'Dra. Ana Ribeiro',
        specialty:     'Endocrinologia',
        location:      'Hospital Sírio-Libanês',
        appointmentAt: new Date('2025-07-01T09:30:00'),
      },
    ],
  });
  console.log('✅ Consultas criadas (João)');

  // ── CICLO MENSTRUAL (Ana) ───────────────────────────────────────────────────
  await prisma.menstrualCycle.createMany({
    skipDuplicates: true,
    data: [
      {
        userId:              userFemale.id,
        cycleStart:          new Date('2025-05-10'),
        cycleEnd:            new Date('2025-05-14'),
        cycleLength:         28,
        periodLength:        5,
        flowIntensity:       3,
        symptoms:            ['Cólica', 'Dor de cabeça'],
        mood:                ['Irritada', 'Cansada'],
        currentPhase:        'luteal',
        nextCyclePredicted:  new Date('2025-06-07'),
        ovulationPredicted:  new Date('2025-05-24'),
      },
      {
        userId:              userFemale.id,
        cycleStart:          new Date('2025-06-07'),
        cycleLength:         28,
        periodLength:        5,
        flowIntensity:       2,
        symptoms:            ['Fadiga'],
        mood:                ['Normal'],
        currentPhase:        'follicular',
        nextCyclePredicted:  new Date('2025-07-05'),
        ovulationPredicted:  new Date('2025-06-21'),
      },
    ],
  });
  console.log('✅ Ciclos menstruais criados (Ana)');

  // ── FAMÍLIA (João convida Ana como irmã) ────────────────────────────────────
  await prisma.familyMember.create({
    data: {
      userId:         userMale.id,
      memberUserId:   userFemale.id,
      relationship:   'sibling',
      customLabel:    'Irmã',
      shareHereditary: true,
      shareConditions: false,
      inviteStatus:   'accepted',
      inviteEmail:    userFemale.email,
      acceptedAt:     new Date(),
    },
  });
  console.log('✅ Relação familiar criada');

  // ── AI CHAT (João — sessão de ontem) ────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  await prisma.aiHealthChat.upsert({
    where: { userId_sessionDate: { userId: userMale.id, sessionDate: yesterday } },
    update: {},
    create: {
      userId:      userMale.id,
      sessionDate: yesterday,
      messages:    [
        { role: 'assistant', content: 'Bom dia, João! Como foi o seu sono?', timestamp: yesterday.toISOString() },
        { role: 'user',      content: 'Dormi bem, umas 7 horas.', timestamp: yesterday.toISOString() },
        { role: 'assistant', content: 'Ótimo! Sentiu alguma dor hoje?', timestamp: yesterday.toISOString() },
        { role: 'user',      content: 'Não, estou bem hoje.', timestamp: yesterday.toISOString() },
        { role: 'assistant', content: 'Check-in concluído! Você está indo bem. 🌟', timestamp: yesterday.toISOString() },
      ],
      healthSummary:  { sentimentScore: 0.6, messageCount: 4 },
      flags:          [],
      sentimentScore: 0.6,
      completed:      true,
    },
  });
  console.log('✅ Chat de saúde criado (João)');

  // ── NOTIFICAÇÕES ────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId:  userMale.id,
        type:    'medication_reminder',
        channel: 'push',
        title:   'Hora do remédio!',
        body:    'Losartana 50mg — tomar agora.',
        sentAt:  new Date(),
      },
      {
        userId:  userMale.id,
        type:    'appointment_reminder',
        channel: 'email',
        title:   'Consulta amanhã',
        body:    'Dr. Marcos Faria às 14h — Cardio Centro.',
        sentAt:  new Date(),
      },
    ],
  });
  console.log('✅ Notificações criadas');

  console.log('\n🎉 Seed concluído com sucesso!\n');
  console.log('  Usuários de demonstração:');
  console.log('  📧 joao@demo.icodlife.com  |  senha: Demo@12345  (masculino)');
  console.log('  📧 ana@demo.icodlife.com   |  senha: Demo@12345  (feminino)');
  console.log('\n  Acesse: http://localhost:3000/auth/login\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
