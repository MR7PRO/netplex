-- 1) Bids: only insertable via the validated place_bid() SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can place their own bids" ON public.bids;
REVOKE INSERT ON public.bids FROM authenticated, anon;

-- 2) Reviews: only the actual buyer of a completed deal (or admin) may review
DROP POLICY IF EXISTS "Users can create reviews on sold listings" ON public.reviews;
CREATE POLICY "Buyers of completed deals can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.listing_id = reviews.listing_id
        AND d.seller_id = reviews.seller_id
        AND d.buyer_id = auth.uid()
        AND d.status = 'completed'
    )
    OR EXISTS (
      SELECT 1
      FROM public.auctions a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.listing_id = reviews.listing_id
        AND l.seller_id = reviews.seller_id
        AND a.winner_user_id = auth.uid()
        AND a.status = 'ended'
    )
  )
);

-- 3) listing_events: require an authenticated owner-scoped insert
DROP POLICY IF EXISTS "Anyone can create view events" ON public.listing_events;
CREATE POLICY "Authenticated users can log their own events"
ON public.listing_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

REVOKE INSERT ON public.listing_events FROM anon;