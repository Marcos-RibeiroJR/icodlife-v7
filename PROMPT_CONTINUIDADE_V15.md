# Prompt de Continuidade — ICODLIFE / Sou Doutor (V15)

Cole o bloco da **Seção 2** como primeira mensagem na próxima sessão (outro Cowork). As demais seções são referência de progresso, pendências e roadmap.

---

## 1. Visão geral do progresso

### Entregue nesta jornada (V14 → V15)

| Área | O que ficou pronto |
|---|---|
| **Fase 3 — Dashboard de Tendência** | Página `/saude-tendencia` (app paciente) consumindo `GET /ai-chat/trends`: risco médio, sentimento, tendência, top flags, seletor diário/semanal/mensal/anual (recharts). Item no Sidebar (Módulo Vida). **Já commitada** (commit `2c1a02b`). |
| **Fix duplicação `/api/v1`** | Prontuário PDF (404), push e telemedicina (web+doutor) faziam `${base}/api/v1/...` com base já contendo `/api/v1`. Corrigido com `.replace(/\/api\/v1\/?$/, '')`. Também ajustou `WS_URL` do socket.io. Novo helper `downloadAuthedBlob` no `api.ts`. |
| **HealthBot flutuante** | `HealthBotWidget.tsx` (bolha canto inf. direito, painel estilo celular) montado global no `AppLayout`, escondido em `/chat`. Botões de resposta rápida **Sim/Não** no widget e na página `/chat`. |
| **Biblioteca de Exames — classificação** | OCR agora classifica o tipo (`classifyExamType`: sangue/imagem/cardiologia/neurologia/urina/outros). Modal de upload com **seletor de categoria** sugerida. Filtro das abas corrigido (antes tudo caía em "Todos"). Nova rota `PATCH /records/:id`. Aba **Oftalmologia**. |
| **OCR de imagem** | `tesseract.js` (`extractFromImage`) para exames fotografados (JPG/PNG); controller roteia `image/*`. Modelo `por` baixado do CDN na 1ª vez (offline via `TESSERACT_LANG_PATH`). `pnpm-workspace.yaml` corrigido (`tesseract.js: true`, `unrs-resolver: true`). |
| **Laudo de Tendência + HealthBot** | `trend-report.service` passou a cruzar com check-ins do HealthBot (bloco novo no laudo `/trend-report`). |
| **Módulo Vida — save (BUG RESOLVIDO)** | Causa real: colunas `String[]` (`alcohol_types`, `exercise_types`, `mental_health_diagnoses`) são NOT NULL sem default; no CREATE o service omitia → violação de null. Fix: default `[]` no `create`. Também: erro agora visível no front (`handleSave` com catch), backend com try/catch + log do erro real, parse seguro de data. **Lembrete mensal + data da última coleta** (usa `updatedAt`). |
| **Auto-exame oftalmológico** | Fix `toFixed is not a function` (valores vêm como string → `Number()`, helpers `fmtDpt`/`fmtNum`). Referências de grau **0/45/90/135** no leque astigmático. **Laudo em PDF** server-side (`ophthalmology-pdf.service`, padrão do ASO) via `GET /ophthalmology/exams/:id/laudo.pdf`; salvo na Biblioteca (HealthRecord categoria `oftalmologia`); seção **Oftalmologia** no prontuário (`export.service`); botões de download no exame e na Biblioteca. Acuidade visual agora persistida. |
| **Ícone / favicon** | Novo ícone ICF ICODELIFE em web e doutor: `favicon.ico`, `apple-touch-icon.png`, `icon-512.png`, `logo.png`; SVGs `logo*.svg` sobrescritos com o ícone embutido; `metadata.icons` nos dois `layout.tsx`. |
| **Doutor — "Médicos no ICODLIFE"** | Fix `Cannot read properties of undefined (reading 'filter')`: front lia `r.data.data`; API devolve `{ doctors, total }`. Corrigido para `r.data.doctors ?? []` + guard no filter. |
| **Catálogo médico (híbrido)** | Novo módulo `catalog`: `GET /catalog/exams` (base **TUSS embutida**, ~120 exames por grupo) e `GET /catalog/medications` (**ANVISA ao vivo + fallback** ~160 comuns). Autocomplete no front (`AutocompleteInput`) nos campos de medicamento (receitas) e exame (pedidos). |
| **CNPJ (Empresa)** | Já usava BrasilAPI. Reforçado: **User-Agent** (Cloudflare bloqueia sem), **fallback ReceitaWS**, timeout 8s, e mensagem de erro detalhada (mostra HTTP de cada provedor). |

