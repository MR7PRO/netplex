GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_sub_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_seller_id(uuid) TO anon, authenticated, service_role;