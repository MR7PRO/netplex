
-- ============ AUCTIONS ============
CREATE TYPE public.auction_status AS ENUM ('scheduled','active','ended','cancelled');

CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE UNIQUE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  starting_price_ils numeric NOT NULL CHECK (starting_price_ils >= 0),
  current_bid_ils numeric,
  min_increment_ils numeric NOT NULL DEFAULT 10 CHECK (min_increment_ils > 0),
  bid_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  winner_user_id uuid,
  status auction_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auctions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auctions are viewable by everyone" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Sellers can create their auctions" ON public.auctions FOR INSERT TO authenticated
  WITH CHECK (seller_id = public.get_seller_id(auth.uid()));
CREATE POLICY "Sellers can update their auctions" ON public.auctions FOR UPDATE TO authenticated
  USING (seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Sellers can delete their auctions" ON public.auctions FOR DELETE TO authenticated
  USING (seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_auctions_updated BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BIDS ============
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ils numeric NOT NULL CHECK (amount_ils > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_auction ON public.bids(auction_id, created_at DESC);

GRANT SELECT ON public.bids TO anon, authenticated;
GRANT INSERT ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bids are viewable by everyone" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Users can place their own bids" ON public.bids FOR INSERT TO authenticated
  WITH CHECK (bidder_id = auth.uid());

-- Function to place a bid safely
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  a RECORD;
  v_min numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'يجب تسجيل الدخول');
  END IF;
  SELECT * INTO a FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'المزاد غير موجود'); END IF;
  IF a.status <> 'active' OR a.ends_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'المزاد منتهي');
  END IF;
  IF a.seller_id = public.get_seller_id(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ما بتقدر تزايد على منتجك');
  END IF;
  v_min := COALESCE(a.current_bid_ils, a.starting_price_ils - a.min_increment_ils) + a.min_increment_ils;
  IF p_amount < v_min THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الحد الأدنى للمزايدة ₪' || v_min);
  END IF;
  INSERT INTO public.bids(auction_id, bidder_id, amount_ils) VALUES (p_auction_id, v_uid, p_amount);
  UPDATE public.auctions
    SET current_bid_ils = p_amount, bid_count = bid_count + 1, winner_user_id = v_uid, updated_at = now()
    WHERE id = p_auction_id;
  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END; $$;

-- ============ DEALS / ESCROW ============
CREATE TYPE public.deal_status AS ENUM ('pending','shipped','delivered','completed','cancelled','disputed');

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_price_ils numeric NOT NULL CHECK (agreed_price_ils >= 0),
  status deal_status NOT NULL DEFAULT 'pending',
  seller_confirmed_shipped_at timestamptz,
  buyer_confirmed_received_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view their deals" ON public.deals FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Buyer or seller can create deal" ON public.deals FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() OR seller_id = public.get_seller_id(auth.uid()));
CREATE POLICY "Parties can update their deals" ON public.deals FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-complete when both confirm
CREATE OR REPLACE FUNCTION public.deals_auto_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.seller_confirmed_shipped_at IS NOT NULL AND NEW.buyer_confirmed_received_at IS NOT NULL
     AND NEW.status NOT IN ('completed','cancelled','disputed') THEN
    NEW.status := 'completed';
    NEW.completed_at := now();
  ELSIF NEW.buyer_confirmed_received_at IS NOT NULL AND NEW.status = 'shipped' THEN
    NEW.status := 'delivered';
  ELSIF NEW.seller_confirmed_shipped_at IS NOT NULL AND NEW.status = 'pending' THEN
    NEW.status := 'shipped';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_deals_auto_status BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_auto_complete();

-- ============ PLATFORM SETTINGS (ID verification threshold) ============
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by everyone" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.platform_settings(key, value) VALUES
  ('id_verification_price_threshold_ils', '3000'::jsonb)
ON CONFLICT (key) DO NOTHING;
