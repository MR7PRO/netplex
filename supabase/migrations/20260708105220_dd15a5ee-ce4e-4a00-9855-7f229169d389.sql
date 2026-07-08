
-- Referral system
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_points integer NOT NULL DEFAULT 0;

-- Generate a short unique referral code for existing profiles
UPDATE public.profiles
SET referral_code = upper(substr(md5(id::text || random()::text), 1, 8))
WHERE referral_code IS NULL;

-- Function to generate a referral code on new profile insert
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.id::text || random()::text || clock_timestamp()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON public.profiles;
CREATE TRIGGER profiles_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- Redeem referral code (callable only by the redeeming user)
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_referrer uuid;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'يجب تسجيل الدخول');
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'رمز غير صحيح');
  END IF;

  SELECT referred_by INTO v_existing FROM public.profiles WHERE id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'استخدمت رمز دعوة من قبل');
  END IF;

  SELECT id INTO v_referrer
  FROM public.profiles
  WHERE upper(referral_code) = upper(trim(p_code))
  LIMIT 1;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'رمز غير موجود');
  END IF;

  IF v_referrer = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ما بتقدر تستخدم رمزك');
  END IF;

  UPDATE public.profiles
  SET referred_by = v_referrer, promo_points = promo_points + 50
  WHERE id = v_uid;

  UPDATE public.profiles
  SET promo_points = promo_points + 100
  WHERE id = v_referrer;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (v_referrer, 'referral_bonus', 'مبروك! دعوتك نجحت 🎉',
          'حصلت على 100 نقطة ترويج مجاناً', '/profile');

  RETURN jsonb_build_object('ok', true, 'points_awarded', 50);
END;
$$;
