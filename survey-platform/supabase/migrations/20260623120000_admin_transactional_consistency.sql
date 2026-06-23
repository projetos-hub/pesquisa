-- =============================================================
-- 20260623120000_admin_transactional_consistency.sql
-- RPCs transacionais para fluxos admin multi-step.
--
-- DOWN:
--   DROP FUNCTION IF EXISTS public.admin_replace_question_options(uuid, text[]);
--   DROP FUNCTION IF EXISTS public.admin_delete_survey_cascade(uuid);
--   DROP FUNCTION IF EXISTS public.admin_duplicate_survey_template(uuid);
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_replace_question_options(
  p_question_id UUID,
  p_labels TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id = p_question_id) THEN
    RAISE EXCEPTION 'question_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.question_options
  WHERE question_id = p_question_id;

  INSERT INTO public.question_options (question_id, order_index, label, value)
  SELECT
    p_question_id,
    normalized.order_index,
    normalized.label,
    'opt_' || normalized.order_index
  FROM (
    SELECT
      btrim(raw.label) AS label,
      row_number() OVER (ORDER BY raw.ordinality)::INT - 1 AS order_index
    FROM unnest(COALESCE(p_labels, ARRAY[]::TEXT[])) WITH ORDINALITY AS raw(label, ordinality)
    WHERE btrim(raw.label) <> ''
  ) AS normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_survey_cascade(
  p_survey_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.surveys WHERE id = p_survey_id) THEN
    RAISE EXCEPTION 'survey_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.responses
  WHERE session_id IN (
    SELECT id FROM public.response_sessions WHERE survey_id = p_survey_id
  );

  DELETE FROM public.response_sessions
  WHERE survey_id = p_survey_id;

  DELETE FROM public.surveys
  WHERE id = p_survey_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_duplicate_survey_template(
  p_survey_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_original public.surveys%ROWTYPE;
  v_new_survey_id UUID;
  v_clean_base TEXT;
  v_candidate_slug TEXT;
  v_attempt INT := 0;
  v_question RECORD;
  v_new_question_id UUID;
BEGIN
  SELECT *
  INTO v_original
  FROM public.surveys
  WHERE id = p_survey_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'survey_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_clean_base := regexp_replace(v_original.slug, '-copia(-[0-9]+)?$', '');

  LOOP
    v_candidate_slug := CASE
      WHEN v_attempt = 0 THEN v_clean_base || '-copia'
      ELSE v_clean_base || '-copia-' || v_attempt
    END;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.surveys WHERE slug = v_candidate_slug
    );

    v_attempt := v_attempt + 1;

    IF v_attempt >= 100 THEN
      v_candidate_slug := v_clean_base || '-copia-' || extract(epoch FROM clock_timestamp())::BIGINT;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.surveys (
    title,
    slug,
    description,
    survey_type,
    target_roles,
    access_control,
    settings,
    status
  )
  VALUES (
    v_original.title || ' (copia)',
    v_candidate_slug,
    v_original.description,
    v_original.survey_type,
    v_original.target_roles,
    COALESCE(v_original.access_control, 'aberta'),
    COALESCE(v_original.settings, '{}'::jsonb),
    'rascunho'
  )
  RETURNING id INTO v_new_survey_id;

  FOR v_question IN
    SELECT *
    FROM public.questions
    WHERE survey_id = p_survey_id
    ORDER BY order_index ASC
  LOOP
    INSERT INTO public.questions (
      survey_id,
      order_index,
      type,
      key,
      title,
      description,
      required,
      only_for_roles,
      conditional_on,
      settings
    )
    VALUES (
      v_new_survey_id,
      v_question.order_index,
      v_question.type,
      v_question.key,
      v_question.title,
      v_question.description,
      v_question.required,
      v_question.only_for_roles,
      v_question.conditional_on,
      COALESCE(v_question.settings, '{}'::jsonb)
    )
    RETURNING id INTO v_new_question_id;

    INSERT INTO public.question_options (
      question_id,
      order_index,
      label,
      value,
      section_key,
      section_title
    )
    SELECT
      v_new_question_id,
      order_index,
      label,
      value,
      section_key,
      section_title
    FROM public.question_options
    WHERE question_id = v_question.id
    ORDER BY order_index ASC;
  END LOOP;

  RETURN v_new_survey_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_replace_question_options(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_survey_cascade(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_duplicate_survey_template(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_replace_question_options(UUID, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_survey_cascade(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_survey_template(UUID) TO service_role;
