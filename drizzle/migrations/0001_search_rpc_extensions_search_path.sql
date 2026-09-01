ALTER FUNCTION public.search_listings_ranked(text,text,text,text[],text,text,numeric,numeric,text,integer,integer)
  SET search_path = public, extensions;

-- Recreate trigram/FTS indexes with schema-qualified operator classes if needed (no-op if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_listings_title_trgm') THEN
    EXECUTE 'CREATE INDEX idx_listings_title_trgm ON public.listings USING gin (title extensions.gin_trgm_ops)';
  END IF;
END $$;