-- Atomic claim support for personalized dispatch jobs processed by cron.
-- Prevents two concurrent cron executions from processing the same sending job.

ALTER TABLE public.survey_dispatch_jobs
  ADD COLUMN IF NOT EXISTS lock_token UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_sending_claim
  ON public.survey_dispatch_jobs (locked_until, created_at)
  WHERE status = 'sending';

CREATE OR REPLACE FUNCTION public.claim_sending_dispatch_jobs(
  p_limit INT DEFAULT 15,
  p_lock_seconds INT DEFAULT 240
)
RETURNS TABLE (
  id UUID,
  dispatch_id UUID,
  community_id TEXT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_token UUID := gen_random_uuid();
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT j.id
    FROM public.survey_dispatch_jobs j
    JOIN public.survey_dispatches d ON d.id = j.dispatch_id
    WHERE d.status = 'sending'
      AND d.personalized = true
      AND j.status = 'sending'
      AND (j.total_users IS NULL OR j.processed_users < j.total_users)
      AND (j.locked_until IS NULL OR j.locked_until < NOW())
    ORDER BY j.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(p_limit, 0)
  ),
  claimed AS (
    UPDATE public.survey_dispatch_jobs j
       SET lock_token = v_token,
           locked_at = NOW(),
           locked_until = NOW() + make_interval(secs => GREATEST(p_lock_seconds, 30))
      FROM candidates c
     WHERE j.id = c.id
     RETURNING j.id, j.dispatch_id, j.community_id
  )
  SELECT claimed.id, claimed.dispatch_id, claimed.community_id
  FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_sending_dispatch_jobs(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_sending_dispatch_jobs(INT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_sending_dispatch_jobs(INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sending_dispatch_jobs(INT, INT) TO service_role;
