
-- Drop indexes first, then extension, then recreate
DROP INDEX IF EXISTS public.idx_listings_title_trgm;
DROP INDEX IF EXISTS public.idx_listings_description_trgm;

-- Move pg_trgm extension to separate schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION pg_trgm SCHEMA extensions;

-- Recreate GIN indexes with the new extension location
CREATE INDEX idx_listings_title_trgm ON public.listings USING GIN (title extensions.gin_trgm_ops);
CREATE INDEX idx_listings_description_trgm ON public.listings USING GIN (description extensions.gin_trgm_ops);

-- Fix permissive RLS policies for submission_rate_limits
DROP POLICY IF EXISTS "System can insert rate limits" ON public.submission_rate_limits;
DROP POLICY IF EXISTS "System can update rate limits" ON public.submission_rate_limits;

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listings', 'listings', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listings bucket
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own listing images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);
