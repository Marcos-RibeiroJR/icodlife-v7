# Plano — Sprint 22: gov.br (Login Único) + RNDS (Rede Nacional de Dados em Saúde)

> ICODLIFE / Sou Doutor · Documento de planejamento técnico
> Detalha o item de backlog **"Sprint 22 — gov.br / RNDS"**, seguindo o mesmo padrão do `PLANO_MODULO_CLINICAS_HOSPITAIS.md`.

---

## 1. Resumo executivo — são DUAS integrações distintas

O item "gov.br / RNDS" do backlog na verdade cobre **dois sistemas do governo federal, independentes entre si**, que não devem ser confundidos:

| | **gov.br Login Único** | **RNDS** |
|---|---|---|
| O que é | SSO/autenticação (OpenID Connect) — "Entrar com gov.br" | Rede de troca de dados clínicos entre sistemas de saúde (SUS e privados credenciados) |
| Serve para | Login alternativo do paciente/médico, com nível de confiabilidade cadastral (bronze/prata/ouro) | Buscar histórico clínico do SUS (vacinas, exames, atendimentos) pro prontuário ICODLIFE, e/ou publicar dados do ICODLIFE pro SUS |
| Quem opera | Secretaria de Governo Digital (SGD) | DATASUS / Ministério da Saúde |
| Complexidade de acesso | Média — credenciamento via portal, chave PGP, sem exigir estabelecimento de saúde | **Alta** — exige estabelecimento de saúde com CNES ativo, certificado digital ICP-Brasil (mTLS), processo formal de credenciamento + homologação |
| Pode ser feito 100% por código nesta sessão? | Sim, o client OIDC pode ser implementado e testado (com credencial de homologação a solicitar) | **Não** — depende de um processo administrativo fora do código (ver Seção 4) antes de qualquer chamada real funcionar |

**Recomendação de sequência**: tratar como dois sub-módulos independentes (22.A e 22.B), começando pelo Login Único (mais simples, sem pré-requisito burocrático pesado) e preparando o terreno (schema, cliente FHIR, mocks) para RNDS enquanto o credenciamento acontece em paralelo.

---

## 2. gov.br Login Único (Sprint 22.A)

