# IcodLife / Sou Doutor — Apresentação Comercial (conteúdo base)

> Público-alvo: médicos, clínicas/hospitais e empresas (RH/medicina do trabalho). Foco em vender o uso da plataforma, não captação de investimento.
> Rascunho de conteúdo, slide a slide, pronto para virar .pptx com a skill `pptx` assim que o sandbox voltar.

---

## Slide 1 — Capa
**IcodLife / Sou Doutor**
A plataforma completa de gestão médica e saúde do paciente — para médicos, clínicas e empresas.

## Slide 2 — O problema que resolvemos
- Médico solo gerencia agenda, prontuário, prescrição e financeiro em ferramentas soltas (papel, planilha, WhatsApp).
- Clínica com vários médicos não tem visão consolidada: cada médico com sua agenda, sem financeiro único nem carteira de empresas compartilhada.
- Empresas contratantes de exames ocupacionais (ASO) não têm rastreabilidade digital do processo.
- Paciente não enxerga seu histórico de saúde de forma unificada.

## Slide 3 — A plataforma
Três portais, um mesmo núcleo de dados:
- **Portal do Médico** — agenda, prontuário eletrônico, prescrição, exames, financeiro, carteira de empresas e ASOs.
- **Portal da Clínica/Hospital** — multi-tenant: vários médicos, agenda multiprofissional, financeiro consolidado, equipe (recepção/financeiro/enfermagem).
- **Portal do Paciente** (web + mobile) — prontuário pessoal, família, exames, medicação, telemedicina.
Login único para os três perfis, cada um cai no seu painel correto.

## Slide 4 — Para o Médico
- Agenda com horários de atendimento configuráveis.
- Prontuário eletrônico, prescrição digital, pedidos de exame.
- Financeiro: caixa, DRE, controle de recebimentos (inclusive fora do app, quando aplicável).
- Carteira de empresas e emissão de ASO (Atestado de Saúde Ocupacional).
- Módulos clínicos especializados: Oftalmologia, Saúde Ocupacional, Saúde Mental, Cirurgias, Vacinas, Métricas Corporais, Glicemia, Pressão Arterial.
- Telemedicina integrada.

## Slide 5 — Para a Clínica/Hospital
- Um cadastro de clínica agrega N médicos (sócios, associados, visitantes).
- Agenda e financeiro consolidados — visão da clínica inteira, sem perder o controle individual de cada médico.
- Equipe administrativa própria (recepção, financeiro, enfermagem) sem precisar de um médico "dono" de cada função.
- Catálogo de procedimentos e salas compartilhado entre os profissionais.
- Carteira de empresas e ASOs centralizados, com visão de todos os médicos da clínica.

## Slide 6 — Para Empresas (RH / Medicina do Trabalho)
- Gestão de ASOs digitais, vinculados a médico ou clínica credenciada.
- Rastreabilidade do processo de exame ocupacional.
- Base para atender exigências de PGR/PCMSO e, no roadmap, integração com eSocial (S-2220/2210/2240).

## Slide 7 — Para o Paciente
- Prontuário pessoal com histórico de exames (linha do tempo, referências laboratoriais SBPC/ML, alertas de valores fora da faixa).
- Gestão de família (dependentes, histórico compartilhado).
- Módulo de estilo de vida com score de saúde 0–100 (IMC, hábitos, sono, saúde emocional, alimentação).
- Medicação, ciclo menstrual, vacinas, cirurgias, glicemia, pressão arterial.
- Assistente de saúde com IA (HealthBot) e telemedicina.
- App mobile (Expo/React Native).

## Slide 8 — Segurança e conformidade
- Dados bancários e de pagamento nunca ficam armazenados na ICODLIFE — tokenização via gateway (Pagar.me), conformidade PCI-DSS.
- LGPD por design: dado sensível de saúde tratado com auditoria e controle de acesso por papel (paciente/médico/clínica).
- Roadmap institucional: Login Único gov.br e interoperabilidade com a RNDS (Rede Nacional de Dados em Saúde/DATASUS).

## Slide 9 — Planos
| Plano | Público | Valor |
|---|---|---|
| SaaS Médico | Médico solo | R$ 99,00/mês |
| SaaS Clínica | Clínica/Hospital | R$ 388,00/mês |
| Premium Paciente | Paciente | R$ 19,90/mês |
Pagamento de consultas dentro da plataforma via PIX, boleto ou cartão, com repasse automático ao médico/clínica.

## Slide 10 — Por que escolher a IcodLife
- Plataforma única cobrindo os três públicos, sem necessidade de integrar sistemas separados.
- Dado estruturado e auditável, pronto para exigências regulatórias crescentes (RNDS, eSocial).
- Evolução contínua: novo módulo entregue e validado a cada sprint.

## Slide 11 — Contato / Próximos passos
[completar: e-mail comercial, site, telefone, forma de agendar demonstração]