### Estado do Git — ⚠️ IMPORTANTE
- **Último commit:** `2c1a02b feat(fase3): dashboard de tendencia de saude` — está em `origin/develop` (pushed).
- **TODO o resto desta jornada está LOCAL, NÃO commitado.**
- **O índice do git está CORROMPIDO** (`fatal: index file corrupt`). Antes de commitar, no PowerShell na raiz do projeto:
  ```powershell
  Remove-Item .git\index -ErrorAction SilentlyContinue
  git reset            # reconstrói o índice a partir do HEAD (não perde arquivos de trabalho)
  git status           # deve voltar a funcionar
  ```
- Depois, commitar tudo:
  ```powershell
  pnpm install         # instala tesseract.js (novo)
  git add -A
  git commit -m "feat: healthbot flutuante, catalogo exames/medicamentos, laudo oftalmo PDF, OCR imagem, fix modulo vida/save, fix /api/v1, novo icone, fix medicos, cnpj robusto"
  git push origin develop
  ```

---

## 2. BLOCO DE CONTINUIDADE (colar na próxima sessão)

```
Continuando o desenvolvimento do monorepo ICODLIFE / Sou Doutor (Cowork/desktop).

STACK
- Monorepo pnpm workspaces (Node v24, pnpm v10)
- apps/api    -> NestJS, porta 3001, prefixo global /api/v1
- apps/web    -> Next.js 14, porta 3000 (paciente)
- apps/doutor -> Next.js 14, porta 3002 (médico)
- apps/mobile -> Expo React Native
- ORM: Prisma 5.22, client gerado em src/generated/prisma (import relativo ../../generated/prisma; NUNCA @prisma/client)
- Banco: PostgreSQL via Docker (container icodlife_postgres, porta 5434) + redis 6379

COMO SUBIR (ver COMO_SUBIR.md na raiz)
1) docker start icodlife_postgres icodlife_redis
2) apps/api:    pnpm dev   (recompila do fonte; espere "successfully started")
3) apps/web:    pnpm dev   -> localhost:3000
4) apps/doutor: pnpm dev   -> localhost:3002
- Rodar a API SEMPRE via `pnpm dev` (nest start --watch), NÃO pelo dist antigo.
- EADDRINUSE 3001 (recorrente): `taskkill /IM node.exe /F`, esperar 3s, subir de novo. Manter só 1 janela da API.
- 1ª vez após pull: `pnpm install` (na raiz) para instalar tesseract.js.

CREDENCIAIS DEMO (senha Demo@12345)
- Paciente M: joao@demo.icodlife.com | Paciente F: ana@demo.icodlife.com | Médico: dr.marcos@demo.icodlife.com

QUIRKS CRÍTICOS (aprendidos)
- A ferramenta de edição de arquivos deste ambiente TRUNCA o final de arquivos (especialmente com emojis) ao salvar no mount Windows. SEMPRE editar via terminal (python/bash: ler, substituir, gravar) e validar contagem de linhas/última linha.
- ValidationPipe global (whitelist+forbidNonWhitelisted). DTO sem decorators = 400. Controllers do doutor e lifestyle usam @Body() dto: any.
- Colunas Prisma String[] são NOT NULL sem default -> no CREATE, dar default [] senão viola null (foi o bug do Módulo Vida).
- Endpoints "1 por dia" devem ser idempotentes (React StrictMode dispara efeito 2x).
- Rotas :param com CNPJ -> enviar só dígitos (barra quebra a rota). No front já se usa replace(/\D/g,'').
- Base de API no front já inclui /api/v1; fetch manual NÃO deve concatenar /api/v1 de novo (usar helper downloadAuthedBlob).
- git: se "index file corrupt" -> Remove-Item .git\index ; git reset.

MÓDULOS/ARQUIVOS NOVOS DESTA JORNADA
- apps/web/src/app/saude-tendencia/page.tsx (Dashboard de risco)
- apps/web/src/components/chat/HealthBotWidget.tsx (bolha flutuante, montada no AppLayout)
- apps/api/src/modules/ophthalmology/ophthalmology-pdf.service.ts (laudo PDF) + rota exams/:id/laudo.pdf
- apps/api/src/modules/catalog/** (catalog.service/controller/module + data/tuss-exames.ts + data/medicamentos.ts)
- apps/doutor/src/components/ui/AutocompleteInput.tsx
- COMO_SUBIR.md, PROMPT_CONTINUIDADE_V15.md

ESTADO
- origin/develop = 2c1a02b (Fase 3). Todo o resto está LOCAL e NÃO commitado. Índice do git corrompido: rodar Remove-Item .git\index ; git reset ; depois pnpm install ; git add -A ; commit ; push.

PRÓXIMO PASSO SUGERIDO
[escolher da Seção 4 — recomendado: (a) validar CNPJ na máquina do usuário / diagnosticar rede, (b) Sprint 18 Pagamentos, ou (c) Fase 4 do Motor de Saúde]
```

