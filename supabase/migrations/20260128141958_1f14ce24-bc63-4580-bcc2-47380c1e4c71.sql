-- Add listing_events table for detailed analytics tracking
CREATE TABLE public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'save', 'whatsapp_click', 'unsave')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listing_events
CREATE POLICY "Anyone can create view events"
  ON public.listing_events FOR INSERT
  WITH CHECK (event_type = 'view');

CREATE POLICY "Authenticated users can create save/whatsapp events"
  ON public.listing_events FOR INSERT
  TO authenticated
  WITH CHECK (event_type IN ('save', 'whatsapp_click', 'unsave') AND auth.uid() = user_id);

CREATE POLICY "Admins and listing owners can view events"
  ON public.listing_events FOR SELECT
  USING (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.listings l 
      WHERE l.id = listing_id AND l.seller_id = get_seller_id(auth.uid())
    )
  );

-- Performance indexes for listing_events
CREATE INDEX idx_listing_events_listing_id ON public.listing_events(listing_id);
CREATE INDEX idx_listing_events_event_type ON public.listing_events(event_type);
CREATE INDEX idx_listing_events_created_at ON public.listing_events(created_at DESC);

-- Performance indexes for listings (if not already exist)
CREATE INDEX IF NOT EXISTS idx_listings_category_region ON public.listings(category_id, region);
CREATE INDEX IF NOT EXISTS idx_listings_brand_model ON public.listings(brand, model);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price_ils);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON public.listings(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);

-- Update reviews INSERT policy to only allow reviews on sold listings (or admin override)
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;

CREATE POLICY "Users can create reviews on sold listings"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.listings l 
        WHERE l.id = listing_id AND l.status = 'sold'
      )
    )
  );