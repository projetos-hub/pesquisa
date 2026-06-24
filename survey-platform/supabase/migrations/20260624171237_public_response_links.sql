CREATE TABLE IF NOT EXISTS public_response_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE CHECK (length(token) >= 32),
  label       TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  include_pii BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_public_response_links_survey_id
  ON public_response_links(survey_id);

CREATE INDEX IF NOT EXISTS idx_public_response_links_token_enabled
  ON public_response_links(token, enabled);

ALTER TABLE public_response_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_response_links_admin_read" ON public_response_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "public_response_links_admin_insert" ON public_response_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "public_response_links_admin_update" ON public_response_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "public_response_links_admin_delete" ON public_response_links
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = (SELECT auth.uid()))
  );

CREATE TRIGGER update_public_response_links_updated_at
  BEFORE UPDATE ON public_response_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
