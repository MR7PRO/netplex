-- Drop the foreign key constraint on sellers.user_id to allow test data
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_fkey;