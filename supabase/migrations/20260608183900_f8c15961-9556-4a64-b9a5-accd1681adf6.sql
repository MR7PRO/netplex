
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_url text;

DROP VIEW IF EXISTS public.sellers_public;
CREATE VIEW public.sellers_public AS
SELECT id, user_id, type, shop_name, verified, trust_score, region, bio, logo_url, cover_url, created_at, updated_at
FROM public.sellers;

GRANT SELECT ON public.sellers_public TO anon, authenticated;
