# Especificação Técnica — Relatórios Avançados

## 1. Estado Atual do Export

O export atual (`/app/api/admin/export/route.ts`) produz um XLSX flat:
- Uma aba, uma linha por sessão
- 8 colunas fixas de metadata + colunas dinâmicas por pergunta
- `scale_sections` exportado como JSON raw (limitação declarada no código)
- Sem filtros — exporta 100% das sessões de um `surveyId`
- Sem NPS calculado, sem médias por eixo
- `school`/`community_id` exportados como IDs opacos

### Schema relevante

```
surveys:           id, slug, title, status, open_date, close_date
survey_communities: survey_id, community_id, status, open_date, close_date
communities:       community_id, nome_escola
response_sessions: id, survey_id, community_id, perfil, nome_responsavel,
                   nome_aluno, serie, school, onda, email, submitted_at
responses:         session_id, question_key, value(JSONB)
questions:         survey_id, order_index, type, key, title
question_options:  question_id, order_index, label, value
```

### Tipos de perguntas e estrutura de `value` (JSONB)

| Tipo | Estrutura |
|------|-----------|
| `nps` | `{ nps: 0-10, participa_bilingue?: "Sim"/"Não" }` |
| `scale` | `{ "0": 1-6, "1": 1-6, ... }` |
| `scale_sections` | `{ secao_key: { "0": 1-6, ... }, ... }` |
| `radio` | `"texto da opção"` |
| `text` | `"texto livre"` |
| `checkbox` | `["opção1", "opção2"]` |

---

## 2. Escopo da Feature

### Entregáveis

1. `GET /api/admin/reports/[surveyId]` — endpoint com filtros (substitui e estende o export atual)
2. `GET /api/admin/reports/compare` — comparativo multi-survey
3. XLSX multi-aba (4-5 abas)
4. Página `/admin/reports` com filtros interativos
5. `lib/report-queries.ts` — queries reutilizáveis
6. `lib/report-xlsx.ts` — builder ExcelJS encapsulado

### O que NÃO muda

- Rota `/api/admin/export` permanece intacta (compatibilidade)
- Sem novas tabelas — apenas índices adicionais via migration
- Autenticação segue o padrão atual

---

## 3. Filtros da UI

### Parâmetros de query do endpoint

| Parâmetro | Tipo | Default |
|-----------|------|---------|
| `surveyId` | UUID | obrigatório |
| `communityIds` | string[] (vírgula) | todos |
| `perfil` | `"aluno" \| "responsavel" \| "todos"` | todos |
| `serieIds` | string[] | todos |
| `dateFrom` | ISO date | sem filtro |
| `dateTo` | ISO date | sem filtro |
| `onda` | string | todos |
| `format` | `"xlsx" \| "json"` | xlsx |
| `report` | `"full" \| "nps" \| "scale" \| "summary"` | full |

### Componentes da página

```
app/admin/reports/page.tsx (Server Component)
  └── ReportsClient.tsx (Client Component)
       ├── SurveySelector
       ├── FilterPanel (comunidades, perfil, período, série, onda)
       ├── ExportButton (href dinâmico → download)
       ├── PreviewButton (format=json → painel)
       └── PreviewPanel
```

---

## 4. Queries SQL

### Query base com filtros (padrão para todos os endpoints)

Via encadeamento Supabase JS (`.eq()`, `.in()`, `.gte()`, `.lte()`) ou RPC para as queries com CTEs.

### RPC: NPS breakdown com filtros

