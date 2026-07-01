# Módulo Saúde Mental (`mental-health`)

Submódulo do bloco de Medicina do Trabalho. Aplica escalas psicométricas **de uso livre**, gera um **laudo individual** por teste e um **laudo consolidado** centralizado, e persiste tudo como registro de prontuário (`MentalHealthAssessment`).

## Escalas do MVP (todas livres, autoaplicáveis, não privativas)
| Código | Escala | Categoria | Itens | Escore |
|---|---|---|---|---|
| `GAD7` | GAD-7 | Ansiedade | 7 | 0–21 |
| `PHQ9` | PHQ-9 | Depressão | 9 | 0–27 (item 9 = segurança) |
| `CBI`  | Copenhagen Burnout Inventory | Burnout | 13 | 0–100 (2 subescalas) |
| `WHO5` | WHO-5 | Bem-estar | 5 | 0–100 (maior = melhor) |

> Estresse (PSS) e Sono (PSQI) ficaram de fora do MVP por exigirem licença/uso restrito.
> Para adicionar uma escala nova e livre: crie `scales/<nome>.ts` e registre em `scales/index.ts`.

## Segurança clínica
`safety.service.ts` detecta ideação suicida (item 9 do PHQ-9) e sofrimento severo:
destaca alerta no topo do laudo, oferece recursos (CVV 188, SAMU 192) e notifica o(s)
médico(s) vinculado(s) ativo(s) via `NotificationService`. Falhas de notificação nunca
quebram o registro da avaliação.

## Endpoints (todos sob `JwtAuthGuard`, prefixo `/mental-health`)
- `GET  /scales` — catálogo de escalas + agrupamento por categoria
- `GET  /scales/:code` — questionário para renderizar o formulário
- `POST /assessments/:code` — envia respostas → laudo individual + persiste
- `GET  /assessments?scale=CODE` — histórico do usuário
- `GET  /assessments/consolidated` — laudo consolidado (não persiste)
- `POST /assessments/consolidated` — gera e ARMAZENA o laudo consolidado
- `GET  /assessments/:id` — avaliação individual + laudo
- `GET  /patients/:userId/assessments` — visão do médico vinculado
- `POST /assessments/:id/review` — médico revisa/valida o laudo

## Migration + build (rodar no Windows, na ordem)
```powershell
cd C:\Users\marcos.junior.3\Downloads\icodlife-v7\apps\api
npx prisma migrate dev --name sprint17_mental_health   # cria a tabela mental_health_assessments
npx prisma generate
npx nest build
robocopy src\generated dist\src\generated /E /XF *.dll.node /NFL /NDL /NJH /NJS
node dist/src/main
```
Model adicionado: `MentalHealthAssessment` (tabela `mental_health_assessments`) + relation `mentalHealthAssessments` no `User`. Módulo registrado no `app.module.ts`.

## Teste rápido (após subir a API)
```
POST /mental-health/assessments/GAD7
{ "answers": [
  {"questionId":"gad7_1","value":2},{"questionId":"gad7_2","value":3},
  {"questionId":"gad7_3","value":2},{"questionId":"gad7_4","value":2},
  {"questionId":"gad7_5","value":1},{"questionId":"gad7_6","value":2},
  {"questionId":"gad7_7","value":3} ] }
```

## Conformidade
- Escalas embutidas são de uso livre, citadas com atribuição aos autores (ver campo `attribution` de cada `scales/*.ts`).
- Dado sensível (LGPD): DTO tem `consentGiven`; considerar ocultar no compartilhamento do prontuário.
- Todo laudo carrega disclaimer de rastreio (não é diagnóstico).
