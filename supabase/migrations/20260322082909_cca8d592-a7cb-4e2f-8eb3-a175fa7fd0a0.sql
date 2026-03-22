
-- Trigger: auto-create seller profile when a user gets sub_admin role
CREATE OR REPLACE FUNCTION public.auto_create_seller_for_sub_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'sub_admin' THEN
    INSERT INTO public.sellers (user_id, type, shop_name, region, verified)
    SELECT NEW.user_id, 'shop', COALESCE(p.name, 'متجري'), 'الضفة الغربية', true
    FROM public.profiles p
    WHERE p.id = NEW.user_id
    ON CONFLICT (user_id) DO UPDATE SET verified = true, type = 'shop';
  END IF;
  RETURN NEW;
END;
$$;

-- Need unique constraint on sellers.user_id for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sellers_user_id_key'
  ) THEN
    ALTER TABLE public.sellers ADD CONSTRAINT sellers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE TRIGGER on_sub_admin_role_assigned
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_seller_for_sub_admin();

-- RLS: sub_admin can create listings (their own seller_id only)
CREATE POLICY "Sub admins can create own listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (
    is_sub_admin(auth.uid()) AND seller_id = get_seller_id(auth.uid())
  );

-- RLS: sub_admin can update their own listings
CREATE POLICY "Sub admins can update own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (
    is_sub_admin(auth.uid()) AND seller_id = get_seller_id(auth.uid())
  );

-- RLS: sub_admin can delete their own listings
CREATE POLICY "Sub admins can delete own listings"
  ON public.listings FOR DELETE
  TO authenticated
  USING (
    is_sub_admin(auth.uid()) AND seller_id = get_seller_id(auth.uid())
  );
