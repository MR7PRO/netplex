
CREATE OR REPLACE FUNCTION public.notify_on_submission_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_user_id uuid;
  v_notification_type text;
  v_title text;
  v_body text;
BEGIN
  -- Only fire when status changes from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Get seller user_id
    SELECT user_id INTO v_seller_user_id
    FROM public.sellers
    WHERE id = NEW.seller_id;

    IF v_seller_user_id IS NOT NULL THEN
      IF NEW.status = 'approved' THEN
        v_notification_type := 'submission_approved';
        v_title := 'تم نشر منتجك ✅';
        v_body := 'تمت الموافقة على "' || NEW.title || '" وهو الآن متاح للمشترين';
      ELSE
        v_notification_type := 'submission_rejected';
        v_title := 'تم رفض طلبك ❌';
        v_body := 'تم رفض "' || NEW.title || '"';
        IF NEW.admin_notes IS NOT NULL AND NEW.admin_notes != '' THEN
          v_body := v_body || ' — السبب: ' || NEW.admin_notes;
        END IF;
      END IF;

      INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
      VALUES (
        v_seller_user_id,
        v_notification_type,
        v_title,
        v_body,
        '/seller/dashboard',
        jsonb_build_object('submission_id', NEW.id, 'status', NEW.status)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_submission_status_change
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_submission_review();
