// apps/api/prisma/seed-bigdata.js
//
// Seed de massa de dados para o POC de Big Data / hereditariedade do ICODLIFE.
// Cria 400 usuários-paciente (200 homens, 200 mulheres, idades de 0 a 85 anos),
// sendo 15 famílias de 8 pessoas (avô/avó paterno, avô/avó materno, casal e dois
// filhos, com herança real de alelos ABO/Rh e tendência a condições crônicas) e
// 280 indivíduos avulsos. Todos vinculados como pacientes do médico demo, para
// aparecerem tanto no app Paciente (login próprio) quanto no app Doutor.
//
// Como rodar (na raiz do monorepo, com o Postgres do docker-compose no ar):
//   cd apps/api
//   node prisma/seed-bigdata.js
//
// É idempotente na parte de país/estado/região/médico (upsert), mas os 400
// usuários são criados com e-mails determinísticos — rodar de novo vai pular
// os que já existem (skipDuplicates) em vez de duplicar.

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../src/generated/prisma');
const { generateDataset, SENHA_PADRAO } = require('./bigdata/generator');

const prisma = new PrismaClient();

const BLOOD_ENUM_TO_LABEL = {
  A_PLUS: 'A+', A_MINUS: 'A-', B_PLUS: 'B+', B_MINUS: 'B-',
  AB_PLUS: 'AB+', AB_MINUS: 'AB-', O_PLUS: 'O+', O_MINUS: 'O-', unknown: '?',
};

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

// ── geografia + médico demo (idempotente, roda mesmo em banco 100% vazio) ──────
async function ensureBaseData() {
  const regSudeste     = await prisma.region.upsert({ where:{id:1}, update:{}, create:{id:1,icodeNum:'01',name:'Sudeste'} });
  const regNorte       = await prisma.region.upsert({ where:{id:2}, update:{}, create:{id:2,icodeNum:'02',name:'Norte'} });
  const regNordeste    = await prisma.region.upsert({ where:{id:3}, update:{}, create:{id:3,icodeNum:'03',name:'Nordeste'} });
  const regSul         = await prisma.region.upsert({ where:{id:4}, update:{}, create:{id:4,icodeNum:'04',name:'Sul'} });
  const regCentroOeste = await prisma.region.upsert({ where:{id:5}, update:{}, create:{id:5,icodeNum:'05',name:'Centro-Oeste'} });

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

  await prisma.icodeCounter.upsert({ where:{id:1}, update:{}, create:{id:1, nextValue:1n} });

  const pwdHash = await bcrypt.hash(SENHA_PADRAO, 12);
  const drUser = await prisma.user.upsert({
    where:  { email: 'dr.marcos@demo.icodlife.com' },
    update: {},
    create: {
      email: 'dr.marcos@demo.icodlife.com', passwordHash: pwdHash,
      fullName: 'Dr. Marcos Faria', dateOfBirth: new Date('1978-05-10'),
      gender: 'male', bloodType: 'B_PLUS', isDonor: false,
      status: 'active', role: 'doctor', phone: '+5511955551234',
      icode: '01.01.01.1.0000003', stateCode: 'SP',
      allergies: [], chronicConditions: [], emailVerifiedAt: new Date(),
    },
  });
  const doctor = await prisma.doctor.upsert({
    where: { userId: drUser.id },
    update: { crmStatus: 'verified' },
    create: {
      userId: drUser.id, doctorId: 'DR.00001.SP', crm: '123456', uf: 'SP',
      crmStatus: 'verified', specialties: ['Cardiologia', 'Clínica Geral'],
      healthPlans: ['Unimed', 'Bradesco Saúde', 'SulAmérica'],
      bio: 'Cardiologista com 15 anos de experiência.',
      consultPrice: 250.0, addressCity: 'São Paulo', addressState: 'SP',
      phone: '+5511955551234', languages: ['Português', 'Inglês'],
      education: [], certifications: [],
    },
  });

  // garante que o contador nunca reutilize os icodes hardcoded 1/2/3 (joão/ana/dr.marcos)
  const counterRow = await prisma.icodeCounter.findUnique({ where: { id: 1 } });
  if (counterRow && counterRow.nextValue < 4n) {
    await prisma.icodeCounter.update({ where: { id: 1 }, data: { nextValue: 4n } });
  }

  console.log('✅ Geografia (regiões/país/27 UFs) + médico demo prontos');
  return { doctor };
}

// reserva atomicamente um bloco de N valores sequenciais do IcodeCounter global
async function reserveIcodeBlock(count) {
  const updated = await prisma.icodeCounter.upsert({
    where: { id: 1 },
    create: { id: 1, nextValue: BigInt(count + 1) },
    update: { nextValue: { increment: BigInt(count) } },
  });
  return updated.nextValue - BigInt(count);
}

const GENDER_NUM = { male: '1', female: '2', other: '3' };

