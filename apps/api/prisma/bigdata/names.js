// apps/api/prisma/bigdata/names.js
// Pools de nomes brasileiros usados pelo gerador de massa de dados (seed-bigdata).
// Arquivo sem dependências externas — roda em qualquer Node.js puro.

const MALE_FIRST = [
  'João', 'José', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos',
  'Gabriel', 'Rafael', 'Daniel', 'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Rodrigo', 'Fernando', 'Diego',
  'Leonardo', 'André', 'Gustavo', 'Ricardo', 'Alexandre', 'Thiago', 'Vinicius', 'Caio', 'Igor', 'Mateus',
  'Rogério', 'Sérgio', 'Roberto', 'Fábio', 'Renato', 'Cláudio', 'Márcio', 'Wagner', 'Adriano', 'Anderson',
  'Otávio', 'Henrique', 'Vitor', 'Samuel', 'Davi', 'Enzo', 'Miguel', 'Arthur', 'Bernardo', 'Heitor',
  'Nicolas', 'Guilherme', 'Murilo', 'Emanuel', 'Benjamin', 'Théo', 'Vicente', 'Anthony', 'Elias', 'Raul',
];

const FEMALE_FIRST = [
  'Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana', 'Juliana', 'Márcia', 'Fernanda', 'Patrícia', 'Aline',
  'Sandra', 'Camila', 'Amanda', 'Bruna', 'Jéssica', 'Leticia', 'Julia', 'Luciana', 'Vanessa', 'Mariana',
  'Gabriela', 'Larissa', 'Beatriz', 'Renata', 'Priscila', 'Débora', 'Simone', 'Cristina', 'Rosana', 'Tatiane',
  'Carla', 'Daniela', 'Viviane', 'Elaine', 'Regina', 'Sônia', 'Rosa', 'Terezinha', 'Silvia', 'Monica',
  'Isabela', 'Laura', 'Sophia', 'Helena', 'Valentina', 'Alice', 'Manuela', 'Heloísa', 'Cecília', 'Lívia',
  'Yasmin', 'Isadora', 'Lara', 'Melissa', 'Clara', 'Rebeca', 'Eloá', 'Maitê', 'Agatha', 'Antonella',
];

const SURNAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Rodrigues', 'Ferreira', 'Alves', 'Costa', 'Gomes',
  'Martins', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro', 'Carvalho', 'Lima', 'Nascimento', 'Cardoso', 'Correia',
  'Teixeira', 'Moreira', 'Cavalcanti', 'Dias', 'Castro', 'Campos', 'Cunha', 'Pinto', 'Reis', 'Monteiro',
  'Freitas', 'Vieira', 'Nunes', 'Rocha', 'Andrade', 'Machado', 'Ramos', 'Batista', 'Azevedo', 'Farias',
  'Moraes', 'Fernandes', 'Almeida', 'Lopes', 'Marques', 'Pires', 'Guimarães', 'Xavier', 'Peixoto', 'Sales',
];

const ALLERGY_POOL = [
  'Penicilina', 'Dipirona', 'Látex', 'Frutos do mar', 'Poeira', 'Pólen', 'Amendoim', 'Lactose',
  'Ácido acetilsalicílico', 'Sulfa', 'Camarão', 'Corantes alimentares',
];

const CHRONIC_CONDITION_POOL = [
  'Hipertensão', 'Diabetes tipo 2', 'Asma', 'Enxaqueca', 'Colesterol alto',
  'Obesidade', 'Depressão', 'Ansiedade', 'Rinite alérgica', 'Hipotireoidismo',
];

module.exports = { MALE_FIRST, FEMALE_FIRST, SURNAMES, ALLERGY_POOL, CHRONIC_CONDITION_POOL };
