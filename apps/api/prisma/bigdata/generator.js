// apps/api/prisma/bigdata/generator.js
//
// Gerador determinístico de massa de dados para o POC de Big Data / hereditariedade.
// Não toca no banco nem em nenhuma lib nativa (bcrypt, prisma) — só lógica pura em JS,
// então roda em qualquer Node.js (inclusive fora do monorepo) e sempre produz o MESMO
// dataset (mesmos nomes, e-mails, idades, famílias, tipos sanguíneos) porque usa um
// PRNG com seed fixa. Isso permite gerar uma prévia/planilha de credenciais ANTES de
// rodar o seed de verdade no banco, com garantia de que os dados batem 1:1.
//
// Consumido por: prisma/seed-bigdata.js (insere no Postgres) e por scripts de prévia.

const { MALE_FIRST, FEMALE_FIRST, SURNAMES, ALLERGY_POOL, CHRONIC_CONDITION_POOL } = require('./names');

const SEED = 20260718; // data do dia em que este gerador foi criado — fixa de propósito
const SENHA_PADRAO = 'Demo@12345'; // mesmo padrão já usado nos demais seeds do projeto
const EMAIL_DOMAIN = 'demo.icodlife.com'; // mesmo domínio dos usuários demo existentes
const TOTAL_USERS = 400;
const TOTAL_FAMILIES = 15;
const MEMBERS_PER_FAMILY = 8; // avô paterno, avó paterna, avô materno, avó materna, pai, mãe, filho1, filho2

// UFs já semeadas por prisma/seed.ts (tabela State) — pesos aproximam a distribuição
// populacional real do Brasil, dando variedade geográfica útil para o POC de big data.
const UF_WEIGHTS = [
  ['SP', 22], ['MG', 10], ['RJ', 8], ['BA', 7], ['PR', 6], ['RS', 6], ['PE', 5], ['CE', 5],
  ['PA', 4], ['SC', 4], ['GO', 4], ['MA', 3], ['ES', 2], ['PB', 2], ['AM', 2], ['RN', 2],
  ['MT', 2], ['AL', 2], ['PI', 2], ['DF', 2], ['MS', 1], ['SE', 1], ['RO', 1], ['TO', 1],
  ['AC', 1], ['AP', 1], ['RR', 1],
];
const UF_TABLE = UF_WEIGHTS.flatMap(([uf, weight]) => Array(weight).fill(uf));

function randomUf(rng) {
  return choice(rng, UF_TABLE);
}

// ── PRNG determinístico (mulberry32) ───────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function choice(rng, arr) {
  return arr[randInt(rng, 0, arr.length - 1)];
}

// remove e devolve um elemento aleatório do array (consome o pool)
function pickAndRemove(rng, arr) {
  if (arr.length === 0) return null;
  const i = randInt(rng, 0, arr.length - 1);
  return arr.splice(i, 1)[0];
}

function uuidFromRng(rng) {
  const bytes = [];
  for (let i = 0; i < 16; i++) bytes.push(randInt(rng, 0, 255));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── e-mail / cpf únicos ─────────────────────────────────────────────────────────
function makeEmailFactory() {
  const used = new Set();
  return function makeEmail(firstName, lastName) {
    const base = `${stripAccents(firstName)}.${stripAccents(lastName)}`.toLowerCase().replace(/[^a-z.]/g, '');
    let candidate = `${base}@${EMAIL_DOMAIN}`;
    let n = 1;
    while (used.has(candidate)) {
      n += 1;
      candidate = `${base}${n}@${EMAIL_DOMAIN}`;
    }
    used.add(candidate);
    return candidate;
  };
}

function makeCpfFactory() {
  let counter = 1;
  return function nextCpf() {
    // CPFs fake, claramente de teste (prefixo 999 — não existe faixa real com esse prefixo),
    // sem validação de dígito verificador no backend. 11 dígitos: 999 + 6 dígitos + 2 dígitos.
    const c = String(counter).padStart(6, '0');
    counter += 1;
    return `999${c}00`; // 3 + 6 + 2 = 11 dígitos
  };
}

// ── idade / data de nascimento ──────────────────────────────────────────────────
const TODAY = new Date();

function birthDateForAge(rng, age) {
  const d = new Date(TODAY);
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - randInt(rng, 0, 364)); // dia aleatório dentro do ano-alvo
  return d;
}

