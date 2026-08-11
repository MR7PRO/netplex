-- 1) DEALS: restrict what parties can change
DROP POLICY IF EXISTS "Parties can update their deals" ON public.deals;
CREATE POLICY "Parties can update their deals" ON public.deals FOR UPDATE TO authenticated
USING (buyer_id = auth.uid() OR seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()))
WITH CHECK (buyer_id = auth.uid() OR seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.deals_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.agreed_price_ils IS DISTINCT FROM OLD.agreed_price_ils
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'لا يمكن تعديل بيانات الصفقة الأساسية';
  END IF;

  IF OLD.status IN ('completed','cancelled','disputed')
     AND (NEW.status IS DISTINCT FROM OLD.status
          OR NEW.seller_confirmed_shipped_at IS DISTINCT FROM OLD.seller_confirmed_shipped_at
          OR NEW.buyer_confirmed_received_at IS DISTINCT FROM OLD.buyer_confirmed_received_at) THEN
    RAISE EXCEPTION 'الصفقة مقفلة';
  END IF;

  IF NEW.seller_confirmed_shipped_at IS DISTINCT FROM OLD.seller_confirmed_shipped_at THEN
    IF OLD.seller_confirmed_shipped_at IS NOT NULL
       OR NEW.seller_confirmed_shipped_at IS NULL
       OR NEW.seller_id IS DISTINCT FROM public.get_seller_id(auth.uid()) THEN
      RAISE EXCEPTION 'غير مصرح بتأكيد التسليم';
    END IF;
  END IF;

  IF NEW.buyer_confirmed_received_at IS DISTINCT FROM OLD.buyer_confirmed_received_at THEN
    IF OLD.buyer_confirmed_received_at IS NOT NULL
       OR NEW.buyer_confirmed_received_at IS NULL
       OR NEW.buyer_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'غير مصرح بتأكيد الاستلام';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('shipped','delivered','completed','cancelled','disputed') THEN
    RAISE EXCEPTION 'انتقال غير مسموح لحالة الصفقة';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deals_guard ON public.deals;
CREATE TRIGGER trg_deals_guard BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.deals_guard_update();

-- 2) ID VERIFICATION GATE enforced server-side
CREATE OR REPLACE FUNCTION public.enforce_id_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_threshold numeric := 3000;
  v_raw text;
  v_verified boolean;
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT value #>> '{}' INTO v_raw
  FROM public.platform_settings
  WHERE key = 'id_verification_price_threshold_ils';

  BEGIN
    IF v_raw IS NOT NULL THEN
      v_threshold := v_raw::numeric;
    END IF;
  EXCEPTION WHEN others THEN
    v_threshold := 3000;
  END;

  IF NEW.price_ils >= v_threshold THEN
    SELECT verified INTO v_verified FROM public.sellers WHERE id = NEW.seller_id;
    IF NOT COALESCE(v_verified, false) THEN
      RAISE EXCEPTION 'يجب توثيق الهوية لعرض منتجات بسعر % شيكل أو أكثر', v_threshold;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_submissions_id_gate ON public.submissions;
CREATE TRIGGER trg_submissions_id_gate BEFORE INSERT OR UPDATE OF price_ils ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_id_verification();

DROP TRIGGER IF EXISTS trg_listings_id_gate ON public.listings;
CREATE TRIGGER trg_listings_id_gate BEFORE INSERT OR UPDATE OF price_ils ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_id_verification();

-- 3) ADMIN INVITES: no public reads, validation via RPC only
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.admin_invites;

CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv RECORD;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  SELECT used, expires_at INTO inv
  FROM public.admin_invites
  WHERE invite_code = trim(p_code)
  LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'invalid'); END IF;
  IF inv.used THEN RETURN jsonb_build_object('valid', false, 'reason', 'used'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('valid', false, 'reason', 'expired'); END IF;
  RETURN jsonb_build_object('valid', true);
END $$;

REVOKE ALL ON FUNCTION public.validate_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon, authenticated, service_role;

-- 4) STORAGE: seller ID documents must not be readable by everyone
DROP POLICY IF EXISTS "View listing images with restrictions" ON storage.objects;
CREATE POLICY "View listing images with restrictions" ON storage.objects FOR SELECT
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] <> 'seller-ids'
);

-- 5) STORAGE: uploads must land in the uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 6) STORAGE: avatars bucket is public; drop broad listing policy
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 7) Public seller view respects caller's RLS
ALTER VIEW public.sellers_public SET (security_invoker = on);

-- 8) Internal helper secrets used by database triggers
CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_config TO service_role;
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;

-- 9) Lock down direct execution of internal SECURITY DEFINER functions
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.place_bid(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, numeric) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_seller_whatsapp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_seller_whatsapp(uuid) TO authenticated, service_role;