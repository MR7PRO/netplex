-- Fix 1: Add DELETE policy for reviews table so users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

-- Fix 2: Create a SECURITY DEFINER function to safely increment view count
-- This bypasses RLS but only allows incrementing, not arbitrary updates
CREATE OR REPLACE FUNCTION public.increment_listing_view(listing_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = listing_id 
    AND status = 'available';
$$;

-- Grant execute to all users (including anonymous for public listings)
GRANT EXECUTE ON FUNCTION public.increment_listing_view TO anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_view TO authenticated;