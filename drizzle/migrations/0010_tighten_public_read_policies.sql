DROP POLICY IF EXISTS "Bids are viewable by everyone" ON public.bids;
CREATE POLICY "Bids visible to bidder, auction seller or admin" ON public.bids FOR SELECT
USING (bidder_id = auth.uid() OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = bids.auction_id AND a.seller_id = public.get_seller_id(auth.uid())));

DROP POLICY IF EXISTS "Settings readable by everyone" ON public.platform_settings;
CREATE POLICY "Public settings keys readable" ON public.platform_settings FOR SELECT
USING (key IN ('id_verification_price_threshold_ils') OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews of existing sellers are viewable" ON public.reviews FOR SELECT
USING (reviewer_id = auth.uid() OR public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = reviews.seller_id));

DROP POLICY IF EXISTS "Sellers are viewable by everyone" ON public.sellers;
CREATE POLICY "Active or verified sellers are viewable" ON public.sellers FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR COALESCE(verified, false)
  OR EXISTS (SELECT 1 FROM public.listings l WHERE l.seller_id = sellers.id AND l.status = 'available'));

DROP POLICY IF EXISTS "Auctions are viewable by everyone" ON public.auctions;
CREATE POLICY "Non-cancelled auctions are viewable" ON public.auctions FOR SELECT
USING (status <> 'cancelled' OR seller_id = public.get_seller_id(auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated view review images" ON storage.objects;
CREATE POLICY "View review images of published reviews" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = 'review-images'
  AND ((storage.foldername(name))[2] = (select auth.uid()::text) OR public.is_admin(auth.uid())
       OR EXISTS (SELECT 1 FROM public.reviews r WHERE storage.objects.name = ANY(r.images))));

DROP POLICY IF EXISTS "View listing images with restrictions" ON storage.objects;
CREATE POLICY "View listing images of visible listings" ON storage.objects FOR SELECT
USING (bucket_id = 'listings' AND (storage.foldername(name))[1] NOT IN ('seller-ids','review-images')
  AND ((storage.foldername(name))[1] = (select auth.uid()::text) OR public.is_admin(auth.uid())
       OR EXISTS (SELECT 1 FROM public.listings l WHERE storage.objects.name = ANY(l.images))));