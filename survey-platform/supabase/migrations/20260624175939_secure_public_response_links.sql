ALTER TABLE public_response_links
  ADD COLUMN IF NOT EXISTS access_key_hash TEXT;

ALTER TABLE public_response_links
  ADD CONSTRAINT public_response_links_access_key_hash_length
  CHECK (access_key_hash IS NULL OR length(access_key_hash) = 64);

CREATE INDEX IF NOT EXISTS idx_public_response_links_access_key_hash
  ON public_response_links(access_key_hash)
  WHERE access_key_hash IS NOT NULL;
