# Especificação Técnica — Analytics Dashboard

## Sumário Executivo

O Analytics Dashboard é uma seção nova dentro de `/admin/analytics/` que adiciona visão analítica sobre os dados de pesquisa CSAT já coletados. Reutiliza a infraestrutura de autenticação, o layout sidebar e os clientes Supabase existentes. Não altera tabelas — apenas adiciona rotas de API e páginas de visualização.

---

## 1. O Que Já Existe (Reuso Integral)

**Infraestrutura compartilhada (não tocar):**
- `lib/supabase-server.ts` — `createServerSupabaseClient()` para RSC e route handlers autenticados
- `lib/supabase-service.ts` — `createServiceClient()` para queries sem RLS (usar nas novas API routes)
- `app/admin/layout.tsx` — sidebar com nav items; adicionar entrada "Analytics" aqui
- `lib/community-mapping.ts` — mapa de nomes de escola

**Lógica reutilizável dos routes existentes:**
- `app/api/admin/audit/timeline/route.ts` — agrupamento por hora com ajuste UTC-3; reutilizar lógica no novo endpoint de série temporal
- `app/api/admin/audit/overview/route.ts` — cálculo de `sync_rate` e `school_breakdown`; o dashboard generaliza isso
- `app/admin/surveys/[id]/responses/page.tsx` — função `avg()` para médias de escala e `npsClass()`; extrair para utilitário compartilhado

**Schema que o dashboard consome (sem alterações):**

```
response_sessions: id, survey_id, community_id, perfil, school, onda,
                   submitted_at, synced_to_sheets, email, layers_meta
responses:         session_id, question_key, value (JSONB)
survey_communities: survey_id, community_id, status, theme, active
survey_dispatches:  survey_id, status, total_jobs, completed_jobs, created_at
survey_dispatch_jobs: dispatch_id, community_id, status
notification_audit_logs: dispatch_id, email, status, sent_at
communities:       community_id, nome_escola
surveys:           id, title, slug, status, open_date, close_date
```

**Índices já existentes (relevantes):**
- `idx_response_sessions_submitted_at` (024_audit_indexes.sql)
- `idx_response_sessions_school_survey` on `(survey_id, school)` (024)
- `idx_response_sessions_onda` on `(survey_id, onda)` (024)
- `idx_audit_dispatch_id` on `notification_audit_logs(dispatch_id)` (011)

---

## 2. Novas Rotas

### Páginas (App Router — Server Components)

```
app/admin/analytics/
  page.tsx                        ← selector de survey + cards de rede
  [surveyId]/
    page.tsx                      ← redirect para /overview
    layout.tsx                    ← sub-nav com abas
    overview/page.tsx             ← visão geral + KPIs
    timeline/page.tsx             ← evolução temporal
    communities/page.tsx          ← comparativo entre comunidades
    breakdown/page.tsx            ← perfil responsável vs aluno
    funnel/page.tsx               ← funil disparo → resposta
```

### API Routes

```
app/api/admin/analytics/
  summary/route.ts                ← GET  ?surveyId=
  timeline/route.ts               ← GET  ?surveyId=&granularity=day|week
  communities/route.ts            ← GET  ?surveyId=
  breakdown/route.ts              ← GET  ?surveyId=
  funnel/route.ts                 ← GET  ?surveyId=
```

Todos os route handlers:
1. `createServerSupabaseClient()` → verificar auth
2. `createServiceClient()` → query de dados (bypass RLS)
3. `Response.json()`

---

## 3. Queries SQL por Endpoint

### `/api/admin/analytics/summary`

