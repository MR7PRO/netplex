
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'new_offer', 'new_review', 'offer_accepted', 'offer_rejected'
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- System inserts via triggers (SECURITY DEFINER functions)
-- No direct INSERT policy for users

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify seller on new offer
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_user_id uuid;
  v_listing_title text;
  v_buyer_name text;
BEGIN
  -- Get seller user_id from listing
  SELECT s.user_id, l.title INTO v_seller_user_id, v_listing_title
  FROM public.listings l
  JOIN public.sellers s ON s.id = l.seller_id
  WHERE l.id = NEW.listing_id;

  -- Get buyer name
  SELECT name INTO v_buyer_name
  FROM public.profiles
  WHERE id = NEW.buyer_id;

  IF v_seller_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_seller_user_id,
      'new_offer',
      'عرض جديد على ' || COALESCE(v_listing_title, 'منتجك'),
      COALESCE(v_buyer_name, 'مشتري') || ' قدم عرض بقيمة ₪' || NEW.offer_price_ils,
      '/seller/my-store',
      jsonb_build_object('offer_id', NEW.id, 'listing_id', NEW.listing_id, 'amount', NEW.offer_price_ils)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_offer_notify
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_offer();

-- Trigger function: notify seller on new review
CREATE OR REPLACE FUNCTION public.notify_on_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_user_id uuid;
  v_reviewer_name text;
BEGIN
  -- Get seller user_id
  SELECT user_id INTO v_seller_user_id
  FROM public.sellers
  WHERE id = NEW.seller_id;

  -- Get reviewer name
  SELECT name INTO v_reviewer_name
  FROM public.profiles
  WHERE id = NEW.reviewer_id;

  IF v_seller_user_id IS NOT NULL AND v_seller_user_id != NEW.reviewer_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (
      v_seller_user_id,
      'new_review',
      'تقييم جديد',
      COALESCE(v_reviewer_name, 'مستخدم') || ' أعطاك تقييم ' || NEW.rating || ' نجوم',
      '/seller/my-store',
      jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_review_notify
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_review();
