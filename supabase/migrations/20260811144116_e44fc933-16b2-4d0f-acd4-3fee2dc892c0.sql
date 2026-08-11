ALTER FUNCTION public.get_price_stats(text, text, item_condition) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_sub_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_seller_id(uuid) FROM PUBLIC, anon, authenticated;