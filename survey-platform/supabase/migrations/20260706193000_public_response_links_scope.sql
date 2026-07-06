ALTER TABLE public_response_links
  ADD COLUMN IF NOT EXISTS scope JSONB NOT NULL DEFAULT '{"type":"all","brandNames":[],"communityIds":[]}';

DO $$
BEGIN
  ALTER TABLE public_response_links
    ADD CONSTRAINT public_response_links_scope_object
    CHECK (jsonb_typeof(scope) = 'object');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;