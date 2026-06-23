-- Harden findings from Supabase security advisors.

-- comunicados is exposed through the public schema. The Layers endpoint serves
-- only published and approved records, so the Data API should enforce the same
-- visibility if called directly with anon/authenticated keys.
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comunicados_public_read_published" ON public.comunicados;
CREATE POLICY "comunicados_public_read_published"
  ON public.comunicados
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND approved = true);

-- Keep writes restricted to service_role/table owners by not creating public
-- INSERT/UPDATE/DELETE policies.

-- Trigger functions should not inherit caller-controlled search_path.
ALTER FUNCTION public.update_comunicados_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;

-- trigger_dispatch_processor was created manually for pg_cron. It should not be
-- callable through PostgREST by anon/authenticated users.
REVOKE EXECUTE ON FUNCTION public.trigger_dispatch_processor()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.trigger_dispatch_processor()
  TO service_role;

ALTER FUNCTION public.trigger_dispatch_processor()
  SET search_path = public, extensions;
