-- Create sellers_public view without WhatsApp (for public access)
CREATE VIEW public.sellers_public
WITH (security_invoker=on) AS
  SELECT id, user_id, type, shop_name, verified, trust_score, 
         region, bio, created_at, updated_at
  FROM public.sellers;

-- Create secure function to get seller WhatsApp (requires authentication)
CREATE OR REPLACE FUNCTION public.get_seller_whatsapp(p_seller_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact TEXT;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get WhatsApp number
  SELECT whatsapp INTO contact
  FROM public.sellers
  WHERE id = p_seller_id;
  
  RETURN contact;
END;
$$;