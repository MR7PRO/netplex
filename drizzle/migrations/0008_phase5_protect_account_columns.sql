-- 1) Sellers: only admins (or internal SECURITY DEFINER code) may change verification/trust/ownership
CREATE OR REPLACE FUNCTION public.sellers_guard_protected_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verified := false;
      NEW.trust_score := 50;
    ELSIF NEW.verified IS DISTINCT FROM OLD.verified
       OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'غير مسموح بتعديل التوثيق أو نقاط الثقة';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sellers_guard ON public.sellers;
CREATE TRIGGER trg_sellers_guard BEFORE INSERT OR UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.sellers_guard_protected_cols();

-- 2) Profiles: users cannot self-grant points, referrals or roles
CREATE OR REPLACE FUNCTION public.profiles_guard_protected_cols()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.promo_points := 0;
      NEW.referred_by := NULL;
      NEW.role := 'buyer';
    ELSIF NEW.promo_points IS DISTINCT FROM OLD.promo_points
       OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
       OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'غير مسموح بتعديل هذه البيانات';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_guard ON public.profiles;
CREATE TRIGGER trg_profiles_guard BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_protected_cols();

REVOKE EXECUTE ON FUNCTION public.sellers_guard_protected_cols() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_protected_cols() FROM PUBLIC, anon, authenticated;

-- 3) Hide seller phone numbers from direct table reads (use get_seller_whatsapp RPC)
REVOKE SELECT ON public.sellers FROM anon, authenticated;
GRANT SELECT (id, user_id, type, shop_name, verified, trust_score, region, bio, created_at, updated_at, logo_url, cover_url)
  ON public.sellers TO anon, authenticated;
GRANT ALL ON public.sellers TO service_role;