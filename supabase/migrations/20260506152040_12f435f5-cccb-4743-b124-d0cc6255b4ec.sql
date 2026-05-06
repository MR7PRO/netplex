
-- Dispute status enum
CREATE TYPE public.dispute_status AS ENUM ('pending', 'under_review', 'resolved', 'rejected');

-- Disputes table
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  amount_ils numeric,
  status public.dispute_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_buyer ON public.disputes(buyer_id);
CREATE INDEX idx_disputes_seller ON public.disputes(seller_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create disputes"
ON public.disputes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "View own disputes"
ON public.disputes FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id
  OR seller_id = public.get_seller_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins update disputes"
ON public.disputes FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete disputes"
ON public.disputes FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dispute messages
CREATE TABLE public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispute_messages_dispute ON public.dispute_messages(dispute_id);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages"
ON public.dispute_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = dispute_messages.dispute_id
      AND (
        d.buyer_id = auth.uid()
        OR d.seller_id = public.get_seller_id(auth.uid())
        OR public.is_admin(auth.uid())
      )
  )
);

CREATE POLICY "Participants send messages"
ON public.dispute_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = dispute_messages.dispute_id
      AND (
        d.buyer_id = auth.uid()
        OR d.seller_id = public.get_seller_id(auth.uid())
        OR public.is_admin(auth.uid())
      )
  )
);

-- Notifications: notify seller on new dispute
CREATE OR REPLACE FUNCTION public.notify_on_new_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_user_id uuid;
  v_buyer_name text;
BEGIN
  SELECT user_id INTO v_seller_user_id FROM public.sellers WHERE id = NEW.seller_id;
  SELECT name INTO v_buyer_name FROM public.profiles WHERE id = NEW.buyer_id;

  IF v_seller_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_seller_user_id,
      'new_dispute',
      'تم فتح شكوى جديدة ⚠️',
      COALESCE(v_buyer_name, 'مشتري') || ' فتح شكوى: ' || NEW.title,
      '/disputes/' || NEW.id,
      jsonb_build_object('dispute_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_dispute
AFTER INSERT ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_dispute();

-- Notify both parties on status change by admin
CREATE OR REPLACE FUNCTION public.notify_on_dispute_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_user_id uuid;
  v_status_label text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_status_label := CASE NEW.status
    WHEN 'under_review' THEN 'قيد المراجعة 🔎'
    WHEN 'resolved' THEN 'تم الحل ✅'
    WHEN 'rejected' THEN 'تم الرفض ❌'
    ELSE 'تحديث'
  END;

  SELECT user_id INTO v_seller_user_id FROM public.sellers WHERE id = NEW.seller_id;

  -- Notify buyer
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    NEW.buyer_id,
    'dispute_update',
    'تحديث شكواك: ' || v_status_label,
    NEW.title,
    '/disputes/' || NEW.id,
    jsonb_build_object('dispute_id', NEW.id, 'status', NEW.status)
  );

  -- Notify seller
  IF v_seller_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_seller_user_id,
      'dispute_update',
      'تحديث الشكوى: ' || v_status_label,
      NEW.title,
      '/disputes/' || NEW.id,
      jsonb_build_object('dispute_id', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dispute_review
AFTER UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_dispute_review();