### 2.1 Como funciona
- Protocolo **OpenID Connect** (OAuth 2.0 + camada de identidade) sobre `sso.acesso.gov.br`.
- Fluxo padrão *authorization code*: botão "Entrar com gov.br" → redirect pro gov.br → usuário autentica (senha, código, certificado ou biometria, conforme o nível de conta dele) → callback com `code` → troca por `access_token`/`id_token` (JWT) → `GET /userinfo` retorna CPF, nome, e-mail, telefone e o **nível de confiabilidade cadastral** (bronze/prata/ouro — indica o quão verificada é a identidade).
- Pré-requisito de acesso: solicitar credencial (`client_id`/`client_secret`) via `acesso.gov.br/roteiro-tecnico/solicitacaocredencialprocesso.html`, feito por um **Gestor Público responsável** — no caso do ICODLIFE (empresa privada), o cadastro é como "órgão/entidade integrante" via o Serviço de Integração aos Produtos do Ecossistema da Conta Digital gov.br. Chave de acesso ao ambiente de homologação é liberada primeiro; produção só depois de homologar.
- Documentação oficial: [Roteiro de Integração do Login Único](https://acesso.gov.br/roteiro-tecnico/) (repositório espelho: [github.com/servicosgovbr/manual-roteiro-integracao-login-unico](https://github.com/servicosgovbr/manual-roteiro-integracao-login-unico)).

### 2.2 Onde encaixa no ICODLIFE
- **Não substitui** o login por e-mail/senha atual — é uma **opção adicional** de login/cadastro pro paciente (`apps/web`) e possivelmente pro médico (`apps/doutor`).
- Ganho real: reduz fricção de cadastro (não precisa digitar CPF/nome/data de nascimento manualmente — o gov.br já devolve isso verificado) e sobe a confiabilidade dos dados cadastrais, o que é relevante pra um app de saúde.

### 2.3 Schema (Prisma) — novo
```prisma
model GovBrAccount {
  id                String    @id @default(uuid())
  userId            String    @unique @map("user_id")
  user              User      @relation(fields: [userId], references: [id])
  govBrSub          String    @unique @map("govbr_sub")       // "sub" do id_token — identificador único gov.br
  cpf               String?   @unique
  confiabilidade    String?                                    // bronze | prata | ouro
  selosVerificados  String[]  @map("selos_verificados")        // ex.: "presencial", "reconhecimento_facial"
  linkedAt          DateTime  @default(now()) @map("linked_at")
  lastLoginAt       DateTime? @map("last_login_at")
  @@map("govbr_accounts")
}
```
`User.cpf` já existe no schema (único, opcional) — o vínculo gov.br pode preenchê-lo automaticamente na primeira autenticação.

### 2.4 Backend — novo módulo `apps/api/src/modules/govbr/`
- `govbr.controller.ts`: `GET /auth/govbr/login` (redireciona pro `authorize` do gov.br com `state`/`nonce` assinados), `GET /auth/govbr/callback` (troca `code` por token, busca `/userinfo`, cria ou vincula `User` + `GovBrAccount`, emite o JWT interno do ICODLIFE do mesmo jeito que `auth.service.ts` já faz).
- `govbr.service.ts`: client OIDC (pode usar `openid-client` ou chamadas manuais com `axios`, seguindo o padrão já usado em `company.service.ts` pra BrasilAPI — timeout curto, User-Agent, fallback de erro claro).
- Variáveis de ambiente novas: `GOVBR_CLIENT_ID`, `GOVBR_CLIENT_SECRET`, `GOVBR_REDIRECT_URI`, `GOVBR_ENV` (`homologacao` | `producao` — URLs base diferentes).

### 2.5 Frontend
- Botão "Entrar com gov.br" (componente oficial, guidelines de identidade visual do gov.br) nas telas de login de `apps/web` e `apps/doutor` (opcional em `apps/clinica`, já que o admin de clínica normalmente já tem conta ICODLIFE).

### 2.6 Roadmap 22.A
| Sub-sprint | Entrega |
|---|---|
| 22.A.1 | Solicitar credencial de homologação no `acesso.gov.br` (ação do usuário/empresa, fora do código) + schema `GovBrAccount` + migration |
| 22.A.2 | `govbr.module`/`controller`/`service` completo contra o ambiente de **homologação** |
| 22.A.3 | Botão + fluxo de callback em `apps/web` (paciente) |
| 22.A.4 | Extender pra `apps/doutor` |
| 22.A.5 | Solicitar credencial de produção e trocar as URLs (só depois de homologar) |

---

## 3. RNDS — Rede Nacional de Dados em Saúde (Sprint 22.B)

### 3.1 O que é
- Conjunto de **APIs FHIR R4** operado pelo DATASUS, com autenticação **mTLS via certificado ICP-Brasil** (não é OAuth simples — é certificado digital de verdade, do estabelecimento de saúde).
- A RNDS só aceita e devolve dados no padrão **HL7 FHIR** — não tem formato próprio alternativo.
- Modelos de informação já publicados (os mais relevantes pro ICODLIFE):
  - **RIA** — Registro de Imunobiológico Administrado (vacinas)
  - **REL** — Resultado de Exame Laboratorial
  - **RAC** — Registro de Atendimento Clínico
  - **SA** — Sumário de Alta Hospitalar
- Documentação oficial: [Guia de Integração RNDS](https://rnds-guia.saude.gov.br/), [Portal de Serviços DATASUS](https://servicos-datasus.saude.gov.br/) (onde se solicita acesso), perfis FHIR em [simplifier.net/redenacionaldedadosemsaude](https://simplifier.net/redenacionaldedadosemsaude).

### 3.2 ⚠️ Pré-requisitos que são processo administrativo, não código
Isso **precisa acontecer antes** de qualquer integração funcionar de verdade — não dá pra "codar" em volta:
1. **CNES ativo** — o estabelecimento de saúde (a Clínica ICODLIFE Centro, por exemplo) precisa estar cadastrado no Cadastro Nacional de Estabelecimentos de Saúde. O schema já tem o campo `Clinic.cnes` (opcional, hoje vazio) — precisa ser preenchido com um CNES real.
2. **Certificado digital ICP-Brasil** (e-CNPJ ou certificado de aplicação) da empresa/estabelecimento, usado pra autenticação mútua SSL nas chamadas à API.
3. **Solicitação formal** no Portal de Serviços DATASUS: selecionar o serviço RNDS → solicitar acesso → preencher formulário → **testes em ambiente de homologação** → só então solicitar credencial de produção.
4. Esse processo é conduzido pelo **gestor do estabelecimento** (o usuário/empresa), não é algo que eu consiga fazer via código ou automação — é um cadastro formal com o Ministério da Saúde.

**Recomendação**: iniciar esse processo administrativo em paralelo ao desenvolvimento (ele pode levar semanas), e construir a camada de código contra mocks/ambiente de homologação enquanto isso.

### 3.3 Arquitetura de integração
```
apps/api/src/modules/rnds/
  rnds.module.ts
  rnds-client.service.ts     # cliente HTTP com mTLS (certificado .pfx/.pem via env), assinatura das requisições FHIR
  rnds-mapper.service.ts     # converte models internos (ExamResult, VaccinationRecord, Appointment) <-> recursos FHIR (Observation, Immunization, Encounter)
  rnds-sync.service.ts       # orquestra consumo (pull) e publicação (push), idempotência e retry
  dto/
```
- **Padrão de resiliência**: igual ao `company.service.ts` (CNPJ/BrasilAPI) já usa — timeout curto, mensagens de erro específicas por código HTTP, sem travar o fluxo principal do app se a RNDS estiver fora do ar.
- Certificado mTLS carregado via variável de ambiente apontando pro arquivo `.pfx`/`.pem` (nunca commitado — adicionar ao `.gitignore` e ao `SETUP.md`).

### 3.4 Schema (Prisma) — novo
```prisma
model RndsSyncLog {
  id          String   @id @default(uuid())
  direction   String                          // "pull" | "push"
  resourceType String  @map("resource_type")  // "Immunization" | "Observation" | "Encounter" | "Composition"
  userId      String?  @map("user_id")
  clinicId    String?  @map("clinic_id")
  status      String                          // "success" | "error" | "pending"
  rndsId      String?  @map("rnds_id")        // id do recurso na RNDS (idempotência)
  errorDetail String?  @map("error_detail")
  requestedAt DateTime @default(now()) @map("requested_at")
  completedAt DateTime? @map("completed_at")
  @@index([userId])
  @@index([clinicId])
  @@map("rnds_sync_log")
}
```
- Reaproveita `VaccinationRecord`, `ExamResult`, `Appointment` já existentes como origem/destino do mapeamento — não recria essas tabelas.

### 3.5 Fluxos principais
1. **Consumo (pull)** — paciente autoriza (consentimento LGPD explícito, novo `consentType: 'rnds_data_access'` em `UserConsent`) → ICODLIFE busca na RNDS o histórico de vacinas/exames/atendimentos pelo CPF/CNS do paciente → mapeia FHIR → grava como `VaccinationRecord`/`ExamResult` com origem `source: 'rnds'` (campo novo a adicionar nesses models) → aparece na Biblioteca de Exames/Carteira de Vacinação já existentes.
2. **Publicação (push)** — quando um médico/clínica ICODLIFE emite um exame ou atendimento, opcionalmente publica na RNDS (`Composition`/`Observation`) pra ficar disponível pro SUS e outros sistemas — exige nível mais alto de responsabilidade legal (o dado passa a ser oficial no sistema nacional), recomendado só depois do fluxo de consumo estar validado e do processo de credenciamento de produção concluído.

### 3.6 Roadmap 22.B
| Sub-sprint | Entrega |
|---|---|
| 22.B.1 | **Ação do usuário**: iniciar solicitação de CNES + certificado ICP-Brasil + acesso RNDS no Portal de Serviços DATASUS (processo administrativo, roda em paralelo) |
| 22.B.2 | Schema (`RndsSyncLog` + campo `source` em `VaccinationRecord`/`ExamResult`) + migration |
| 22.B.3 | `rnds-mapper.service` — conversão FHIR ↔ models internos, testável **sem credencial real** (fixtures locais de payload FHIR de exemplo, disponíveis no Simplifier) |
| 22.B.4 | `rnds-client.service` contra o **ambiente de homologação** (assim que a credencial de teste sair) |
| 22.B.5 | Fluxo de consumo (pull) com consentimento LGPD, integrado à Biblioteca de Exames/Vacinação |
| 22.B.6 | Fluxo de publicação (push) — só após validar consumo e obter credencial de produção |

---

## 4. Ordem de execução recomendada

1. **Agora (código, sem bloqueio)**: schema de ambos os módulos (`GovBrAccount`, `RndsSyncLog`) + `rnds-mapper.service` com fixtures locais — 100% viável nesta sessão, sem depender de nenhuma credencial.
2. **Em paralelo (ação do usuário, fora do código)**: solicitar credencial de homologação gov.br Login Único (mais rápido) e abrir o processo de CNES/certificado/RNDS no Portal DATASUS (mais lento — iniciar cedo).
3. **Depois que a credencial de homologação gov.br chegar**: completar 22.A (client OIDC real + botão de login).
4. **Depois que a credencial de homologação RNDS chegar**: completar 22.B.4/22.B.5.
5. **Produção de ambos**: só depois de homologação completa + aprovação formal.

---

## 5. Status de Execução

### ⏳ Pendente — nada implementado ainda
Este documento é o ponto de partida (planejamento). Próxima ação sugerida: começar pelo schema (`GovBrAccount` + `RndsSyncLog`) e pelo `rnds-mapper.service` com fixtures, que não dependem de nenhuma credencial externa — enquanto isso, o usuário decide se/quando abrir os processos de credenciamento (Seção 4, passo 2).

---

## Fontes consultadas
- [RNDS — Catálogo de APIs governamentais](https://www.gov.br/conecta/catalogo/apis/rnds-rede-nacional-de-dados-em-saude)
- [Guia de Integração RNDS](https://rnds-guia.saude.gov.br/)
- [Manual de Integração RNDS — Barramento (PDF, Secretaria de Saúde MG)](https://www.saude.mg.gov.br/wp-content/uploads/2025/11/RNDS-Manual-Integracao-Barramento_vSite.pdf)
- [Perfis FHIR da RNDS — Simplifier.net](https://simplifier.net/redenacionaldedadosemsaude)
- [Roteiro de Integração do Login Único gov.br](https://acesso.gov.br/roteiro-tecnico/)
- [Roteiro técnico — Passo-a-Passo para Integrar](https://acesso.gov.br/roteiro-tecnico/iniciarintegracao.html)
- [Manual de Integração Login Único — GitHub servicosgovbr](https://github.com/servicosgovbr/manual-roteiro-integracao-login-unico)
