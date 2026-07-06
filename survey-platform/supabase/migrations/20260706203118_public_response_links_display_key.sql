ALTER TABLE public_response_links
  ADD COLUMN IF NOT EXISTS access_key TEXT;

ALTER TABLE public_response_links
  ADD CONSTRAINT public_response_links_access_key_length
  CHECK (access_key IS NULL OR length(access_key) >= 24);