---

## 3. Pendências técnicas / a validar
1. **Commitar tudo** após corrigir o índice do git (ver Seção 1).
2. **CNPJ**: testar na máquina do usuário (ex.: `19.131.243/0001-97`). Se ainda falhar, a nova mensagem de erro mostra o motivo (HTTP 403/timeout nos dois = servidor sem saída pra internet / firewall).
3. **ANVISA (medicamentos)**: a chamada ao vivo é best-effort com fallback local. Se a ANVISA responder mal, sempre cai na lista embutida.
4. **TUSS**: catálogo embutido é curado por NOME; carregar a tabela oficial da ANS (CSV, ~6 mil itens com códigos) para o campo `code` quando quiser cobertura total.
5. **LifestyleProfile.healthScore**: coluna ainda não existe; front referencia `profile.healthScore` (cards nunca aparecem, inofensivo). Decidir criar o score ou remover a referência.
6. **Arrays NOT NULL**: corrigido no service (default []). Opcional: migration com `@default([])` nas colunas String[] do lifestyle.
7. **Receitas — "Nova Emissão"**: validar visualmente o autocomplete de medicamento/exame renderizando bem em todas as linhas.
8. **OCR de PDF escaneado**: hoje PDF usa pdf-parse (texto). PDF escaneado (imagem em PDF) exigiria rasterizar antes do OCR — próximo passo possível.

## 4. Backlog / próximos passos
- Sprint 18 — Pagamentos (Stripe/Pagar.me, assinaturas). 🔜
- Sprint 20 — Dashboard Analytics para o médico. 🔜
- Sprint 21 — Multi-tenant (clínica com vários médicos). 🔜
- Sprint 22 — gov.br / RNDS. 🔜
- Sprint 23 — Hardening + Deploy VPS. 🔜
- Receitas em PDF server-side assinável (como o ASO já é).
- Fase 4 do Motor de Saúde — big data populacional (anônimo) + IA sobre texto livre.
- SST: filiais por empresa, agenda de exames ocupacionais com vencimento, PGR/PCMSO por cargo, eSocial (S-2220/2210/2240).

## 5. Rotas novas úteis
- GET /api/v1/ai-chat/trends?period=daily|weekly|monthly|annual
- PATCH /api/v1/records/:id
- GET /api/v1/ophthalmology/exams/:id/laudo.pdf
- GET /api/v1/catalog/exams?q= | GET /api/v1/catalog/medications?q=
- GET /api/v1/doutor/empresas/lookup/:cnpj (BrasilAPI + ReceitaWS)