```sql
CREATE OR REPLACE FUNCTION rpc_nps_breakdown(
  p_survey_id      UUID,
  p_community_ids  TEXT[]      DEFAULT NULL,
  p_perfil         TEXT        DEFAULT 'todos',
  p_serie_ids      TEXT[]      DEFAULT NULL,
  p_date_from      TIMESTAMPTZ DEFAULT NULL,
  p_date_to        TIMESTAMPTZ DEFAULT NULL,
  p_onda           TEXT        DEFAULT NULL
) RETURNS TABLE (
  session_id UUID, school TEXT, nome_escola TEXT,
  perfil TEXT, serie TEXT, email TEXT, nome TEXT,
  nps_score INTEGER, categoria TEXT, submitted_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    rs.id,
    rs.school,
    COALESCE(c.nome_escola, rs.school),
    rs.perfil,
    rs.serie,
    rs.email,
    CASE rs.perfil WHEN 'aluno' THEN rs.nome_aluno ELSE rs.nome_responsavel END,
    (r.value->>'nps')::INTEGER,
    CASE
      WHEN (r.value->>'nps')::INTEGER >= 9 THEN 'promotor'
      WHEN (r.value->>'nps')::INTEGER >= 7 THEN 'neutro'
      ELSE 'detrator'
    END,
    rs.submitted_at
  FROM response_sessions rs
  JOIN responses r ON r.session_id = rs.id
  LEFT JOIN communities c ON c.community_id = rs.school
  WHERE rs.survey_id = p_survey_id
    AND r.question_key = 'nps' AND (r.value ? 'nps')
    AND (p_community_ids IS NULL OR rs.school = ANY(p_community_ids))
    AND (p_perfil = 'todos' OR rs.perfil = p_perfil)
    AND (p_serie_ids IS NULL OR rs.serie = ANY(p_serie_ids))
    AND (p_date_from IS NULL OR rs.submitted_at >= p_date_from)
    AND (p_date_to IS NULL OR rs.submitted_at < p_date_to + INTERVAL '1 day')
    AND (p_onda IS NULL OR rs.onda = p_onda)
  ORDER BY (r.value->>'nps')::INTEGER ASC, nome_escola ASC;
$$;
```

### RPC: médias por eixo de escala

```sql
CREATE OR REPLACE FUNCTION rpc_scale_averages(
  p_survey_id UUID,
  -- mesmos filtros que rpc_nps_breakdown
) RETURNS TABLE (
  school TEXT, nome_escola TEXT, eixo TEXT, n_respostas BIGINT, media NUMERIC
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rs.school,
    COALESCE(c.nome_escola, rs.school),
    r.question_key,
    COUNT(*),
    AVG((
      SELECT AVG(v::NUMERIC)
      FROM jsonb_each_text(r.value) kv(k, v)
      WHERE v ~ '^\d+(\.\d+)?$' AND v::NUMERIC > 0
    ))
  FROM response_sessions rs
  JOIN responses r ON r.session_id = rs.id
  LEFT JOIN communities c ON c.community_id = rs.school
  WHERE rs.survey_id = p_survey_id
    AND r.question_key IN ('pedagogico','administrativo','infraestrutura','bilingue')
    -- + filtros
  GROUP BY rs.school, nome_escola, r.question_key;
$$;

GRANT EXECUTE ON FUNCTION rpc_nps_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_scale_averages TO authenticated;
```

### Agrupamentos (calculados em TypeScript)

```typescript
function calcNPS(rows: NpsRow[]): NpsMetrics {
  const promotores  = rows.filter(r => r.nps_score >= 9).length
  const neutros     = rows.filter(r => r.nps_score >= 7 && r.nps_score < 9).length
  const detratores  = rows.filter(r => r.nps_score < 7).length
  const total       = rows.length
  return {
    promotores, neutros, detratores, total,
    nps: total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0
  }
}
```

---

## 5. XLSX Multi-Aba

### Aba 1: Resumo Executivo
- Total respostas, NPS geral, % P/N/D
- Tabela: escola → total respostas
- Tabela: escola → NPS local
- Tabela: eixos → média rede

### Aba 2: NPS Breakdown
Linha por respondente com formatação condicional:
- `promotor` → fundo `#DCFCE7` (verde)
- `neutro` → fundo `#FEF9C3` (amarelo)
- `detrator` → fundo `#FEE2E2` (vermelho)

Colunas: Nome, Email, Escola, Perfil, Série, Onda, Nota NPS, Categoria, Data

