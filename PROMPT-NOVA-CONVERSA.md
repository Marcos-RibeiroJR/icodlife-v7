# IcodLife v7 — Prompt de Continuidade

## Contexto do Projeto

**IcodLife v7** é um sistema de saúde pessoal full-stack em pnpm monorepo:
- `apps/api` — NestJS 10, porta 3001, PostgreSQL 16 via Prisma 5.22
- `apps/web` — Next.js 14 App Router, porta 3000 (paciente)
- `apps/doutor` — Next.js 14, porta 3002 (painel médico)
- Pasta raiz: `C:\Users\marcos.junior.3\Downloads\icodlife-v7`
- Branch ativa: `develop`

## Estado Atual (último commit: bf2eb91)

**Commit:** `bf2eb91 fix: corrigir cirurgias/vacinas/medicos — arquivos truncados, null bytes, JSX syntax`

### Módulos implementados e compilando

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | /dashboard | ✅ |
| Exames | /records | ✅ |
| Evolução de Exames | /exam-timeline | ✅ |
| Laudo de Tendência | /trend-report | ✅ |
| Medicamentos | /medications | ✅ |
| Agenda | /appointments | ✅ |
| Módulo Vida | /vida | ✅ |
| Pressão Arterial | /vida/pressao | ✅ |
| Oftalmologia | /ophthalmology | ✅ |
| Med. do Trabalho | /occupational-health | ✅ |
| Família | /family | ✅ |
| Ciclo Menstrual | /menstrual | ✅ |
| Compartilhar | /share | ✅ |
| HealthBot | /chat | ✅ |
| Cirurgias | /cirurgias | ✅ |
| Vacinas | /vacinas | ✅ |
| Médicos | /medicos | ✅ |
| Painel Médico | apps/doutor | ✅ |

### O que foi corrigido nas últimas sessões

1. **Logo IcodLife** integrado (sidebar, login web, login doutor, DoctorShell). SVGs em `apps/web/public/logo.svg` e `logo-dark.svg`.
2. **AppLayout** adicionado em `/cirurgias`, `/vacinas`, `/medicos` (sidebar/header sumia nessas páginas).
3. **VaccineCombobox** — searchable combobox com `useRef` para fechar ao clicar fora.
4. **Catálogo PNI** — `STATIC_VACCINES` (27 vacinas) como fallback estático quando API retorna vazio.
5. **Módulo Médicos** — `MOCK_DOCTORS` (12 médicos brasileiros) como fallback quando API retorna vazio.
6. **Arquivos truncados reparados** — `cirurgias/page.tsx` (459 linhas), `vacinas/page.tsx` (691 linhas), `medicos/page.tsx` (304 linhas), `Sidebar.tsx` (127 linhas).

## Arquitetura de Layout

Todas as páginas autenticadas em `apps/web` devem usar `AppLayout`:

```tsx
import { AppLayout } from '../../components/layout/AppLayout';

export default function MinhaPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FFF8F8]">
        {/* conteúdo */}
      </div>
    </AppLayout>
  );
}
```

## Problema Crítico Conhecido: Windows ↔ Linux Sync

O Write tool do Windows **adiciona null-bytes** no final do arquivo. Após qualquer escrita via Windows tools, sempre executar:

```bash
python3 -c "
path = '/sessions/<session-id>/mnt/Downloads/icodlife-v7/apps/web/src/app/ARQUIVO.tsx'
with open(path,'rb') as f: data = f.read()
cleaned = data.rstrip(b'\x00').rstrip(b'\n') + b'\n'
with open(path,'wb') as f: f.write(cleaned)
"
```

Verificar compilação:
```bash
cd /sessions/<session-id>/mnt/Downloads/icodlife-v7/apps/web
npx tsc --noEmit --jsx react-jsx --esModuleInterop --module esnext --moduleResolution node \
  src/app/ARQUIVO.tsx 2>&1 | grep -v "node_modules" | grep -v "TS2694" | grep -v "TS2307"
```

**Nota:** O session-id do bash muda a cada nova sessão. Ver o path correto em: Sistema → "Shell access".

## Credenciais Demo

```
Paciente: paciente@demo.icodlife.com / Demo@12345
Médico:   doutor@demo.icodlife.com   / Demo@12345
```

## Comandos Úteis

```powershell
# Iniciar tudo
cd C:\Users\marcos.junior.3\Downloads\icodlife-v7
pnpm run dev          # porta 3000 (web) + 3001 (api) + 3002 (doutor)

# Seed do banco
cd apps/api && npx ts-node prisma/seed-users.ts

# Commit
git add -A && git commit -m "feat: ..." && git push origin develop
```

## Próximos Passos Sugeridos (Sprint 11+)

- **Sprint 11** — Notificações push + histórico de alertas
- **Sprint 12** — Módulo de Evolução Corporal (peso, IMC, bioimpedância)
- **Sprint 13** — Relatório PDF exportável (laudo completo do paciente)
- **Sprint 14** — Onboarding guiado para novos usuários
- **Sprint 15** — App mobile (React Native em `apps/mobile`)
