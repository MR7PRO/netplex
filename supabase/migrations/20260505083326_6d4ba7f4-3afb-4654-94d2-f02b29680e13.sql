
-- Verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Seller verification requests table
CREATE TABLE public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  user_id uuid NOT NULL,
  id_image_path text NOT NULL,
  full_name text,
  id_number text,
  status public.verification_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_verifications_status ON public.seller_verifications(status);
CREATE INDEX idx_seller_verifications_seller ON public.seller_verifications(seller_id);

ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own verifications"
  ON public.seller_verifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Sellers create own verifications"
  ON public.seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND seller_id = public.get_seller_id(auth.uid()));

CREATE POLICY "Admins manage verifications"
  ON public.seller_verifications FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete verifications"
  ON public.seller_verifications FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_seller_verifications_updated_at
  BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- On approval, mark seller as verified + notify
CREATE OR REPLACE FUNCTION public.handle_verification_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.sellers SET verified = true WHERE id = NEW.seller_id;
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.user_id, 'verification_approved', 'تم توثيق حسابك ✅',
              'تهانينا! تمت الموافقة على توثيق هويتك وأصبح حسابك موثقاً.',
              '/profile');
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.user_id, 'verification_rejected', 'تم رفض طلب التوثيق ❌',
              COALESCE('السبب: ' || NEW.admin_notes, 'يرجى مراجعة بياناتك وإعادة المحاولة'),
              '/profile');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verification_review
  AFTER UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_verification_review();

-- Storage policies: seller-ids/{user_id}/...
CREATE POLICY "Users upload own ID files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = 'seller-ids'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users view own ID files or admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = 'seller-ids'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin(auth.uid()))
  );
