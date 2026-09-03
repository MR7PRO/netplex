-- 1) Link disputes to deals (optional; existing disputes stay listing-scoped)
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_disputes_deal_id ON public.disputes(deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_status ON public.deals(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_seller_status ON public.deals(seller_id, status);

-- 2) Tighter server-side transition guard (keeps existing rules, adds status consistency)
CREATE OR REPLACE FUNCTION public.deals_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_is_buyer  boolean := (OLD.buyer_id = auth.uid());
  v_is_seller boolean := (OLD.seller_id = public.get_seller_id(auth.uid()));
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
       OR NOT v_is_seller THEN
      RAISE EXCEPTION 'غير مصرح بتأكيد التسليم';
    END IF;
  END IF;

  IF NEW.buyer_confirmed_received_at IS DISTINCT FROM OLD.buyer_confirmed_received_at THEN
    IF OLD.buyer_confirmed_received_at IS NOT NULL
       OR NEW.buyer_confirmed_received_at IS NULL
       OR NOT v_is_buyer THEN
      RAISE EXCEPTION 'غير مصرح بتأكيد الاستلام';
    END IF;
    IF OLD.seller_confirmed_shipped_at IS NULL THEN
      RAISE EXCEPTION 'لازم البائع يأكد التسليم أولاً';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'shipped' THEN
        IF NEW.seller_confirmed_shipped_at IS NULL THEN RAISE EXCEPTION 'انتقال غير مسموح لحالة الصفقة'; END IF;
      WHEN 'delivered' THEN
        IF NEW.buyer_confirmed_received_at IS NULL THEN RAISE EXCEPTION 'انتقال غير مسموح لحالة الصفقة'; END IF;
      WHEN 'completed' THEN
        IF NEW.seller_confirmed_shipped_at IS NULL OR NEW.buyer_confirmed_received_at IS NULL THEN
          RAISE EXCEPTION 'انتقال غير مسموح لحالة الصفقة';
        END IF;
      WHEN 'cancelled' THEN
        -- Either party may cancel only before the seller confirmed delivery
        IF OLD.status <> 'pending' OR NOT (v_is_buyer OR v_is_seller) THEN
          RAISE EXCEPTION 'لا يمكن إلغاء الصفقة بعد تأكيد التسليم';
        END IF;
      WHEN 'disputed' THEN
        -- Only via an actual dispute record owned by the buyer of this deal
        IF NOT EXISTS (SELECT 1 FROM public.disputes d WHERE d.deal_id = OLD.id AND d.buyer_id = OLD.buyer_id) THEN
          RAISE EXCEPTION 'افتح شكوى رسمية أولاً';
        END IF;
      ELSE
        RAISE EXCEPTION 'انتقال غير مسموح لحالة الصفقة';
    END CASE;
  END IF;

  RETURN NEW;
END $$;

-- 3) When a dispute is opened against a deal, mark the deal as disputed (server-side)
CREATE OR REPLACE FUNCTION public.disputes_mark_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_deal public.deals%ROWTYPE;
BEGIN
  IF NEW.deal_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_deal FROM public.deals WHERE id = NEW.deal_id;
  IF v_deal.id IS NULL THEN RAISE EXCEPTION 'الصفقة غير موجودة'; END IF;
  IF v_deal.buyer_id <> NEW.buyer_id OR v_deal.seller_id <> NEW.seller_id OR v_deal.listing_id <> NEW.listing_id THEN
    RAISE EXCEPTION 'بيانات الشكوى لا تطابق الصفقة';
  END IF;
  IF v_deal.status IN ('cancelled','disputed') THEN
    RAISE EXCEPTION 'لا يمكن فتح شكوى على صفقة ملغاة أو منازع عليها';
  END IF;
  IF v_deal.status <> 'completed' THEN
    UPDATE public.deals SET status = 'disputed' WHERE id = v_deal.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_disputes_mark_deal ON public.disputes;
CREATE TRIGGER trg_disputes_mark_deal AFTER INSERT ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.disputes_mark_deal();

-- 4) Deal notifications for both parties
CREATE OR REPLACE FUNCTION public.notify_on_deal_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_seller_user uuid;
  v_title text;
  v_link text := '/deals/' || NEW.id;
BEGIN
  SELECT user_id INTO v_seller_user FROM public.sellers WHERE id = NEW.seller_id;
  SELECT title INTO v_title FROM public.listings WHERE id = NEW.listing_id;
  v_title := COALESCE(v_title, 'منتج');

  IF TG_OP = 'INSERT' THEN
    IF v_seller_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
      VALUES (v_seller_user, 'deal_opened', 'ضمان استلام جديد 🛡️',
              'المشتري فتح ضمان استلام على: ' || v_title || ' — أكّد التسليم عند تسليم المنتج.',
              v_link, jsonb_build_object('deal_id', NEW.id));
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'shipped' THEN
        INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
        VALUES (NEW.buyer_id, 'deal_shipped', 'البائع أكّد التسليم 🚚',
                'أكّد استلامك لـ: ' || v_title || ' لإتمام الصفقة.', v_link, jsonb_build_object('deal_id', NEW.id));
      WHEN 'completed' THEN
        INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
        VALUES (NEW.buyer_id, 'deal_completed', 'اكتملت الصفقة ✅',
                'صفقة ' || v_title || ' اكتملت. شاركنا تقييمك للبائع.', v_link, jsonb_build_object('deal_id', NEW.id));
        IF v_seller_user IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
          VALUES (v_seller_user, 'deal_completed', 'اكتملت الصفقة ✅',
                  'المشتري أكّد استلام: ' || v_title || '.', v_link, jsonb_build_object('deal_id', NEW.id));
        END IF;
      WHEN 'cancelled' THEN
        INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
        VALUES (NEW.buyer_id, 'deal_cancelled', 'تم إلغاء الصفقة',
                'تم إلغاء ضمان الاستلام على: ' || v_title || '.', v_link, jsonb_build_object('deal_id', NEW.id));
        IF v_seller_user IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
          VALUES (v_seller_user, 'deal_cancelled', 'تم إلغاء الصفقة',
                  'تم إلغاء ضمان الاستلام على: ' || v_title || '.', v_link, jsonb_build_object('deal_id', NEW.id));
        END IF;
      WHEN 'disputed' THEN
        IF v_seller_user IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
          VALUES (v_seller_user, 'deal_disputed', 'الصفقة قيد النزاع ⚠️',
                  'تم فتح نزاع على صفقة: ' || v_title || '.', v_link, jsonb_build_object('deal_id', NEW.id));
        END IF;
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_deal_change ON public.deals;
CREATE TRIGGER trg_notify_deal_change AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.notify_on_deal_change();