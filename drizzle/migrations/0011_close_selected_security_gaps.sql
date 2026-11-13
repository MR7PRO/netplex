CREATE OR REPLACE FUNCTION public.assign_default_role()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.auctions_guard_outcome()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.current_bid_ils := NULL; NEW.bid_count := 0; NEW.winner_user_id := NULL;
    ELSIF NEW.current_bid_ils IS DISTINCT FROM OLD.current_bid_ils
       OR NEW.bid_count IS DISTINCT FROM OLD.bid_count
       OR NEW.winner_user_id IS DISTINCT FROM OLD.winner_user_id
       OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
       OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
       OR (OLD.status IN ('ended','cancelled') AND NEW.status IS DISTINCT FROM OLD.status)
       OR (NEW.status = 'ended' AND OLD.status <> 'ended' AND OLD.ends_at > now())
       OR (OLD.bid_count > 0 AND (NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.starting_price_ils IS DISTINCT FROM OLD.starting_price_ils OR NEW.min_increment_ils IS DISTINCT FROM OLD.min_increment_ils)) THEN
      RAISE EXCEPTION 'غير مسموح بتعديل نتيجة المزاد';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auctions_guard_outcome ON public.auctions;
CREATE TRIGGER trg_auctions_guard_outcome BEFORE INSERT OR UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auctions_guard_outcome();

CREATE OR REPLACE FUNCTION public.increment_listing_view(listing_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); v_lid uuid := listing_id;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.listings l WHERE l.id = v_lid AND l.seller_id = public.get_seller_id(v_uid)) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.listing_events e WHERE e.listing_id = v_lid AND e.user_id = v_uid
             AND e.event_type = 'view' AND e.created_at > now() - interval '24 hours') THEN RETURN; END IF;
  INSERT INTO public.listing_events (listing_id, event_type, user_id)
    SELECT l.id, 'view', v_uid FROM public.listings l WHERE l.id = v_lid AND l.status = 'available';
  IF FOUND THEN
    UPDATE public.listings SET view_count = COALESCE(view_count, 0) + 1 WHERE id = v_lid;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO authenticated;