### Aba 3: Médias por Eixo
Tabela pivô: linhas = escolas, colunas = eixos (Pedagógico, Administrativo, Infraestrutura, Bilíngue).

Formatação condicional: verde ≥4.5, amarelo 3.5–4.4, vermelho <3.5.

### Aba 4: Respostas Brutas
Idêntica ao export atual, com melhorias:
- `community` resolve `nome_escola` (não ID opaco)
- `scale_sections` expande corretamente
- Coluna adicional: `categoria_nps`

### Aba 5 (condicional): Comparativo Surveys
Só quando `?compare=surveyId1,surveyId2`. Tabela comparativa de NPS entre edições.

---

## 6. Novos Arquivos

```
app/api/admin/reports/[surveyId]/route.ts    ← endpoint principal com filtros
app/api/admin/reports/compare/route.ts       ← comparativo multi-survey
app/admin/reports/page.tsx                   ← Server Component (lista surveys)
app/admin/reports/ReportsClient.tsx          ← Client Component (filtros)
app/admin/reports/actions.ts                 ← getFilterOptions(surveyId)
lib/report-queries.ts                        ← tipos + funções de fetch
lib/report-xlsx.ts                           ← builder ExcelJS multi-aba
supabase/migrations/025_report_functions.sql ← RPCs + índices adicionais
```

### Índices adicionais na migration

```sql
CREATE INDEX IF NOT EXISTS idx_response_sessions_perfil
  ON response_sessions(survey_id, perfil);

CREATE INDEX IF NOT EXISTS idx_response_sessions_serie
  ON response_sessions(survey_id, serie);
```

---

## 7. Refatoração necessária no export atual

Mover de `app/api/admin/export/route.ts` para `lib/report-xlsx.ts`:
- `buildColumnSchema(questions, options)`
- `META_HEADERS` e `getMetaValues()`

Importar de volta no `export/route.ts` — sem quebrar compatibilidade.

---

## 8. Pontos de Atenção

1. **Timeout no Vercel (Hobby):** Surveys com >5k sessões podem exceder 10s. Mitigação: `export const maxDuration = 60` na route (Vercel Pro) ou streaming Response.
2. **`scale_sections` aninhado:** Testar RPC `rpc_scale_averages` com dados reais antes de produção — estrutura do JSONB pode variar.
3. **NPS key variável:** RPC assume `question_key = 'nps'`. Parametrizar com `p_nps_key TEXT DEFAULT 'nps'` para surveys com chave diferente.
4. **`school` vs `community_id`:** Usar `school` para agrupamento (igual ao `responses/page.tsx`). O JOIN é `communities.community_id = response_sessions.school`.
5. **Bilíngue condicional:** Média do eixo `bilingue` só faz sentido para respondentes com `participa_bilingue = "Sim"`. Criar variante da RPC com filtro adicional se necessário.

---

## 9. Sequência de Implementação

**Fase 1 — Foundation:**
1. Criar `025_report_functions.sql` — RPCs + índices
2. Testar RPCs no Supabase Studio
3. Criar `lib/report-queries.ts` com tipos e fetch
4. Refatorar `buildColumnSchema`/`getMetaValues` para fora do `export/route.ts`

**Fase 2 — Backend:**
5. Criar `lib/report-xlsx.ts` com `buildAdvancedXlsx()`
6. Criar `app/api/admin/reports/[surveyId]/route.ts`
7. Testar download via curl com `surveyId` real
8. Criar `app/api/admin/reports/compare/route.ts`

**Fase 3 — UI:**
9. Criar `app/admin/reports/actions.ts` com `getFilterOptions()`
10. Criar `app/admin/reports/page.tsx` + `ReportsClient.tsx`
11. Adicionar link "Relatórios" na sidebar (`layout.tsx`)
12. Implementar PreviewPanel (formato JSON)

**Fase 4 — Polimento:**
13. Formatação condicional de cores no XLSX
14. Aba comparativo entre surveys
