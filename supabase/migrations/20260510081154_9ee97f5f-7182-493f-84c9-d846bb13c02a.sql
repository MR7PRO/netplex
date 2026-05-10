
CREATE TABLE public.saved_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  query_text text,
  category_slug text,
  region text,
  brand text,
  model text,
  condition text,
  min_price numeric,
  max_price numeric,
  alerts_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX idx_saved_searches_alerts ON public.saved_searches(alerts_enabled) WHERE alerts_enabled = true;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved searches"
  ON public.saved_searches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own saved searches"
  ON public.saved_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own saved searches"
  ON public.saved_searches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own saved searches"
  ON public.saved_searches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_saved_searches_updated
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: notify users when a new listing matches their saved search
CREATE OR REPLACE FUNCTION public.notify_saved_search_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_slug text;
BEGIN
  IF NEW.status <> 'available' THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_category_slug FROM public.categories WHERE id = NEW.category_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  SELECT
    ss.user_id,
    'saved_search_match',
    'منتج جديد يطابق بحثك: ' || ss.title,
    NEW.title || ' — ₪' || NEW.price_ils,
    '/listing/' || NEW.id,
    jsonb_build_object('listing_id', NEW.id, 'saved_search_id', ss.id)
  FROM public.saved_searches ss
  WHERE ss.alerts_enabled = true
    AND (ss.query_text IS NULL OR ss.query_text = '' 
         OR NEW.title ILIKE '%' || ss.query_text || '%'
         OR COALESCE(NEW.brand,'') ILIKE '%' || ss.query_text || '%'
         OR COALESCE(NEW.model,'') ILIKE '%' || ss.query_text || '%')
    AND (ss.category_slug IS NULL OR ss.category_slug = '' OR ss.category_slug = v_category_slug)
    AND (ss.region IS NULL OR ss.region = '' OR ss.region = NEW.region)
    AND (ss.brand IS NULL OR ss.brand = '' OR LOWER(ss.brand) = LOWER(COALESCE(NEW.brand,'')))
    AND (ss.model IS NULL OR ss.model = '' OR LOWER(ss.model) = LOWER(COALESCE(NEW.model,'')))
    AND (ss.condition IS NULL OR ss.condition = '' OR ss.condition = NEW.condition::text)
    AND (ss.min_price IS NULL OR NEW.price_ils >= ss.min_price)
    AND (ss.max_price IS NULL OR NEW.price_ils <= ss.max_price)
    AND ss.user_id IS NOT NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_saved_search
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_saved_search_matches();
