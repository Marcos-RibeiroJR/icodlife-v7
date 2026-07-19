# IcodLife / Sou Doutor — Modelo de Negócio (conteúdo base)

> Deck separado, focado nas 3 frentes de receita (base: `PLANO_MODULO_PAGAMENTOS.md`, gateway Pagar.me v5).
> Rascunho de conteúdo, slide a slide, pronto para virar .pptx com a skill `pptx` assim que o sandbox voltar.

---

## Slide 1 — Capa
**Modelo de Negócio**
IcodLife / Sou Doutor

## Slide 2 — Visão geral: 3 frentes de monetização
| Frente | Quem paga | Quem recebe | Tipo de cobrança |
|---|---|---|---|
| A. SaaS Médico/Clínica | Médico ou Clínica | ICODLIFE | Assinatura recorrente mensal, sem split |
| B. Pagamento de consulta | Paciente | Médico/Clínica + comissão ICODLIFE | Cobrança avulsa (cartão/PIX/boleto), com split |
| C. Premium do paciente | Paciente | ICODLIFE | Assinatura recorrente mensal, sem split |
Três frentes independentes e complementares — o crescimento de uma não depende das outras.

## Slide 3 — Frente A: SaaS Médico/Clínica
- **Médico solo:** R$ 99,00/mês.
- **Clínica/Hospital:** R$ 388,00/mês.
- Cobrança recorrente via Pagar.me (`Plan` + `Subscription`), sem necessidade de cron próprio — o gateway administra a recorrência.
- Guard de feature por plano: funcionalidades liberadas conforme o plano ativo (ex.: nº de médicos vinculados, exportação de PDF, telemedicina).

## Slide 4 — Frente B: Marketplace de consultas (com split)
- Paciente paga a consulta na própria plataforma (cartão, PIX ou boleto).
- Split automático: parte fica com o médico/clínica (recebedor), parte é comissão da ICODLIFE — **10% de comissão**.
- Pré-requisito: médico/clínica completa cadastro de recebedor (KYC — CPF/CNPJ + dados bancários) diretamente no gateway.
- Webhooks confirmam o pagamento e liberam o repasse — sem transferência manual.

## Slide 5 — Frente C: Premium do paciente
- Assinatura mensal: **R$ 19,90/mês**.
- Recorrência via Pagar.me, mesmo mecanismo da Frente A.
- Desbloqueia funcionalidades avançadas do portal do paciente (a definir quais — hoje o core já é gratuito).

## Slide 6 — Por que Pagar.me v5
- PIX e boleto nativos, sem tokenização de cartão obrigatória.
- Split de marketplace pronto — não precisa construir motor de repasse do zero.
- Tokenização de cartão do lado do gateway — a ICODLIFE nunca armazena número de cartão (PCI-DSS).
- Ambiente sandbox gratuito para desenvolvimento, sem burocracia prévia.

## Slide 7 — Compliance e segurança financeira
- PCI-DSS: nenhum dado de cartão trafega ou fica armazenado nos servidores da ICODLIFE.
- LGPD: dados bancários e documentos de KYC ficam custodiados pelo gateway, não replicados além do necessário.
- Idempotência em todas as cobranças — evita cobrança duplicada em caso de falha de rede.
- Auditoria completa de webhooks (log bruto de todo evento recebido, com reprocessamento em caso de falha).

## Slide 8 — Uso dos recursos da captação (R$ 500.000)
| Uso | % | Valor |
|---|---|---|
| Produto & Desenvolvimento | 45% | R$ 315.000 |
| Marketing & Aquisição | 18% | R$ 126.000 |
| Operações & Equipe | 15% | R$ 105.000 |
| Legal, DPO & LGPD | 12% | R$ 84.000 |
| Infraestrutura Cloud | 10% | R$ 70.000 |

## Slide 9 — Status de implementação
- Nenhuma das três frentes está implementada ainda — plano técnico completo já pronto (`PLANO_MODULO_PAGAMENTOS.md`).
- Próxima ação: sub-sprint 18.1 — schema Prisma (`Plan`, `Subscription`, `PaymentRecipient`, `PaymentCharge`, `PaymentWebhookLog`) + abertura de conta sandbox Pagar.me.
- Roadmap completo: 18.1 a 18.7 (schema → integração → Frente A → Frente C → Frente B onboarding → Frente B cobrança → hardening/produção).

## Slide 10 — [completar] Projeções financeiras
[completar: projeção de receita/usuários por frente — não há número validado com o usuário ainda. Não estimar sem base.]
