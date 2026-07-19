# Plano — Sprint 18: Pagamentos (Pagar.me)

> ICODLIFE / Sou Doutor · Documento de planejamento técnico
> Detalha o item de backlog **"Sprint 18 — Pagamentos (Stripe/Pagar.me, assinaturas)"**, seguindo o mesmo padrão de `PLANO_MODULO_CLINICAS_HOSPITAIS.md` e `PLANO_MODULO_GOVBR_RNDS.md`.
> Gateway escolhido: **Pagar.me API v5** (decisão do usuário — PIX/boleto nativos + split de marketplace pronto para o mercado brasileiro).

---

## 1. Resumo executivo — TRÊS frentes de monetização, confirmadas com o usuário

| Frente | Quem paga | Quem recebe | Tipo de cobrança |
|---|---|---|---|
| **A. SaaS Médico/Clínica** | Médico (`apps/doutor`) ou Clínica (`apps/clinica`) | ICODLIFE | Assinatura recorrente (mensal), sem split |
| **B. Pagamento de consulta** | Paciente | Médico/Clínica, com comissão pra ICODLIFE | Cobrança avulsa (cartão/PIX/boleto) **com split** |
| **C. Premium do paciente** | Paciente (`apps/web`) | ICODLIFE | Assinatura recorrente (mensal/anual), sem split |

Nenhuma das três existe hoje — confirmado por busca no código: não há `stripe`, `pagarme`, `subscription`, `billing`, `checkout` ou `webhook` de pagamento em nenhum lugar do monorepo. Os campos `DoctorAppointment.price`/`paymentStatus` e `DoctorCashEntry.paymentMethod` são só controle manual de caixa (texto livre), sem gateway — continuam existindo e passam a ser **preenchidos automaticamente** quando o pagamento é feito via Pagar.me, em vez de anotados manualmente.

---

## 2. Como funciona o Pagar.me v5 (referência)

- **Orders/Charges**: uma `order` agrupa um ou mais `items` (o que está sendo cobrado) e gera `charges` (cartão de crédito, PIX ou boleto). PIX e boleto não precisam de tokenização de cartão.
- **Customers/Cards**: cliente (paciente/médico) cadastrado uma vez; cartão tokenizado do lado do Pagar.me — **o ICODLIFE nunca armazena número de cartão** (PCI compliance).
- **Plans + Subscriptions** (Frentes A e C): `plan` define `interval`/`interval_count` (ex.: `month`+`1` = mensal) e preço; `subscription` vincula um `customer` a um `plan`, com `payment_method` (`credit_card` ou `boleto`), `billing_type` (`prepaid`/`postpaid`/`exact_day`) e `status` (`active`/`canceled`/`future`). O Pagar.me cuida da recorrência — não precisa de cron próprio pra cobrar todo mês.
- **Recipients + Split** (Frente B): cada médico/clínica que vai **receber** dinheiro precisa virar um `recipient` no Pagar.me (KYC: CPF/CNPJ, dados bancários — processo de cadastro pelo próprio médico/clínica, com aprovação do Pagar.me). Na hora de criar a `order` da consulta, define-se uma `split rule`: X% pro `recipient` do médico, Y% (a comissão) pra conta principal do ICODLIFE. O Pagar.me gera os recebíveis já divididos — não tem transferência manual.
- **Webhooks**: eventos (`order.paid`, `order.payment_failed`, `subscription.created`, `charge.chargedback`, etc.) chegam via POST assíncrono — é o mecanismo de verdade de sincronização de status (nunca confiar só na resposta síncrona da chamada de criação).