async function main() {
  console.log('🌱 Seed BIG DATA — massa de 400 usuários / 15 famílias hereditárias\n');

  const { doctor } = await ensureBaseData();

  const dataset = generateDataset();
  const { people, relations, stats } = dataset;
  console.log(`📦 Dataset gerado: ${stats.total} pessoas (${stats.male}M / ${stats.female}F) — ${stats.familyMembers} em família, ${stats.standalone} avulsos`);

  // mapa uf -> { stateId, countryId, stateNum, regionNum }
  const states = await prisma.state.findMany({ include: { region: true } });
  const stateByUf = new Map(states.map((s) => [s.uf, s]));

  const icodeStart = await reserveIcodeBlock(people.length);

  const usersData = people.map((p, i) => {
    const state = stateByUf.get(p.uf);
    const stateNum = state ? state.icodeNum.padStart(2, '0') : '00';
    const regionNum = state ? state.region.icodeNum.padStart(2, '0') : '00';
    const genderNum = GENDER_NUM[p.gender] || '3';
    const sequential = String(icodeStart + BigInt(i)).padStart(7, '0');
    const icode = `01.${stateNum}.${regionNum}.${genderNum}.${sequential}`;

    return {
      id: p.id,
      email: p.email,
      cpf: p.cpf,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      bloodType: p.bloodTypeEnum,
      isDonor: p.isDonor,
      status: 'active',
      passwordHash: null, // preenchido abaixo, único hash pra todo mundo
      role: 'user',
      icode,
      icodeCountryId: state ? state.countryId : null,
      icodeStateId: state ? state.id : null,
      stateCode: p.uf,
      allergies: p.allergies,
      chronicConditions: p.chronicConditions,
      emailVerifiedAt: new Date(),
    };
  });

  const pwdHash = await bcrypt.hash(SENHA_PADRAO, 12);
  for (const u of usersData) u.passwordHash = pwdHash;

  console.log('⏳ Inserindo 400 usuários...');
  const createdUsers = await prisma.user.createMany({ data: usersData, skipDuplicates: true });
  console.log(`✅ ${createdUsers.count} usuários inseridos (${usersData.length - createdUsers.count} já existiam)`);

  // ── FamilyMember: grafo de hereditariedade ────────────────────────────────
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const familyMemberData = relations.map((r) => {
    const linked = peopleById.get(r.linkedUserId);
    return {
      ownerId: r.ownerId,
      linkedUserId: r.linkedUserId,
      relationship: r.relationship,
      fullName: linked.fullName,
      dateOfBirth: linked.dateOfBirth,
      gender: linked.gender,
      bloodType: linked.bloodTypeEnum,
      isDonor: linked.isDonor,
      inviteStatus: 'accepted',
      allergies: linked.allergies,
      chronicConditions: linked.chronicConditions,
    };
  });
  console.log(`⏳ Inserindo ${familyMemberData.length} vínculos familiares...`);
  const createdFamily = await prisma.familyMember.createMany({ data: familyMemberData, skipDuplicates: true });
  console.log(`✅ ${createdFamily.count} vínculos de FamilyMember inseridos`);

  // ── PatientDoctor: todos disponíveis no painel do médico demo ─────────────
  const patientDoctorData = people.map((p) => ({
    userId: p.id,
    doctorId: doctor.id,
    status: 'active',
    specialty: 'Clínica Geral',
  }));
  console.log('⏳ Vinculando os 400 pacientes ao médico demo (dr.marcos@demo.icodlife.com)...');
  const createdPD = await prisma.patientDoctor.createMany({ data: patientDoctorData, skipDuplicates: true });
  console.log(`✅ ${createdPD.count} vínculos paciente-médico inseridos`);

  // ── CSV de credenciais (definitivo, com icode real) ───────────────────────
  const csvHeader = ['grupo_familiar','papel_familia','nome_completo','email','senha','sexo','data_nascimento','idade','uf','icode','tipo_sanguineo','cpf'];
  const csvRows = usersData.map((u, i) => {
    const p = people[i];
    return [
      p.familyGroup, p.familyRole, p.fullName, p.email, SENHA_PADRAO,
      p.gender === 'male' ? 'M' : 'F', fmtDate(p.dateOfBirth), p.age, p.uf,
      u.icode, BLOOD_ENUM_TO_LABEL[p.bloodTypeEnum] || '?', p.cpf,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';');
  });
  const csvContent = [csvHeader.join(';'), ...csvRows].join('\n');
  const outPath = path.join(__dirname, 'bigdata', 'seed-bigdata-credenciais.csv');
  fs.writeFileSync(outPath, csvContent, 'utf-8');
  console.log(`📄 CSV de credenciais salvo em: ${outPath}`);

  console.log('\n🎉 Seed BIG DATA concluído!');
  console.log(`   400 usuários | senha para todos: ${SENHA_PADRAO}`);
  console.log('   15 famílias hereditárias (8 pessoas cada) + 280 avulsos');
  console.log('   Todos vinculados como pacientes de dr.marcos@demo.icodlife.com (app Doutor)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
