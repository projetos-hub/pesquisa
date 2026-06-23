# Especificação Técnica — Agendamento Automático de Surveys

## Contexto e estado atual

### O que existe hoje

- Tabela `surveys` com `status CHECK (status IN ('rascunho', 'ativa', 'pausada', 'encerrada'))`, `open_date TIMESTAMPTZ`, `close_date TIMESTAMPTZ`
- Tabela `survey_communities` com `status CHECK (status IN ('ativa', 'pausada', 'encerrada', 'nao_aberta'))`, `open_date TIMESTAMPTZ`, `close_date TIMESTAMPTZ`
- Função `calcStatus(open, close)` em `communities/actions.ts` — calcula status correto pelas datas, mas só é chamada quando o admin salva manualmente
- Infra de cron existente: pg_cron (`dispatch-processor`, `*/5 * * * *`) + Vercel Cron (`sync-sheets`, `0 11 * * *`)
- `CRON_SECRET` já configurado no Vercel

### Problema central

As datas existem como `TIMESTAMPTZ` desde a migration 016, mas a transição de status só acontece quando o admin clica em "Salvar". Não há job que verifique "chegou a hora de abrir/fechar esta survey ou comunidade".

---

## Decisão de design: Vercel Cron (recomendado)

**Schedule:** `0 * * * *` (1x por hora). Surveys tipicamente abrem/fecham em granularidade de dias, não minutos. Atraso máximo de 59 minutos é aceitável.

**Vantagens sobre pg_cron:**
- Segue o padrão exato do `sync-sheets`
- Vercel injeta `Authorization: Bearer <CRON_SECRET>` automaticamente
- Auditável via logs do Vercel dashboard
- Rollback simples: remover entrada do `vercel.json`

---

## O que implementar

### 1. Migration — índices para eficiência

**Arquivo:** `supabase/migrations/025_auto_schedule_indexes.sql`

```sql
-- Indexes parciais para o cron de agendamento automático
CREATE INDEX IF NOT EXISTS idx_surveys_open_date_pending
  ON surveys (open_date)
  WHERE open_date IS NOT NULL AND status IN ('rascunho', 'pausada');

CREATE INDEX IF NOT EXISTS idx_surveys_close_date_active
  ON surveys (close_date)
  WHERE close_date IS NOT NULL AND status = 'ativa';

CREATE INDEX IF NOT EXISTS idx_survey_communities_open_date_pending
  ON survey_communities (open_date)
  WHERE open_date IS NOT NULL AND status IN ('nao_aberta', 'pausada');

CREATE INDEX IF NOT EXISTS idx_survey_communities_close_date_active
  ON survey_communities (close_date)
  WHERE close_date IS NOT NULL AND status = 'ativa';
```

Não altera colunas nem cria novas — apenas índices sobre campos existentes.

### 2. Endpoint `/api/cron/advance-survey-status`

**Arquivo:** `app/api/cron/advance-survey-status/route.ts`

```typescript
import { createServiceClient } from '@/lib/supabase-service'

function isAuthorized(req: Request): boolean {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // surveys: auto-open
  const { data: openedSurveys } = await supabase
    .from('surveys')
    .update({ status: 'ativa' })
    .lte('open_date', now)
    .in('status', ['rascunho', 'pausada'])
    .not('open_date', 'is', null)
    .select('id, title')

  // surveys: auto-close
  const { data: closedSurveys } = await supabase
    .from('surveys')
    .update({ status: 'encerrada' })
    .lte('close_date', now)
    .eq('status', 'ativa')
    .not('close_date', 'is', null)
    .select('id, title')

  // communities: auto-open
  const { data: openedCommunities } = await supabase
    .from('survey_communities')
    .update({ status: 'ativa' })
    .lte('open_date', now)
    .in('status', ['nao_aberta', 'pausada'])
    .not('open_date', 'is', null)
    .select('id, survey_id, community_id')

  // communities: auto-close
  const { data: closedCommunities } = await supabase
    .from('survey_communities')
    .update({ status: 'encerrada' })
    .lte('close_date', now)
    .eq('status', 'ativa')
    .not('close_date', 'is', null)
    .select('id, survey_id, community_id')

  const result = {
    ok: true,
    surveys_opened:     (openedSurveys ?? []).length,
    surveys_closed:     (closedSurveys ?? []).length,
    communities_opened: (openedCommunities ?? []).length,
    communities_closed: (closedCommunities ?? []).length,
    processed_at:       now,
  }

  console.log('[cron/advance-survey-status]', result)
  return Response.json(result)
}
```

