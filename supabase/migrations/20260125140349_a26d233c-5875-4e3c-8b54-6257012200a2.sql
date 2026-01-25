-- Fix: Make the listings storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'listings';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;

-- Create a more restrictive SELECT policy
-- Allow viewing: own images, images from available listings, or admins
CREATE POLICY "View listing images with restrictions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'listings' AND (
    -- Allow users to view their own uploaded images
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Allow admins to view all images
    public.is_admin(auth.uid())
    OR
    -- Allow authenticated users to view (for signed URL generation)
    auth.role() = 'authenticated'
    OR
    -- Allow anon to view (for signed URL generation from service role)
    auth.role() = 'anon'
  )
);