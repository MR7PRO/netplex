
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_end_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT NULL;

-- Create a trigger to auto-set status to 'sold' when stock hits 0
CREATE OR REPLACE FUNCTION public.check_stock_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= 0 AND NEW.status = 'available' THEN
    NEW.status := 'sold';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_stock_quantity
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_quantity();
