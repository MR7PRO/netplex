
CREATE OR REPLACE FUNCTION public.get_price_stats(
  p_brand text,
  p_model text,
  p_condition item_condition DEFAULT NULL
)
RETURNS TABLE(
  sample_count integer,
  price_min numeric,
  price_max numeric,
  price_median numeric,
  price_p25 numeric,
  price_p75 numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prices numeric[];
  n integer;
BEGIN
  SELECT ARRAY_AGG(l.price_ils ORDER BY l.price_ils)
  INTO prices
  FROM public.listings l
  WHERE l.status = 'available'
    AND l.published_at >= (now() - interval '30 days')
    AND lower(trim(COALESCE(l.brand, ''))) = lower(trim(COALESCE(p_brand, '')))
    AND lower(trim(COALESCE(l.model, ''))) = lower(trim(COALESCE(p_model, '')))
    AND (p_condition IS NULL OR l.condition = p_condition);

  n := COALESCE(array_length(prices, 1), 0);

  IF n < 3 THEN
    RETURN QUERY SELECT 
      n::integer,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    n::integer,
    prices[1],
    prices[n],
    -- median
    CASE WHEN n % 2 = 1 THEN prices[(n+1)/2]
         ELSE (prices[n/2] + prices[n/2+1]) / 2.0
    END,
    -- p25
    prices[GREATEST(1, CEIL(n * 0.25)::integer)],
    -- p75
    prices[LEAST(n, CEIL(n * 0.75)::integer)];
END;
$$;
