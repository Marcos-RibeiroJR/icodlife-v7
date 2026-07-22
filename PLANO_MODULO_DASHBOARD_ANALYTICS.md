# Plano — Sprint 20: Dashboard Analytics (Médico)

> ICODLIFE / Sou Doutor · Documento de planejamento técnico
> Item de backlog que **nunca teve nem planejamento** (diferente de Pagamentos e gov.br/RNDS, que já tinham plano escrito sem código). Criado e implementado nesta sessão.

---

## 1. Objetivo

Dar ao médico (`apps/doutor`) uma visão analítica — não só operacional — do próprio consultório: volume de consultas, receita, perfil dos pacientes e principais tipos de atendimento, com tendência ao longo do tempo. Hoje o `apps/doutor/dashboard` só mostra perfil + lista de pacientes recentes (sem métricas, sem gráfico, sem série temporal).

## 2. Decisão de escopo

Em vez de criar vários endpoints picotados, segue o mesmo padrão já usado em `TrendReportService` (módulo Exames/Vida): **um único endpoint agregado** (`GET /doutor/analytics/dashboard`) que devolve tudo que a tela precisa em uma chamada. Motivo: menos loading states na tela, menos idas ao banco, mais fácil de cachear depois.

Não requer nenhuma tabela nova — 100% derivado de dados que já existem (`DoctorAppointment`, `DoctorCashEntry`, `PatientDoctor`, `User`). Não requer migration.

## 3. Métricas incluídas

| Bloco | Conteúdo |
|---|---|
| **KPIs do período** | total de pacientes, pacientes novos no período, total de consultas, consultas concluídas/canceladas/no-show, taxa de no-show, receita total, ticket médio, variação de receita vs. período anterior de mesmo tamanho |
| **Tendência de consultas** | série mensal (últimos N meses): total / concluídas / canceladas |
| **Tendência de receita** | série mensal: receita (income) / despesa (expense) — reaproveita `DoctorCashEntry` |
| **Perfil dos pacientes** | distribuição por especialidade atendida (`PatientDoctor.specialty`), por gênero e por faixa etária (calculada a partir de `User.dateOfBirth`) |
| **Top tipos de atendimento** | `DoctorAppointment.type` mais frequentes no período, com contagem e receita associada |

## 4. Arquitetura

Novo módulo `apps/api/src/modules/doctor-analytics/`:
- `doctor-analytics.service.ts` — toda a agregação (queries Prisma + `groupBy`/reduce em memória, sem tabela nova)
- `doctor-analytics.controller.ts` — `@Controller('doutor/analytics')`, `@Roles('doctor')`, um único `GET /dashboard?months=6`
- `doctor-analytics.module.ts`

Frontend: nova página `apps/doutor/src/app/analytics/page.tsx`, com link a partir do dashboard existente. Usa `recharts` (biblioteca já padrão no ecossistema React/Next deste projeto para gráficos) para os dois gráficos de série temporal (consultas e receita) — primeira vez que `recharts` é usado em `apps/doutor` especificamente, por isso adicionado como dependência nova nesse app.

## 5. Fora de escopo (por ora)

- Comparação entre médicos / benchmarking (exigiria dados agregados de outros médicos, tema sensível de privacidade).
- Exportação do dashboard em PDF — pode reaproveisar o padrão de `aso-pdf.service.ts` numa sprint futura, se pedido.
- Métricas por convênio de saúde (health plan) — os dados de convênio existem em `Doctor.healthPlans` mas não há campo de convênio por consulta individual hoje; ficaria com dado incompleto.

## 6. Status

✅ Planejado e implementado nesta sessão (ver commit correspondente). Testado apenas via checagem sintática — mesma limitação de sandbox das sprints anteriores (Prisma engine Linux bloqueado por allowlist de rede, impede rodar a API de fato aqui).