Documentação oficial consultada: [Assinaturas](https://docs.pagar.me/reference/assinaturas-1), [Visão Geral do Marketplace](https://docs.pagar.me/reference/vis%C3%A3o-geral-do-marketplace), [Recebedores](https://docs.pagar.me/reference/recebedores-1), [Split](https://docs.pagar.me/reference/split-1).

---

## 3. Schema (Prisma) — novo

```prisma
enum PlanAudience { doctor clinic patient }
enum SubscriptionStatus { active canceled future past_due }

model Plan {
  id              String       @id @default(uuid())
  code            String       @unique                  // "doctor_pro", "clinic_starter", "patient_premium"
  audience        PlanAudience
  name            String
  priceCents      Int          @map("price_cents")       // sempre em centavos (padrão Pagar.me)
  interval        String       @default("month")         // day|week|month|year
  intervalCount   Int          @default(1) @map("interval_count")
  features        Json         @default("[]")            // lista de features liberadas (checagem no front/guard)
  pagarmePlanId   String?      @map("pagarme_plan_id")    // "plan_XXXX" — criado 1x via API/admin
  isActive        Boolean      @default(true) @map("is_active")
  createdAt       DateTime     @default(now()) @map("created_at")
  subscriptions   Subscription[]
  @@map("plans")
}

model Subscription {
  id                   String             @id @default(uuid())
  planId               String             @map("plan_id")
  plan                 Plan               @relation(fields: [planId], references: [id])
  userId               String?            @map("user_id")        // paciente ou médico (User)
  user                 User?              @relation(fields: [userId], references: [id])
  clinicId             String?            @map("clinic_id")      // se for assinatura da Clínica
  clinic               Clinic?            @relation(fields: [clinicId], references: [id])
  pagarmeSubscriptionId String            @unique @map("pagarme_subscription_id")
  pagarmeCustomerId    String             @map("pagarme_customer_id")
  status               SubscriptionStatus @default(future)
  paymentMethod        String             @map("payment_method")  // credit_card | boleto
  currentCycleStart    DateTime?          @map("current_cycle_start")
  currentCycleEnd      DateTime?          @map("current_cycle_end")
  nextBillingAt        DateTime?          @map("next_billing_at")
  canceledAt           DateTime?          @map("canceled_at")
  createdAt            DateTime           @default(now()) @map("created_at")
  updatedAt             DateTime          @updatedAt @map("updated_at")
  @@index([userId])
  @@index([clinicId])
  @@map("subscriptions")
}

// KYC de quem RECEBE split (médico solo ou clínica) — obrigatório antes de qualquer pagamento de consulta ser dividido
model PaymentRecipient {
  id                String    @id @default(uuid())
  doctorId          String?   @unique @map("doctor_id")
  doctor            Doctor?   @relation(fields: [doctorId], references: [id])
  clinicId          String?   @unique @map("clinic_id")
  clinic            Clinic?   @relation(fields: [clinicId], references: [id])
  pagarmeRecipientId String   @unique @map("pagarme_recipient_id")
  kycStatus         String    @default("pending") @map("kyc_status")   // pending|approved|rejected
  bankAccountLast4  String?   @map("bank_account_last4")               // só os últimos 4 dígitos, nunca dado bancário completo
  defaultSplitPct   Decimal   @default(85.0) @map("default_split_pct") // % que fica com o recebedor; resto é comissão ICODLIFE
  createdAt         DateTime  @default(now()) @map("created_at")
  @@map("payment_recipients")
}

// cobrança avulsa (Frente B — pagamento de consulta) — 1 linha por order do Pagar.me
model PaymentCharge {
  id              String    @id @default(uuid())
  appointmentId   String?   @unique @map("appointment_id")
  appointment     DoctorAppointment? @relation(fields: [appointmentId], references: [id])
  payerUserId     String    @map("payer_user_id")     // paciente que pagou
  payerUser       User      @relation(fields: [payerUserId], references: [id])
  recipientId     String?   @map("recipient_id")
  recipient       PaymentRecipient? @relation(fields: [recipientId], references: [id])
  pagarmeOrderId  String    @unique @map("pagarme_order_id")
  amountCents     Int       @map("amount_cents")
  splitRecipientCents Int   @map("split_recipient_cents")
  splitPlatformCents  Int   @map("split_platform_cents")
  paymentMethod   String    @map("payment_method")     // credit_card | pix | boleto
  status          String    @default("pending")        // pending|paid|failed|refunded|chargedback
  paidAt          DateTime? @map("paid_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  @@index([payerUserId])
  @@map("payment_charges")
}

// log bruto de todo webhook recebido — auditoria + reprocessamento em caso de falha
model PaymentWebhookLog {
  id          String   @id @default(uuid())
  eventType   String   @map("event_type")
  pagarmeId   String?  @map("pagarme_id")
  payload     Json
  processedAt DateTime? @map("processed_at")
  error       String?
  receivedAt  DateTime @default(now()) @map("received_at")
  @@map("payment_webhook_log")
}
```

Alterações incrementais (não-destrutivas):
```prisma
model User   { subscriptions Subscription[]  paymentCharges PaymentCharge[] }
model Clinic { subscriptions Subscription[] }
model Doctor { paymentRecipient PaymentRecipient? }
model DoctorAppointment { paymentCharge PaymentCharge? }
```
`DoctorAppointment.paymentStatus` passa a ser preenchido automaticamente (`"paid"`) via webhook, em vez de editado manualmente — o controle manual de caixa (`DoctorCashEntry`) continua existindo em paralelo pra quem recebe fora do app (dinheiro/convênio direto).

---

## 4. Arquitetura backend

```
apps/api/src/modules/payments/
  payments.module.ts
  pagarme-client.service.ts     # wrapper HTTP da API v5 (Basic Auth com secret key), timeout curto, erros tipados
  plans.service.ts              # CRUD de Plan (admin) + sync com pagar.me (cria plan_XXXX 1x)
  subscriptions.service.ts      # assina/cancela/consulta assinatura (Frentes A e C)
  recipients.service.ts         # onboarding de recebedor (Frente B) — cadastra Doctor/Clinic como recipient
  charges.service.ts            # cria order com split pra pagamento de consulta (Frente B)
  webhook.controller.ts         # POST /payments/webhook — valida assinatura do Pagar.me, grava PaymentWebhookLog, atualiza Subscription/PaymentCharge
  dto/
```
- **Segredo de API** via env: `PAGARME_SECRET_KEY`, `PAGARME_PUBLIC_KEY`, `PAGARME_WEBHOOK_SECRET` (ambiente sandbox primeiro — Pagar.me tem sandbox próprio, não precisa de conta real pra desenvolver).
- **Padrão de resiliência**: igual ao `company.service.ts` (BrasilAPI) — timeout, erro tipado por status HTTP, nunca deixa o fluxo principal (agenda, cadastro) travado se o Pagar.me estiver fora do ar.
- **Guard de feature por plano**: `SubscriptionGuard` (novo, mesmo padrão do `RolesGuard` existente) — bloqueia endpoints/telas conforme `features` do `Plan` ativo do usuário/clínica (ex.: nº de médicos vinculados na clínica, exportação de PDF, telemedicina).

---

## 5. Endpoints (REST) — módulo `payments`

| Método | Rota | Frente | Descrição |
|---|---|---|---|
| GET | `/payments/plans?audience=doctor\|clinic\|patient` | A/C | Lista planos disponíveis |
| POST | `/payments/subscriptions` | A/C | Cria assinatura (customer + subscription no Pagar.me) |
| GET | `/payments/subscriptions/me` | A/C | Assinatura ativa do usuário/clínica logado |
| POST | `/payments/subscriptions/:id/cancel` | A/C | Cancela assinatura |
| POST | `/payments/recipients/onboard` | B | Médico/Clínica inicia cadastro de recebedor (KYC) |
| GET | `/payments/recipients/me` | B | Status do KYC do recebedor |
| POST | `/payments/charges` | B | Cria cobrança de consulta com split (`appointmentId`, método de pagamento) |
| GET | `/payments/charges/:id` | B | Status de uma cobrança |
| POST | `/payments/webhook` | Todas | Recebe eventos assíncronos do Pagar.me (rota pública, validada por assinatura HMAC do header) |

---

## 6. Fluxos principais

1. **SaaS médico/clínica (Frente A)**: tela de "Planos" em `apps/doutor`/`apps/clinica` → escolhe plano → formulário de cartão (tokenizado via Pagar.me.js no front, nunca passa pelo backend ICODLIFE em texto puro) ou opção boleto → `POST /payments/subscriptions` → status `future`/`active` conforme confirmação → `SubscriptionGuard` libera features do plano.
2. **Premium paciente (Frente C)**: mesma mecânica, em `apps/web`, planos com `audience: patient`.
3. **Onboarding de recebedor (pré-requisito da Frente B)**: médico/clínica preenche dados bancários + documentos → `recipients.service` cria o `recipient` no Pagar.me → KYC assíncrono (pode levar dias, fora do controle do ICODLIFE) → `PaymentRecipient.kycStatus` atualizado via webhook/consulta periódica.
4. **Pagamento de consulta (Frente B)**: paciente agenda consulta (`DoctorAppointment` já existe) → tela de pagamento mostra `procedure.defaultPrice` ou `doctor.consultPrice` → paciente escolhe cartão/PIX/boleto → `POST /payments/charges` cria `order` com `split_rule` (ex.: 85% recebedor / 15% ICODLIFE, configurável por `PaymentRecipient.defaultSplitPct`) → webhook `order.paid` marca `PaymentCharge.status = paid` e `DoctorAppointment.paymentStatus = 'paid'`.
5. **Webhook**: toda notificação grava primeiro em `PaymentWebhookLog` (auditoria/replay), depois processa — se o processamento falhar, fica registrado com `error` pra reprocessamento manual, sem perder o evento.

---

## 7. Frontend

- `apps/doutor/src/app/planos/` e `apps/clinica/src/app/planos/` — escolha/gestão de assinatura SaaS (Frente A), reaproveitando o padrão visual de `financeiro/`.
- `apps/doutor/src/app/planos/recebedor/` (ou dentro de `configuracoes/`) — onboarding de recebedor (Frente B), formulário de dados bancários.
- `apps/web/src/app/premium/` — tela de assinatura premium (Frente C).
- Componente de checkout de consulta em `apps/web` (na tela de agendamento/detalhe do agendamento) — usa o **Pagar.me.js** (SDK client-side oficial) pra tokenizar cartão direto no navegador do paciente; PIX mostra QR code retornado pela API; boleto mostra linha digitável/link do PDF.
- Biblioteca `@pagarme/js` ou chamadas diretas à `checkout.pagar.me`/tokenização client-side — **nunca** enviar número de cartão pro backend ICODLIFE.

---

## 8. Pré-requisitos administrativos (fora do código)

1. **Conta Pagar.me da empresa** (CNPJ do ICODLIFE) — cadastro + KYC da própria plataforma, necessário antes de qualquer chave de API real (sandbox não precisa disso, produção precisa).
2. **Cada médico/clínica que for RECEBER split** precisa completar o próprio KYC de recebedor (CPF/CNPJ + conta bancária) — processo deles, não do ICODLIFE, mas a tela de onboarding (Seção 6, item 3) é o que dispara.
3. **Definição de taxas**: % de comissão ICODLIFE por consulta (Frente B) e preços dos planos (Frentes A/C) — decisão de negócio a definir antes de codar os valores default.
4. **Ambiente sandbox do Pagar.me** — pode ser criado sem burocracia, ideal pra desenvolver toda a Seção 3/4 antes mesmo da conta de produção sair.

---

## 9. Compliance

- **PCI-DSS**: nunca armazenar PAN (número de cartão) — sempre tokenização client-side via SDK do Pagar.me. `PaymentRecipient.bankAccountLast4` só guarda os últimos 4 dígitos, resto fica só no Pagar.me.
- **LGPD**: dados bancários/documentos de KYC do recebedor ficam custodiados pelo Pagar.me, não replicados no banco do ICODLIFE além do necessário (`pagarmeRecipientId`, status).
- **Idempotência**: toda chamada de criação (`subscriptions`, `charges`) usa `idempotency key` própria (ex.: `appointmentId` como chave) pra evitar cobrança duplicada em caso de retry de rede.

---

## 10. Roadmap por sub-sprints

| Sub-sprint | Entrega |
|---|---|
| **18.1** | Conta sandbox Pagar.me + schema (`Plan`, `Subscription`, `PaymentRecipient`, `PaymentCharge`, `PaymentWebhookLog`) + migration |
| **18.2** | `pagarme-client.service` + `webhook.controller` (validação de assinatura + log) — testável 100% em sandbox |
| **18.3** | Frente A: `plans.service` + `subscriptions.service` + telas `apps/doutor/planos` e `apps/clinica/planos` |
| **18.4** | Frente C: planos `audience: patient` + tela `apps/web/premium` + `SubscriptionGuard` |
| **18.5** | Frente B, parte 1: `recipients.service` + onboarding de recebedor (médico/clínica) |
| **18.6** | Frente B, parte 2: `charges.service` (order + split) + checkout de consulta em `apps/web` (cartão/PIX/boleto) |
| **18.7 (hardening)** | Testes de webhook com retry/replay, reconciliação (comparar `PaymentCharge`/`Subscription` locais com o que o Pagar.me realmente tem), definição final de taxas/comissões, migração pra produção |

---

## 11. Status de Execução

### ⏳ Pendente — nada implementado ainda
Próxima ação sugerida: **18.1** — criar o schema Prisma (não depende de nenhuma credencial) e abrir a conta sandbox do Pagar.me (gratuita, sem burocracia) em paralelo.

---

## Fontes consultadas
- [Assinaturas — Pagar.me API v5](https://docs.pagar.me/reference/assinaturas-1)
- [Visão Geral do Marketplace — Pagar.me](https://docs.pagar.me/reference/vis%C3%A3o-geral-do-marketplace)
- [Recebedores — Pagar.me](https://docs.pagar.me/reference/recebedores-1)
- [Split — Pagar.me](https://docs.pagar.me/reference/split-1)
- [Como funciona o split de pagamentos — Central de Ajuda Stone/Pagar.me](https://pagarme.helpjuice.com/pt_BR/p1-funcionalidades/marketplace-como-funciona-o-split-de-pagamentos)
