-- 026_report_functions.sql
-- Relatórios Avançados: RPCs + índices adicionais
--
-- NOTA: scale vs scale_sections (verificado em 2026-06-02)
--   pedagogico / administrativo / infraestrutura → type=scale
--     value = { "Label texto": score_int }  (chaves são labels literais)
--   bilingue → type=scale_sections
--     value = { section_key: { "0": score, "1": score, ... } }  (nested)
--   A rpc_scale_averages trata cada tipo separadamente.

-- ─── Índices adicionais ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_response_sessions_perfil
  ON response_sessions(survey_id, perfil);

CREATE INDEX IF NOT EXISTS idx_response_sessions_serie
  ON response_sessions(survey_id, serie);

CREATE INDEX IF NOT EXISTS idx_response_sessions_onda
  ON response_sessions(survey_id, onda);

-- ─── RPC: NPS Breakdown ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_nps_breakdown(
  p_survey_id     UUID,
  p_community_ids TEXT[]      DEFAULT NULL,
  p_perfil        TEXT        DEFAULT 'todos',
  p_serie_ids     TEXT[]      DEFAULT NULL,
  p_date_from     TIMESTAMPTZ DEFAULT NULL,
  p_date_to       TIMESTAMPTZ DEFAULT NULL,
  p_onda          TEXT        DEFAULT NULL,
  p_nps_key       TEXT        DEFAULT 'nps'
) RETURNS TABLE (
  session_id   UUID,
  school       TEXT,
  nome_escola  TEXT,
  perfil       TEXT,
  serie        TEXT,
  email        TEXT,
  nome         TEXT,
  nps_score    INTEGER,
  categoria    TEXT,
  submitted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rs.id,
    rs.school,
    COALESCE(c.nome_escola, rs.school),
    rs.perfil,
    rs.serie,
    rs.email,
    CASE rs.perfil
      WHEN 'aluno' THEN rs.nome_aluno
      ELSE rs.nome_responsavel
    END,
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
    AND r.question_key = p_nps_key
    AND (r.value ? 'nps')
    AND (p_community_ids IS NULL OR rs.school = ANY(p_community_ids))
    AND (p_perfil = 'todos' OR rs.perfil = p_perfil)
    AND (p_serie_ids IS NULL OR rs.serie = ANY(p_serie_ids))
    AND (p_date_from IS NULL OR rs.submitted_at >= p_date_from)
    AND (p_date_to   IS NULL OR rs.submitted_at < p_date_to + INTERVAL '1 day')
    AND (p_onda      IS NULL OR rs.onda = p_onda)
  ORDER BY (r.value->>'nps')::INTEGER ASC, COALESCE(c.nome_escola, rs.school) ASC;
$$;

GRANT EXECUTE ON FUNCTION rpc_nps_breakdown(UUID, TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT)
  TO authenticated;

-- ─── RPC: Scale Averages ───────────────────────────────────────────────────
-- Calcula médias por eixo de escala (type=scale e type=scale_sections).
-- Para scale: extrai todos os valores numéricos do JSONB flat { "label": score }.
-- Para scale_sections (bilingue): achata as seções aninhadas antes de calcular.
CREATE OR REPLACE FUNCTION rpc_scale_averages(
  p_survey_id     UUID,
  p_community_ids TEXT[]      DEFAULT NULL,
  p_perfil        TEXT        DEFAULT 'todos',
  p_serie_ids     TEXT[]      DEFAULT NULL,
  p_date_from     TIMESTAMPTZ DEFAULT NULL,
  p_date_to       TIMESTAMPTZ DEFAULT NULL,
  p_onda          TEXT        DEFAULT NULL
) RETURNS TABLE (
  school      TEXT,
  nome_escola TEXT,
  eixo        TEXT,
  n_respostas BIGINT,
  media       NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Scale simples: pedagogico, administrativo, infraestrutura
  -- value = { "label": int_score }  →  extrai valores numéricos diretamente
  SELECT
    rs.school,
    COALESCE(c.nome_escola, rs.school) AS nome_escola,
    r.question_key,
    COUNT(*),
    AVG((
      SELECT AVG(v::NUMERIC)
      FROM jsonb_each_text(r.value) kv(k, v)
      WHERE v ~ '^[0-9]+(\.[0-9]+)?$' AND v::NUMERIC > 0
    ))
  FROM response_sessions rs
  JOIN responses r ON r.session_id = rs.id
  LEFT JOIN communities c ON c.community_id = rs.school
  WHERE rs.survey_id = p_survey_id
    AND r.question_key IN ('pedagogico', 'administrativo', 'infraestrutura')
    AND (p_community_ids IS NULL OR rs.school = ANY(p_community_ids))
    AND (p_perfil = 'todos' OR rs.perfil = p_perfil)
    AND (p_serie_ids IS NULL OR rs.serie = ANY(p_serie_ids))
    AND (p_date_from IS NULL OR rs.submitted_at >= p_date_from)
    AND (p_date_to   IS NULL OR rs.submitted_at < p_date_to + INTERVAL '1 day')
    AND (p_onda      IS NULL OR rs.onda = p_onda)
  GROUP BY rs.school, COALESCE(c.nome_escola, rs.school), r.question_key

  UNION ALL

  -- scale_sections (bilingue): value = { section_key: { "0": score, ... } }
  -- Achata dois níveis antes de calcular média
  SELECT
    rs.school,
    COALESCE(c.nome_escola, rs.school) AS nome_escola,
    r.question_key,
    COUNT(*),
    AVG((
      SELECT AVG(inner_v::NUMERIC)
      FROM jsonb_each(r.value) outer_kv(outer_k, section_val)
      JOIN LATERAL jsonb_each_text(section_val) inner_kv(inner_k, inner_v) ON TRUE
      WHERE jsonb_typeof(section_val) = 'object'
        AND inner_v ~ '^[0-9]+(\.[0-9]+)?$'
        AND inner_v::NUMERIC > 0
    ))
  FROM response_sessions rs
  JOIN responses r ON r.session_id = rs.id
  LEFT JOIN communities c ON c.community_id = rs.school
  WHERE rs.survey_id = p_survey_id
    AND r.question_key = 'bilingue'
    AND (p_community_ids IS NULL OR rs.school = ANY(p_community_ids))
    AND (p_perfil = 'todos' OR rs.perfil = p_perfil)
    AND (p_serie_ids IS NULL OR rs.serie = ANY(p_serie_ids))
    AND (p_date_from IS NULL OR rs.submitted_at >= p_date_from)
    AND (p_date_to   IS NULL OR rs.submitted_at < p_date_to + INTERVAL '1 day')
    AND (p_onda      IS NULL OR rs.onda = p_onda)
  GROUP BY rs.school, COALESCE(c.nome_escola, rs.school), r.question_key;
$$;

GRANT EXECUTE ON FUNCTION rpc_scale_averages(UUID, TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
  TO authenticated;
