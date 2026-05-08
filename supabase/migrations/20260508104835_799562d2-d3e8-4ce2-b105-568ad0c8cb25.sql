
-- ============ FOLLOW SELLERS ============
CREATE TABLE public.seller_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, seller_id)
);

CREATE INDEX idx_seller_follows_follower ON public.seller_follows(follower_id);
CREATE INDEX idx_seller_follows_seller ON public.seller_follows(seller_id);

ALTER TABLE public.seller_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can follow sellers"
  ON public.seller_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.seller_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

CREATE POLICY "View own follows or own followers"
  ON public.seller_follows FOR SELECT
  TO authenticated
  USING (
    auth.uid() = follower_id
    OR seller_id = public.get_seller_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

-- ============ AUTO-NEGOTIATE ============
ALTER TABLE public.listings
  ADD COLUMN auto_accept_price numeric,
  ADD COLUMN auto_reject_price numeric;

CREATE OR REPLACE FUNCTION public.handle_offer_auto_negotiate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accept numeric;
  v_reject numeric;
BEGIN
  SELECT auto_accept_price, auto_reject_price
    INTO v_accept, v_reject
  FROM public.listings WHERE id = NEW.listing_id;

  IF v_accept IS NOT NULL AND NEW.offer_price_ils >= v_accept THEN
    NEW.status := 'accepted';
  ELSIF v_reject IS NOT NULL AND NEW.offer_price_ils < v_reject THEN
    NEW.status := 'rejected';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offers_auto_negotiate
  BEFORE INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_offer_auto_negotiate();

-- ============ NOTIFY FOLLOWERS ON NEW LISTING ============
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_name text;
BEGIN
  IF NEW.status <> 'available' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(shop_name, 'متجر') INTO v_shop_name
  FROM public.sellers WHERE id = NEW.seller_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  SELECT
    sf.follower_id,
    'followed_seller_new_listing',
    'منتج جديد من ' || v_shop_name,
    NEW.title,
    '/listing/' || NEW.id,
    jsonb_build_object('listing_id', NEW.id, 'seller_id', NEW.seller_id)
  FROM public.seller_follows sf
  WHERE sf.seller_id = NEW.seller_id
    AND sf.follower_id IS NOT NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_followers_new_listing
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_on_new_listing();
