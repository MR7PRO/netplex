-- FIX 1: Profiles table - Hide phone numbers from public view
-- Create a public view that excludes phone numbers
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT id, name, avatar_url, role, created_at, updated_at
  FROM public.profiles;

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new policy: users can only view their own full profile (with phone)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- FIX 2: Offers table - Fix SELECT policy to prevent cross-buyer visibility
-- Drop the existing policy that leaks offer data
DROP POLICY IF EXISTS "Buyers can view own offers" ON public.offers;

-- Create proper policy: users can only see offers where they are the buyer OR they own the listing
CREATE POLICY "Users can view own offers or offers on own listings"
  ON public.offers FOR SELECT
  USING (
    buyer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM listings l 
      WHERE l.id = listing_id 
      AND l.seller_id = get_seller_id(auth.uid())
    ) OR 
    is_admin(auth.uid())
  );