```sql
-- NPS médio
WITH nps_scores AS (
  SELECT (rs.value->>'nps')::int AS score
  FROM response_sessions ses
  JOIN responses rs ON rs.session_id = ses.id
  WHERE ses.survey_id = $survey_id
    AND rs.question_key = 'nps'
    AND rs.value->>'nps' IS NOT NULL
),
categorized AS (
  SELECT
    COUNT(*) FILTER (WHERE score >= 9) AS promotores,
    COUNT(*) FILTER (WHERE score BETWEEN 7 AND 8) AS neutros,
    COUNT(*) FILTER (WHERE score <= 6) AS detratores,
    COUNT(*) AS total
  FROM nps_scores
)
SELECT promotores, neutros, detratores, total,
  CASE WHEN total > 0
    THEN ROUND(((promotores - detratores)::numeric / total) * 100, 1)
    ELSE NULL
  END AS nps_score
FROM categorized;

-- Total de sessões por perfil
SELECT COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE perfil = 'responsavel') AS total_responsaveis,
  COUNT(*) FILTER (WHERE perfil = 'aluno') AS total_alunos
FROM response_sessions WHERE survey_id = $survey_id;

-- Comunidades ativas e com resposta
SELECT
  COUNT(DISTINCT sc.community_id) AS comunidades_ativas,
  COUNT(DISTINCT ses.community_id) AS comunidades_com_resposta
FROM survey_communities sc
LEFT JOIN response_sessions ses
  ON ses.community_id = sc.community_id AND ses.survey_id = sc.survey_id
WHERE sc.survey_id = $survey_id AND sc.status = 'ativa';
```

**Resposta:**
```typescript
interface SummaryResponse {
  total_sessions: number; total_responsaveis: number; total_alunos: number
  nps_score: number | null; promotores: number; neutros: number; detratores: number
  comunidades_ativas: number; comunidades_com_resposta: number
}
```

### `/api/admin/analytics/timeline`

```sql
SELECT
  date_trunc($granularity, submitted_at AT TIME ZONE 'America/Sao_Paulo')::date AS period,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE perfil = 'responsavel') AS responsaveis,
  COUNT(*) FILTER (WHERE perfil = 'aluno') AS alunos
FROM response_sessions
WHERE survey_id = $survey_id
GROUP BY 1 ORDER BY 1 ASC;
```

### `/api/admin/analytics/communities`

```sql
WITH nps_by_community AS (
  SELECT ses.school AS community_id,
    COUNT(DISTINCT ses.id) AS total_sessions,
    COUNT(*) FILTER (WHERE (rs.value->>'nps')::int >= 9) AS promotores,
    COUNT(*) FILTER (WHERE (rs.value->>'nps')::int BETWEEN 7 AND 8) AS neutros,
    COUNT(*) FILTER (WHERE (rs.value->>'nps')::int <= 6) AS detratores,
    COUNT(rs.id) FILTER (WHERE rs.question_key = 'nps' AND rs.value->>'nps' IS NOT NULL) AS total_nps
  FROM response_sessions ses
  LEFT JOIN responses rs ON rs.session_id = ses.id AND rs.question_key = 'nps'
  WHERE ses.survey_id = $survey_id GROUP BY ses.school
)
SELECT n.*, COALESCE(c.nome_escola, n.community_id) AS nome_escola,
  CASE WHEN n.total_nps > 0
    THEN ROUND(((n.promotores - n.detratores)::numeric / n.total_nps) * 100, 1)
    ELSE NULL END AS nps_score
FROM nps_by_community n
LEFT JOIN communities c ON c.community_id = n.community_id
ORDER BY n.total_sessions DESC;
```

> **Nota:** Médias de escala calculadas em TypeScript (padrão do projeto — não usar SQL para JSONB aninhado).

### `/api/admin/analytics/breakdown`

```sql
SELECT perfil, COUNT(*) AS total,
  COUNT(rs.id) FILTER (WHERE rs.question_key = 'nps' AND rs.value->>'nps' IS NOT NULL) AS total_com_nps
FROM response_sessions ses
LEFT JOIN responses rs ON rs.session_id = ses.id AND rs.question_key = 'nps'
WHERE ses.survey_id = $survey_id GROUP BY perfil;
```

### `/api/admin/analytics/funnel`

