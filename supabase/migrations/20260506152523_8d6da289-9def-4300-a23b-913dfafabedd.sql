
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[];

-- Storage policies for review images under listings/review-images/{user_id}/
CREATE POLICY "Users upload own review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = 'review-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users update own review images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = 'review-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users delete own review images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = 'review-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Authenticated view review images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listings'
  AND (storage.foldername(name))[1] = 'review-images'
);
