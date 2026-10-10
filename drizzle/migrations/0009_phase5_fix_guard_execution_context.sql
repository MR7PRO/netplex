-- Guards ran as SECURITY DEFINER, so current_user was always the owner and the checks never fired.
-- As SECURITY INVOKER, current_user is the API role (authenticated/anon) for direct calls,
-- and the owner when reached through trusted SECURITY DEFINER code (referrals, verification review).
ALTER FUNCTION public.sellers_guard_protected_cols() SECURITY INVOKER;
ALTER FUNCTION public.profiles_guard_protected_cols() SECURITY INVOKER;

-- New verification requests from users always start as pending with no review data.
CREATE OR REPLACE FUNCTION public.seller_verifications_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.admin_notes := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.seller_verifications_guard_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_seller_verifications_guard_insert ON public.seller_verifications;
CREATE TRIGGER trg_seller_verifications_guard_insert BEFORE INSERT ON public.seller_verifications
FOR EACH ROW EXECUTE FUNCTION public.seller_verifications_guard_insert();