```sql
SELECT sd.id, sd.title, sd.created_at, sd.status,
  COUNT(nal.id) FILTER (WHERE nal.status = 'sent') AS notificados,
  COUNT(nal.id) FILTER (WHERE nal.status = 'failed') AS falhos
FROM survey_dispatches sd
LEFT JOIN notification_audit_logs nal ON nal.dispatch_id = sd.id
WHERE sd.survey_id = $survey_id AND sd.status IN ('sent', 'partial_failure')
GROUP BY sd.id ORDER BY sd.created_at DESC;

SELECT COUNT(DISTINCT id) AS total_respondentes
FROM response_sessions WHERE survey_id = $survey_id;
```

---

## 4. Estrutura de Componentes

```
components/analytics/
  KpiCard.tsx              ← label, value, subtext, color
  NpsGauge.tsx             ← NPS -100/+100 + barras P/N/D em flexbox CSS
  TimelineChart.tsx        ← SVG polyline simples, toggle dia/semana
  CommunityTable.tsx       ← tabela ordenável por NPS/total/médias
  PerfilBreakdown.tsx      ← dois cards lado a lado responsável vs aluno
  FunnelViz.tsx            ← 3 etapas: Notificados → Abriram → Responderam
```

> **Restrição:** sem biblioteca de charts — usar SVG simples e CSS (padrão do projeto).

---

## 5. Modificações em Arquivos Existentes

### `app/admin/layout.tsx`
```tsx
<Link href="/admin/analytics">
  <span>📈</span> Analytics
</Link>
```

### Novo `lib/analytics-utils.ts`

Centralizar lógica duplicada em `responses/page.tsx` e `export/route.ts`:
```typescript
export function avgFromJsonbScore(value: unknown): number | null
export function calcNpsScore(scores: number[]): number
export function npsCategory(score: number): 'promotor' | 'neutro' | 'detrator'
export function formatDateBR(iso: string): string
```

---

## 6. Nenhuma Migration Necessária

Todos os índices necessários já existem (024_audit_indexes.sql, 011_phase8).

---

## 7. Pontos de Atenção

- **Cálculo de NPS:** formula `(promotores - detratores) / total * 100`. Não confundir com `sync_rate` que já existe no audit.
- **`school` vs `community_id`:** usar `school` para agrupar (igual ao `audit/timeline`). JOIN `communities.community_id = response_sessions.school`.
- **Médias de escala em JS:** não SQL para JSONB aninhado — padrão estabelecido do projeto.
- **`AT TIME ZONE 'America/Sao_Paulo'`:** usar no SQL em vez do ajuste manual de -3h em JS.
- **Performance:** para surveys >10k respostas, avaliar materialização de scores NPS.

---

## 8. Árvore Final (23 arquivos: 5 routes, 7 páginas, 6 componentes, 1 utilitário, 1 modificação + 2 redirects/layouts)

```
app/admin/layout.tsx                              [MODIFICAR]
app/admin/analytics/page.tsx                      [NOVO]
app/admin/analytics/[surveyId]/layout.tsx         [NOVO]
app/admin/analytics/[surveyId]/page.tsx           [NOVO — redirect]
app/admin/analytics/[surveyId]/overview/page.tsx  [NOVO]
app/admin/analytics/[surveyId]/timeline/page.tsx  [NOVO]
app/admin/analytics/[surveyId]/communities/page.tsx [NOVO]
app/admin/analytics/[surveyId]/breakdown/page.tsx [NOVO]
app/admin/analytics/[surveyId]/funnel/page.tsx    [NOVO]
app/api/admin/analytics/summary/route.ts          [NOVO]
app/api/admin/analytics/timeline/route.ts         [NOVO]
app/api/admin/analytics/communities/route.ts      [NOVO]
app/api/admin/analytics/breakdown/route.ts        [NOVO]
app/api/admin/analytics/funnel/route.ts           [NOVO]
components/analytics/KpiCard.tsx                  [NOVO]
components/analytics/NpsGauge.tsx                 [NOVO]
components/analytics/TimelineChart.tsx            [NOVO]
components/analytics/CommunityTable.tsx           [NOVO]
components/analytics/PerfilBreakdown.tsx          [NOVO]
components/analytics/FunnelViz.tsx                [NOVO]
lib/analytics-utils.ts                            [NOVO]
```
