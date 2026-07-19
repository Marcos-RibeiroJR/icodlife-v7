# IcodLife / Sou Doutor — Pitch Deck Investidores V2 (conteúdo base)

> Rascunho de conteúdo, slide a slide, pronto para virar .pptx com a skill `pptx` assim que o sandbox voltar.
> Observação: o arquivo original enviado pelo usuário (`IcodLife_Pitch_Deck_Investidores.pptx`) não está salvo neste repositório e não foi possível extraí-lo (sandbox indisponível). Este V2 foi reconstruído do zero a partir dos planos técnicos e números de negócio já validados com o usuário. Onde não há dado confirmado, está marcado **[completar]** — não inventar números aqui.

---

## Slide 1 — Capa
**IcodLife / Sou Doutor**
Saúde Pessoal Inteligente — conectando paciente, médico e clínica em uma única plataforma.
Rodada Seed · [mês/ano da rodada — completar]

## Slide 2 — O problema
- Prontuário e histórico de saúde fragmentados entre paciente, médico e clínica — cada um com sua própria versão incompleta dos dados.
- Médico solo e clínica pequena/média não têm ferramenta unificada de agenda, prontuário, financeiro e ASO — usam planilha, papel ou sistemas antigos e caros.
- Paciente não tem visão longitudinal da própria saúde (exames, medicação, hábitos, família) em um só lugar.
- Dado de saúde estruturado no Brasil é escasso e disperso — dificulta prevenção, pesquisa e políticas públicas de saúde.

## Slide 3 — A solução
Uma plataforma única com três portais integrados por um mesmo núcleo de dados:
- **Paciente** (`apps/web` + mobile) — prontuário pessoal, família, exames, medicação, estilo de vida, telemedicina.
- **Médico** (`apps/doutor`) — agenda, prontuário, prescrição, financeiro, ASO, carteira de empresas.
- **Clínica/Hospital** (`apps/clinica`) — multi-tenant: agrega vários médicos, financeiro consolidado, agenda multiprofissional.
Login centralizado com um único hub de autenticação para os três públicos.

## Slide 4 — Como funciona (produto)
- Arquitetura multi-tenant não destrutiva: médico solo continua operando normalmente; ao entrar numa clínica, os mesmos registros passam a ser compartilhados (`clinicId`).
- Módulos já entregues: Família, Ciclo Menstrual, AI HealthBot, Medicamentos, Agendamentos, Oftalmologia, Catálogo de Procedimentos, Pressão Arterial, Saúde Ocupacional, Saúde Mental, ASO, Empresas, Resultados de Exames (com linha do tempo e referências SBPC/ML), Estilo de Vida (score de saúde 0–100), Prontuário, Cirurgias, Vacinas, Métricas Corporais, Chat, Glicemia, Exportação de dados, Telemedicina.
- Motor de saúde com IA sobre texto livre e big data populacional anonimizado em desenvolvimento (Fase 4).

## Slide 5 — Diferenciais competitivos
- Único no mercado brasileiro a unir paciente + médico + clínica num mesmo grafo de dados relacional (paciente ↔ família ↔ médico ↔ clínica ↔ empresa ↔ exame).
- Dado estruturado e padronizado (referências laboratoriais SBPC/ML, CNES, IBGE) — base para IA e para o motor de risco populacional.
- Roadmap de integração institucional com gov.br (Login Único) e RNDS/DATASUS (interoperabilidade FHIR com o SUS).
- Modelo de receita com três frentes independentes e complementares (ver Slide 7), reduzindo dependência de um único fluxo de caixa.

## Slide 6 — Mercado
- [completar: tamanho do mercado de saúde digital no Brasil — TAM/SAM/SOM. Não estimar aqui sem fonte.]
- [completar: número de médicos/clínicas endereçáveis no Brasil, fonte CFM/IBGE.]
- Contexto qualitativo: mercado brasileiro de prontuário eletrônico e gestão de clínicas ainda fragmentado entre players legados e poucos SaaS modernos; tendência regulatória (RNDS/gov.br) empurra digitalização.

## Slide 7 — Modelo de negócio (3 frentes de receita)
| Frente | Quem paga | Cobrança |
|---|---|---|
| A. SaaS Médico | Médico solo | R$ 99,00/mês |
| A. SaaS Clínica | Clínica/Hospital | R$ 388,00/mês |
| B. Marketplace de consultas | Paciente, com split pro médico/clínica | Comissão de 10% por consulta paga na plataforma |
| C. Premium do paciente | Paciente | R$ 19,90/mês |
Gateway: Pagar.me v5 (PIX, boleto, cartão, split de marketplace nativo para o mercado brasileiro).

## Slide 8 — Tração e roadmap entregue
- Módulo Clínicas/Hospitais (Sprint 21): validado ponta a ponta, multi-tenant funcionando.
- Login centralizado (paciente/médico/clínica) com um único hub de autenticação.
- Planos técnicos completos e prontos para execução: Pagamentos (Sprint 18), gov.br/RNDS (Sprint 22).
- [completar: nº de usuários ativos, médicos/clínicas cadastrados, se houver.]

## Slide 9 — Tecnologia
- Monorepo pnpm: NestJS (API), Next.js 14 (três portais web), Expo/React Native (mobile).
- PostgreSQL + Prisma, Redis, arquitetura multi-tenant por `clinicId` opcional sem duplicar lógica de negócio.
- Segurança: tokenização de cartão via gateway (nunca armazena PAN), LGPD por design (dado bancário/KYC custodiado pelo gateway, auditoria de webhooks).

## Slide 10 — Uso dos recursos (captação de R$ 500.000)
| Uso | % | Valor |
|---|---|---|
| Produto & Desenvolvimento | 45% | R$ 315.000 |
| Marketing & Aquisição | 18% | R$ 126.000 |
| Operações & Equipe | 15% | R$ 105.000 |
| Legal, DPO & LGPD | 12% | R$ 84.000 |
| Infraestrutura Cloud | 10% | R$ 70.000 |

## Slide 11 — Time
[completar: fundadores, sócios, papéis — não há dado coletado ainda nesta jornada.]

## Slide 12 — O pedido (ask)
- Captação: R$ 500.000 (Seed).
- [completar: % de equity oferecido, valuation, instrumento (mútuo conversível/SAFE/equity direto).]

## Slide 13 — Contato
IcodLife / Sou Doutor
[completar: e-mail, site, telefone de contato para investidores]