function ageFromDate(date) {
  const diff = TODAY.getTime() - date.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

// ── herança de tipo sanguíneo (alelos ABO + Rh) ─────────────────────────────────
const BLOOD_PHENOTYPE_TO_ENUM = {
  'A+': 'A_PLUS', 'A-': 'A_MINUS',
  'B+': 'B_PLUS', 'B-': 'B_MINUS',
  'AB+': 'AB_PLUS', 'AB-': 'AB_MINUS',
  'O+': 'O_PLUS', 'O-': 'O_MINUS',
};

function randomFounderAlleles(rng) {
  const r = rng();
  let phenotype;
  if (r < 0.36) phenotype = 'O';
  else if (r < 0.70) phenotype = 'A';
  else if (r < 0.78) phenotype = 'B';
  else phenotype = 'AB';

  let abo;
  if (phenotype === 'O') abo = ['O', 'O'];
  else if (phenotype === 'AB') abo = ['A', 'B'];
  else if (phenotype === 'A') abo = rng() < 0.5 ? ['A', 'A'] : ['A', 'O'];
  else abo = rng() < 0.5 ? ['B', 'B'] : ['B', 'O'];

  const rh = rng() < 0.85 ? (rng() < 0.5 ? ['D', 'D'] : ['D', 'd']) : ['d', 'd'];
  return { abo, rh };
}

function inheritAlleles(rng, parentA, parentB) {
  return {
    abo: [choice(rng, parentA.abo), choice(rng, parentB.abo)],
    rh: [choice(rng, parentA.rh), choice(rng, parentB.rh)],
  };
}

function phenotypeFromAlleles(alleles) {
  const hasA = alleles.abo.includes('A');
  const hasB = alleles.abo.includes('B');
  const letter = hasA && hasB ? 'AB' : hasA ? 'A' : hasB ? 'B' : 'O';
  const sign = alleles.rh.includes('D') ? '+' : '-';
  return BLOOD_PHENOTYPE_TO_ENUM[`${letter}${sign}`];
}

// ── herança leve de condições crônicas ──────────────────────────────────────────
function randomConditionsForFounder(rng, age) {
  const n = age > 60 ? randInt(rng, 0, 3) : age > 40 ? randInt(rng, 0, 2) : age > 18 ? randInt(rng, 0, 1) : 0;
  const pool = [...CHRONIC_CONDITION_POOL];
  const result = [];
  for (let i = 0; i < n; i++) {
    const c = pickAndRemove(rng, pool);
    if (c) result.push(c);
  }
  return result;
}

function inheritConditions(rng, age, parentsConditions) {
  const base = randomConditionsForFounder(rng, age);
  const inherited = parentsConditions.filter(() => rng() < 0.25); // 25% de chance de herdar cada condição dos pais
  return Array.from(new Set([...base, ...inherited]));
}

function randomAllergies(rng) {
  const n = rng() < 0.55 ? 0 : randInt(rng, 1, 2);
  const pool = [...ALLERGY_POOL];
  const result = [];
  for (let i = 0; i < n; i++) {
    const a = pickAndRemove(rng, pool);
    if (a) result.push(a);
  }
  return result;
}

// ── pool de gênero ponderado (garante EXATAMENTE 200M / 200F no final) ─────────
function makeGenderPool() {
  let maleCount = TOTAL_USERS / 2;
  let femaleCount = TOTAL_USERS / 2;
  return {
    take(rng, preferred) {
      if (preferred === 'male') { maleCount -= 1; return 'male'; }
      if (preferred === 'female') { femaleCount -= 1; return 'female'; }
      const total = maleCount + femaleCount;
      const r = rng() * total;
      if (r < maleCount) { maleCount -= 1; return 'male'; }
      femaleCount -= 1; return 'female';
    },
    remaining() { return { maleCount, femaleCount }; },
  };
}

// ── construção de uma pessoa ────────────────────────────────────────────────────
function makePerson(rng, { gender, age, firstNameOverride, lastName, alleles, parentsConditions, familyGroup, familyRole, uf, emailFactory, cpfFactory }) {
  const pool = gender === 'male' ? MALE_FIRST : FEMALE_FIRST;
  const firstName = firstNameOverride || choice(rng, pool);
  const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
  const dateOfBirth = birthDateForAge(rng, age);
  const bloodTypeEnum = phenotypeFromAlleles(alleles);
  const chronicConditions = inheritConditions(rng, age, parentsConditions || []);

  return {
    id: uuidFromRng(rng),
    fullName,
    firstName,
    lastName,
    email: emailFactory(firstName, lastName.split(' ')[0]),
    password: SENHA_PADRAO,
    gender,
    dateOfBirth,
    age,
    bloodTypeEnum,
    alleles,
    cpf: cpfFactory(),
    allergies: randomAllergies(rng),
    chronicConditions,
    isDonor: rng() < 0.3,
    familyGroup,
    familyRole,
    uf,
  };
}

// ── construção de uma família (8 pessoas: 2 casais de avós + casal + 2 filhos) ──
function buildFamily(rng, familyIndex, genderPool, emailFactory, cpfFactory) {
  const familyGroup = `Família ${String(familyIndex + 1).padStart(2, '0')}`;
  const surnamePaterno = choice(rng, SURNAMES); // sobrenome que desce pela linha paterna
  const surnameMaterno = choice(rng, SURNAMES); // sobrenome que desce pela linha materna
  const uf = randomUf(rng); // toda a família mora no mesmo estado

  const avoPaterno = makePerson(rng, {
    gender: genderPool.take(rng, 'male'), age: randInt(rng, 70, 85),
    lastName: surnamePaterno, alleles: randomFounderAlleles(rng), parentsConditions: [],
    familyGroup, familyRole: 'Avô Paterno', uf, uf, emailFactory, cpfFactory,
  });
  const avoPaterna = makePerson(rng, {
    gender: genderPool.take(rng, 'female'), age: randInt(rng, 68, 83),
    lastName: surnamePaterno, alleles: randomFounderAlleles(rng), parentsConditions: [],
    familyGroup, familyRole: 'Avó Paterna', uf, emailFactory, cpfFactory,
  });
  const avoMaterno = makePerson(rng, {
    gender: genderPool.take(rng, 'male'), age: randInt(rng, 70, 85),
    lastName: surnameMaterno, alleles: randomFounderAlleles(rng), parentsConditions: [],
    familyGroup, familyRole: 'Avô Materno', uf, emailFactory, cpfFactory,
  });
  const avoMaterna = makePerson(rng, {
    gender: genderPool.take(rng, 'female'), age: randInt(rng, 68, 83),
    lastName: surnameMaterno, alleles: randomFounderAlleles(rng), parentsConditions: [],
    familyGroup, familyRole: 'Avó Materna', uf, emailFactory, cpfFactory,
  });

  const pai = makePerson(rng, {
    gender: genderPool.take(rng, 'male'), age: randInt(rng, 38, 58),
    lastName: surnamePaterno,
    alleles: inheritAlleles(rng, avoPaterno.alleles, avoPaterna.alleles),
    parentsConditions: [...avoPaterno.chronicConditions, ...avoPaterna.chronicConditions],
    familyGroup, familyRole: 'Pai', uf, emailFactory, cpfFactory,
  });
  const mae = makePerson(rng, {
    gender: genderPool.take(rng, 'female'), age: randInt(rng, 36, 55),
    lastName: surnameMaterno,
    alleles: inheritAlleles(rng, avoMaterno.alleles, avoMaterna.alleles),
    parentsConditions: [...avoMaterno.chronicConditions, ...avoMaterna.chronicConditions],
    familyGroup, familyRole: 'Mãe', uf, emailFactory, cpfFactory,
  });

  const filho1Gender = genderPool.take(rng); // flexível — mantém o total 200/200 no fim
  const filho1Age = randInt(rng, 10, 25);
  const filho1 = makePerson(rng, {
    gender: filho1Gender, age: filho1Age,
    lastName: `${surnameMaterno} ${surnamePaterno}`, // convenção BR: sobrenome materno + paterno
    alleles: inheritAlleles(rng, pai.alleles, mae.alleles),
    parentsConditions: [...pai.chronicConditions, ...mae.chronicConditions],
    familyGroup, familyRole: 'Filho 1', uf, emailFactory, cpfFactory,
  });

  const filho2Gender = genderPool.take(rng);
  const filho2Age = Math.max(0, filho1Age - randInt(rng, 2, 8));
  const filho2 = makePerson(rng, {
    gender: filho2Gender, age: filho2Age,
    lastName: `${surnameMaterno} ${surnamePaterno}`,
    alleles: inheritAlleles(rng, pai.alleles, mae.alleles),
    parentsConditions: [...pai.chronicConditions, ...mae.chronicConditions],
    familyGroup, familyRole: 'Filho 2', uf, emailFactory, cpfFactory,
  });

  const members = { avoPaterno, avoPaterna, avoMaterno, avoMaterna, pai, mae, filho1, filho2 };

  // grafo de relações (FamilyMember é "owner-cêntrico": cada pessoa tem sua própria lista)
  // relationship enum: father | mother | sibling | child | grandparent | grandchild | spouse | partner | other
  const relations = [
    // pai
    { ownerId: pai.id, linkedUserId: avoPaterno.id, relationship: 'father' },
    { ownerId: pai.id, linkedUserId: avoPaterna.id, relationship: 'mother' },
    { ownerId: pai.id, linkedUserId: mae.id, relationship: 'spouse' },
    { ownerId: pai.id, linkedUserId: filho1.id, relationship: 'child' },
    { ownerId: pai.id, linkedUserId: filho2.id, relationship: 'child' },
    // mãe
    { ownerId: mae.id, linkedUserId: avoMaterno.id, relationship: 'father' },
    { ownerId: mae.id, linkedUserId: avoMaterna.id, relationship: 'mother' },
    { ownerId: mae.id, linkedUserId: pai.id, relationship: 'spouse' },
    { ownerId: mae.id, linkedUserId: filho1.id, relationship: 'child' },
    { ownerId: mae.id, linkedUserId: filho2.id, relationship: 'child' },
    // avós paternos
    { ownerId: avoPaterno.id, linkedUserId: avoPaterna.id, relationship: 'spouse' },
    { ownerId: avoPaterno.id, linkedUserId: pai.id, relationship: 'child' },
    { ownerId: avoPaterna.id, linkedUserId: avoPaterno.id, relationship: 'spouse' },
    { ownerId: avoPaterna.id, linkedUserId: pai.id, relationship: 'child' },
    // avós maternos
    { ownerId: avoMaterno.id, linkedUserId: avoMaterna.id, relationship: 'spouse' },
    { ownerId: avoMaterno.id, linkedUserId: mae.id, relationship: 'child' },
    { ownerId: avoMaterna.id, linkedUserId: avoMaterno.id, relationship: 'spouse' },
    { ownerId: avoMaterna.id, linkedUserId: mae.id, relationship: 'child' },
    // filho1
    { ownerId: filho1.id, linkedUserId: pai.id, relationship: 'father' },
    { ownerId: filho1.id, linkedUserId: mae.id, relationship: 'mother' },
    { ownerId: filho1.id, linkedUserId: filho2.id, relationship: 'sibling' },
    { ownerId: filho1.id, linkedUserId: avoPaterno.id, relationship: 'grandparent' },
    { ownerId: filho1.id, linkedUserId: avoPaterna.id, relationship: 'grandparent' },
    { ownerId: filho1.id, linkedUserId: avoMaterno.id, relationship: 'grandparent' },
    { ownerId: filho1.id, linkedUserId: avoMaterna.id, relationship: 'grandparent' },
    // filho2
    { ownerId: filho2.id, linkedUserId: pai.id, relationship: 'father' },
    { ownerId: filho2.id, linkedUserId: mae.id, relationship: 'mother' },
    { ownerId: filho2.id, linkedUserId: filho1.id, relationship: 'sibling' },
    { ownerId: filho2.id, linkedUserId: avoPaterno.id, relationship: 'grandparent' },
    { ownerId: filho2.id, linkedUserId: avoPaterna.id, relationship: 'grandparent' },
    { ownerId: filho2.id, linkedUserId: avoMaterno.id, relationship: 'grandparent' },
    { ownerId: filho2.id, linkedUserId: avoMaterna.id, relationship: 'grandparent' },
  ];

  return { familyGroup, members, relations, people: Object.values(members) };
}

// ── dataset completo ─────────────────────────────────────────────────────────────
function generateDataset() {
  const rng = mulberry32(SEED);
  const genderPool = makeGenderPool();
  const emailFactory = makeEmailFactory();
  const cpfFactory = makeCpfFactory();

  const families = [];
  for (let i = 0; i < TOTAL_FAMILIES; i++) {
    families.push(buildFamily(rng, i, genderPool, emailFactory, cpfFactory));
  }

  const familyPeople = families.flatMap((f) => f.people);
  const relations = families.flatMap((f) => f.relations);

  const standaloneCount = TOTAL_USERS - familyPeople.length; // 400 - 120 = 280
  const standalone = [];
  for (let i = 0; i < standaloneCount; i++) {
    const gender = genderPool.take(rng);
    const age = randInt(rng, 0, 85);
    const lastName = `${choice(rng, SURNAMES)} ${choice(rng, SURNAMES)}`;
    const uf = randomUf(rng);
    standalone.push(makePerson(rng, {
      gender, age, lastName,
      alleles: randomFounderAlleles(rng),
      parentsConditions: [],
      familyGroup: 'Avulso', familyRole: '-',
      uf, emailFactory, cpfFactory,
    }));
  }

  const allPeople = [...familyPeople, ...standalone];
  const { maleCount, femaleCount } = genderPool.remaining();

  return {
    people: allPeople,
    families,
    relations,
    stats: {
      total: allPeople.length,
      male: allPeople.filter((p) => p.gender === 'male').length,
      female: allPeople.filter((p) => p.gender === 'female').length,
      familyMembers: familyPeople.length,
      standalone: standalone.length,
      poolLeftover: { maleCount, femaleCount },
    },
  };
}

module.exports = {
  generateDataset,
  SENHA_PADRAO,
  EMAIL_DOMAIN,
  TOTAL_USERS,
  TOTAL_FAMILIES,
  MEMBERS_PER_FAMILY,
};
