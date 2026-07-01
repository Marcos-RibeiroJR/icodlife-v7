// apps/api/prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysAgoAt = (n: number, h: number, m = 0) => { const d = daysAgo(n); d.setHours(h,m,0,0); return d; };

async function main() {
  console.log('🌱 Seed IcodLife...\n');

  // ── REGIÕES ─────────────────────────────────────────────────────────────────
  const regSudeste     = await prisma.region.upsert({ where:{id:1}, update:{}, create:{id:1,icodeNum:'01',name:'Sudeste'} });
  const regNorte       = await prisma.region.upsert({ where:{id:2}, update:{}, create:{id:2,icodeNum:'02',name:'Norte'} });
  const regNordeste    = await prisma.region.upsert({ where:{id:3}, update:{}, create:{id:3,icodeNum:'03',name:'Nordeste'} });
  const regSul         = await prisma.region.upsert({ where:{id:4}, update:{}, create:{id:4,icodeNum:'04',name:'Sul'} });
  const regCentroOeste = await prisma.region.upsert({ where:{id:5}, update:{}, create:{id:5,icodeNum:'05',name:'Centro-Oeste'} });
  console.log('✅ Regiões');

  // ── PAÍS + ESTADOS ───────────────────────────────────────────────────────────
  const brasil = await prisma.country.upsert({ where:{code:'BR'}, update:{}, create:{icodeNum:'01',name:'Brasil',nameEn:'Brazil',code:'BR'} });
  await prisma.country.upsert({ where:{code:'US'}, update:{}, create:{icodeNum:'02',name:'Estados Unidos',nameEn:'United States',code:'US'} });

  const statesData = [
    {icodeNum:'01',name:'São Paulo',         uf:'SP',ibgeCode:'35',regionId:regSudeste.id},
    {icodeNum:'09',name:'Espírito Santo',     uf:'ES',ibgeCode:'32',regionId:regSudeste.id},
    {icodeNum:'12',name:'Minas Gerais',       uf:'MG',ibgeCode:'31',regionId:regSudeste.id},
    {icodeNum:'20',name:'Rio de Janeiro',     uf:'RJ',ibgeCode:'33',regionId:regSudeste.id},
    {icodeNum:'02',name:'Acre',               uf:'AC',ibgeCode:'12',regionId:regNorte.id},
    {icodeNum:'04',name:'Amazonas',           uf:'AM',ibgeCode:'13',regionId:regNorte.id},
    {icodeNum:'15',name:'Pará',               uf:'PA',ibgeCode:'15',regionId:regNorte.id},
    {icodeNum:'03',name:'Alagoas',            uf:'AL',ibgeCode:'27',regionId:regNordeste.id},
    {icodeNum:'06',name:'Bahia',              uf:'BA',ibgeCode:'29',regionId:regNordeste.id},
    {icodeNum:'07',name:'Ceará',              uf:'CE',ibgeCode:'23',regionId:regNordeste.id},
    {icodeNum:'16',name:'Paraíba',            uf:'PB',ibgeCode:'25',regionId:regNordeste.id},
    {icodeNum:'17',name:'Pernambuco',         uf:'PE',ibgeCode:'26',regionId:regNordeste.id},
    {icodeNum:'19',name:'Paraná',             uf:'PR',ibgeCode:'41',regionId:regSul.id},
    {icodeNum:'24',name:'Rio Grande do Sul',  uf:'RS',ibgeCode:'43',regionId:regSul.id},
    {icodeNum:'25',name:'Santa Catarina',     uf:'SC',ibgeCode:'42',regionId:regSul.id},
    {icodeNum:'08',name:'Distrito Federal',   uf:'DF',ibgeCode:'53',regionId:regCentroOeste.id},
    {icodeNum:'10',name:'Goiás',              uf:'GO',ibgeCode:'52',regionId:regCentroOeste.id},
    {icodeNum:'13',name:'Mato Grosso do Sul', uf:'MS',ibgeCode:'50',regionId:regCentroOeste.id},
    {icodeNum:'14',name:'Mato Grosso',        uf:'MT',ibgeCode:'51',regionId:regCentroOeste.id},
    {icodeNum:'18',name:'Piauí',              uf:'PI',ibgeCode:'22',regionId:regNordeste.id},
    {icodeNum:'21',name:'Rio Grande do Norte',uf:'RN',ibgeCode:'24',regionId:regNordeste.id},
    {icodeNum:'22',name:'Rondônia',           uf:'RO',ibgeCode:'11',regionId:regNorte.id},
    {icodeNum:'23',name:'Roraima',            uf:'RR',ibgeCode:'14',regionId:regNorte.id},
    {icodeNum:'26',name:'Sergipe',            uf:'SE',ibgeCode:'28',regionId:regNordeste.id},
    {icodeNum:'27',name:'Tocantins',          uf:'TO',ibgeCode:'17',regionId:regNorte.id},
    {icodeNum:'05',name:'Amapá',              uf:'AP',ibgeCode:'16',regionId:regNorte.id},
    {icodeNum:'11',name:'Maranhão',           uf:'MA',ibgeCode:'21',regionId:regNordeste.id},
  ];
  for (const s of statesData) {
    await prisma.state.upsert({ where:{uf:s.uf}, update:{}, create:{...s, countryId:brasil.id} });
  }
  console.log('✅ Países e estados (27 UFs)');

  // ── ICODE COUNTER ────────────────────────────────────────────────────────────
  await prisma.icodeCounter.upsert({ where:{id:1}, update:{}, create:{id:1, nextValue:1n} });
  console.log('✅ IcodeCounter inicializado');

  // ── HASH DE SENHA ─────────────────────────────────────────────────────────────
  const pwdHash = await bcrypt.hash('Demo@12345', 12);

  // ── USUÁRIOS DEMO ─────────────────────────────────────────────────────────────
  const joao = await prisma.user.upsert({
    where:  { email: 'joao@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active' },
    create: {
      email: 'joao@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'João Carlos Silva', dateOfBirth: new Date('1985-03-15'),
      gender: 'male', bloodType: 'A_PLUS', isDonor: true,
      status: 'active', phone: '+5511987654321',
      icode: '01.01.01.1.0000001', stateCode: 'SP',
      allergies: ['Penicilina', 'Dipirona'],
      chronicConditions: ['Hipertensão leve'],
      emergencyContactName: 'Maria Silva', emergencyContactPhone: '+5511912345678',
      emergencyContactRel: 'Esposa', emailVerifiedAt: new Date(),
    },
  });

  const ana = await prisma.user.upsert({
    where:  { email: 'ana@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active' },
    create: {
      email: 'ana@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'Ana Paula Rodrigues', dateOfBirth: new Date('1992-07-22'),
      gender: 'female', bloodType: 'O_PLUS', isDonor: false,
      status: 'active', phone: '+5511976543210',
      icode: '01.01.01.2.0000002', stateCode: 'SP',
      allergies: ['Látex'], chronicConditions: [],
      emergencyContactName: 'Carlos Rodrigues', emergencyContactPhone: '+5511911223344',
      emergencyContactRel: 'Pai', emailVerifiedAt: new Date(),
    },
  });

  // ── DOUTOR DEMO ───────────────────────────────────────────────────────────────
  const drUser = await prisma.user.upsert({
    where:  { email: 'dr.marcos@demo.icodlife.com' },
    update: { passwordHash: pwdHash, status: 'active', role: 'doctor' },
    create: {
      email: 'dr.marcos@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'Dr. Marcos Faria', dateOfBirth: new Date('1978-05-10'),
      gender: 'male', bloodType: 'B_PLUS', isDonor: false,
      status: 'active', role: 'doctor', phone: '+5511955551234',
      icode: '01.01.01.1.0000003', stateCode: 'SP',
      allergies: [], chronicConditions: [], emailVerifiedAt: new Date(),
    },
  });

  await prisma.doctor.upsert({
    where: { userId: drUser.id },
    update: { crmStatus: 'verified' },
    create: {
      userId:      drUser.id,
      doctorId:    'DR.00001.SP',
      crm:         '123456',
      uf:          'SP',
      crmStatus:   'verified',
      specialties: ['Cardiologia', 'Clínica Geral'],
      healthPlans: ['Unimed', 'Bradesco Saúde', 'SulAmérica'],
      bio:         'Cardiologista com 15 anos de experiência. Especialização em insuficiência cardíaca e prevenção cardiovascular.',
      consultPrice: 250.00,
      addressCity:  'São Paulo',
      addressState: 'SP',
      phone:        '+5511955551234',
      languages:    ['Português', 'Inglês'],
      education:    [],
      certifications: [],
    },
  });

  // Vincular João como paciente do Dr. Marcos
  const doctor = await prisma.doctor.findUnique({ where: { userId: drUser.id } });
  if (doctor) {
    await prisma.patientDoctor.upsert({
      where: { id: 'seed-patient-joao' },
      update: {},
      create: {
        id:       'seed-patient-joao',
        doctorId: doctor.id,
        userId:   joao.id,
        status:   'active',
        specialty: 'Cardiologia',
      },
    });
  }

  console.log(`✅ Usuários demo: ${joao.email} | ${ana.email} | ${drUser.email}`);

  // ── CONSENTIMENTOS ─────────────────────────────────────────────────────────
  for (const userId of [joao.id, ana.id, drUser.id]) {
    await prisma.userConsent.createMany({
      skipDuplicates: true,
      data: [
        { userId, consentType:'terms_of_use',    version:'1.0.0', accepted:true, ipAddress:'127.0.0.1' },
        { userId, consentType:'data_processing', version:'1.0.0', accepted:true, ipAddress:'127.0.0.1' },
      ],
    });
  }

  // ── MEDICAMENTOS ──────────────────────────────────────────────────────────────
  const med1 = await prisma.medication.upsert({
    where:  { id: 'seed-med-losartana' },
    update: {},
    create: {
      id: 'seed-med-losartana', userId: joao.id,
      name: 'Losartana Potássica', dosage: '50mg', frequency: 'daily',
      scheduledTimes: ['07:00'],
      startDate: daysAgo(180), isActive: true, isContinuous: true,
      prescribingDoctor: 'Dr. Marcos Faria', indication: 'Hipertensão arterial',
    },
  });
  const med2 = await prisma.medication.upsert({
    where:  { id: 'seed-med-atorva' },
    update: {},
    create: {
      id: 'seed-med-atorva', userId: joao.id,
      name: 'Atorvastatina', dosage: '20mg', frequency: 'daily',
      scheduledTimes: ['22:00'],
      startDate: daysAgo(90), isActive: true, isContinuous: true,
      prescribingDoctor: 'Dr. Marcos Faria', indication: 'Colesterol elevado',
    },
  });
  for (let i = 0; i < 7; i++) {
    await prisma.medicationLog.createMany({
      skipDuplicates: true,
      data: [
        { medicationId: med1.id, userId: joao.id, takenAt: daysAgoAt(i, 7) },
        { medicationId: med2.id, userId: joao.id, takenAt: daysAgoAt(i, 22) },
      ],
    });
  }
  console.log('✅ Medicamentos + logs');

  // ── EXAMES ──────────────────────────────────────────────────────────────────
  const examSeries = [
    { daysAgo: 90, labName:'Labclin',       summary:'LDL elevado (162). Glicose limítrofe (112).', risk:'warning',
      items:[
        {marker:'Hemoglobina',unit:'g/dL',value:13.8,refMin:13.5,refMax:17.5},
        {marker:'Glicose',unit:'mg/dL',value:112,refMin:70,refMax:99},
        {marker:'Colesterol Total',unit:'mg/dL',value:238,refMin:0,refMax:199},
        {marker:'LDL',unit:'mg/dL',value:162,refMin:0,refMax:129},
        {marker:'HDL',unit:'mg/dL',value:42,refMin:40,refMax:999},
        {marker:'Triglicerídeos',unit:'mg/dL',value:195,refMin:0,refMax:149},
      ]},
    { daysAgo: 7, labName:'Hermes Pardini', summary:'Excelente resposta. Todos normalizados.', risk:'normal',
      items:[
        {marker:'Hemoglobina',unit:'g/dL',value:14.6,refMin:13.5,refMax:17.5},
        {marker:'Glicose',unit:'mg/dL',value:96,refMin:70,refMax:99},
        {marker:'Colesterol Total',unit:'mg/dL',value:188,refMin:0,refMax:199},
        {marker:'LDL',unit:'mg/dL',value:112,refMin:0,refMax:129},
        {marker:'HDL',unit:'mg/dL',value:51,refMin:40,refMax:999},
        {marker:'Triglicerídeos',unit:'mg/dL',value:124,refMin:0,refMax:149},
        {marker:'Creatinina',unit:'mg/dL',value:0.95,refMin:0.7,refMax:1.2},
      ]},
  ];
  for (const exam of examSeries) {
    const examDate = daysAgo(exam.daysAgo);
    await prisma.examResult.create({
      data: {
        userId: joao.id, examDate,
        labName: exam.labName, examType: 'hemograma_lipidios',
        aiRiskLevel: exam.risk, processingStatus: 'done',
        aiSummary: exam.summary, aiFlags: [],
        items: {
          create: exam.items.map(i => ({
            userId: joao.id, marker: i.marker, unit: i.unit,
            value: i.value, rawValue: String(i.value),
            refMin: i.refMin, refMax: i.refMax, refSource: 'SBPC/ML',
            status: i.value > i.refMax ? 'high' : i.value < i.refMin ? 'low' : 'normal',
            examDate,
          })),
        },
      },
    });
  }
  console.log('✅ Exames com marcadores (João)');

  // ── NOTIFICAÇÕES ───────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { userId: joao.id, type:'medication_reminder', title:'Hora da Losartana', body:'Losartana 50mg — tomar agora.' },
      { userId: joao.id, type:'appointment_reminder', title:'Consulta em 7 dias', body:'Dr. Marcos Faria — Cardio Centro, SP.' },
      { userId: ana.id,  type:'cycle_reminder', title:'Próximo ciclo amanhã', body:'Ciclo previsto para amanhã.' },
    ],
  });
  console.log('✅ Notificações');

  // ── ICODE COUNTER — ajustar para o próximo valor livre ─────────────────────
  await prisma.icodeCounter.update({ where:{id:1}, data:{ nextValue: 4n } });

  console.log('\n🎉 Seed concluído!');
  console.log('\n📋 Contas demo (senha: Demo@12345):');
  console.log('   Usuário: joao@demo.icodlife.com');
  console.log('   Usuária: ana@demo.icodlife.com');
  console.log('   Doutor:  dr.marcos@demo.icodlife.com  → portal http://localhost:3002');
}

main()
  .catch(e => { console.erro