### 3. Atualizar `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/sync-sheets", "schedule": "0 11 * * *" },
    { "path": "/api/cron/advance-survey-status", "schedule": "0 * * * *" }
  ]
}
```

### 4. Utilitário de preview — `schedulingHint()`

Adicionar em `app/admin/surveys/page.tsx`:

```typescript
function schedulingHint(
  openDate: string | null,
  closeDate: string | null,
  status: string
): string | null {
  const now = new Date()
  if (status === 'rascunho' || status === 'pausada') {
    if (openDate) {
      const open = new Date(openDate)
      if (open > now) {
        const diffDays = Math.ceil((open.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Abre hoje'
        if (diffDays === 1) return 'Abre amanhã'
        return `Abre em ${diffDays} dias`
      }
    }
  }
  if (status === 'ativa') {
    if (closeDate) {
      const close = new Date(closeDate)
      if (close > now) {
        const diffDays = Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Encerra hoje'
        if (diffDays === 1) return 'Encerra amanhã'
        return `Encerra em ${diffDays} dias`
      }
    }
  }
  return null
}
```

---

## Edge Cases

| # | Cenário | Comportamento |
|---|---------|---------------|
| EC-1 | Survey aberta manualmente antes do open_date | Cron usa `WHERE status IN ('rascunho', 'pausada')` — survey já ativa não é tocada |
| EC-2 | Survey sem datas (controle manual) | Queries incluem `AND ... IS NOT NULL` — nunca afetadas |
| EC-3 | Survey encerrada manualmente antes do close_date | Cron usa `WHERE status = 'ativa'` — já encerrada não é tocada |
| EC-4 | open_date > close_date (inválido) | Adicionar validação em `updateSurvey` igual à que já existe em `updateCommunityDates` |
| EC-5 | Cron falha em um ciclo | Próxima hora re-tenta; queries são idempotentes |
| EC-6 | Community pausada com open_date no passado | Cron RE-ABRE — pausas intencionais devem remover/ajustar open_date |

---

## Impacto no Admin UI

### `app/admin/surveys/page.tsx`
Badge colorido abaixo da data de abertura/encerramento usando `schedulingHint()`.

### `app/admin/surveys/[id]/SurveyEditForm.tsx`
Texto explicativo abaixo dos campos de data:
> "Se preenchidas, a pesquisa abrirá e encerrará automaticamente. O status manual prevalece sobre as datas."

### `app/admin/surveys/[id]/CommunityInstallManager.tsx`
Hint inline por comunidade com data de abertura agendada.

---

## Opcional (não incluir no MVP)

Notificação automática quando survey abre: requer campo `auto_notify_on_open` na tabela + dispatch template. Complexidade extra — implementar em sprint separado.

---

## Arquivos a criar/modificar

| Arquivo | Operação |
|---------|----------|
| `supabase/migrations/025_auto_schedule_indexes.sql` | CRIAR |
| `app/api/cron/advance-survey-status/route.ts` | CRIAR |
| `vercel.json` | MODIFICAR — +1 entrada de cron |
| `app/admin/surveys/page.tsx` | MODIFICAR — badge schedulingHint |
| `app/admin/surveys/actions.ts` | MODIFICAR — validação open_date < close_date em updateSurvey |
| `app/admin/surveys/[id]/SurveyEditForm.tsx` | MODIFICAR — texto explicativo |
| `app/admin/surveys/[id]/CommunityInstallManager.tsx` | MODIFICAR — hint por comunidade |

## Não requer

- Novas colunas nas tabelas
- Alteração de constraints de status
- Configuração adicional no Vercel ou Supabase
- Alteração de RLS policies (endpoint usa `createServiceClient`)
