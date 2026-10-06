CREATE OR REPLACE FUNCTION public.region_key(t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN NULL
    ELSE (
      SELECT CASE k
        WHEN 'gaza-city' THEN 'غزة' WHEN 'مدينةغزة' THEN 'غزة' WHEN 'gaza' THEN 'غزة'
        WHEN 'khan-younis' THEN 'خانيونس'
        WHEN 'rafah' THEN 'رفح' WHEN 'jabalia' THEN 'جباليا'
        WHEN 'nuseirat' THEN 'النصيرات' WHEN 'deir-al-balah' THEN 'ديرالبلح'
        WHEN 'beit-hanoun' THEN 'بيتحانون' WHEN 'beit-lahia' THEN 'بيتلاهيا'
        WHEN 'bureij' THEN 'البريج' WHEN 'maghazi' THEN 'المغازي'
        ELSE k END
      FROM (SELECT replace(lower(btrim(t)), ' ', '') AS k) x)
  END
$$;
GRANT EXECUTE ON FUNCTION public.region_key(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_recommendations(p_viewed_ids uuid[] DEFAULT NULL::uuid[], p_region text DEFAULT NULL::text, p_limit integer DEFAULT 60)
 RETURNS TABLE(id uuid, title text, price_ils numeric, condition item_condition, region text, images text[], view_count integer, save_count integer, featured boolean, created_at timestamp with time zone, published_at timestamp with time zone, brand text, model text, category_id uuid, seller_id uuid, seller_verified boolean, discount_percent integer, discount_end_at timestamp with time zone, stock_quantity integer, score numeric, reason text, reason_value text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_lim integer := least(greatest(coalesce(p_limit, 60), 1), 120);
  v_viewed uuid[] := coalesce(p_viewed_ids, '{}'::uuid[]);
  v_region_key text := public.region_key(p_region);
BEGIN
  RETURN QUERY
  WITH saved AS (
    SELECT sl.listing_id FROM public.saved_listings sl WHERE v_uid IS NOT NULL AND sl.user_id = v_uid
  ),
  followed AS (
    SELECT sf.seller_id FROM public.seller_follows sf WHERE v_uid IS NOT NULL AND sf.follower_id = v_uid
  ),
  seeds AS (
    SELECT l.id, l.category_id, lower(btrim(l.brand)) AS brand, lower(btrim(l.model)) AS model, l.seller_id,
           CASE WHEN l.id = ANY(v_viewed) THEN array_position(v_viewed, l.id) ELSE 99 END AS pos
    FROM public.listings l
    WHERE l.id = ANY(v_viewed) OR l.id IN (SELECT listing_id FROM saved)
  ),
  seed_cats AS (
    SELECT s.category_id, count(*) AS n, min(s.pos) AS best FROM seeds s WHERE s.category_id IS NOT NULL GROUP BY 1
  ),
  seed_brands AS (
    SELECT s.brand, count(*) AS n, min(s.pos) AS best FROM seeds s WHERE s.brand IS NOT NULL AND s.brand <> '' GROUP BY 1
  ),
  seed_models AS (
    SELECT s.brand, s.model FROM seeds s WHERE s.model IS NOT NULL AND s.model <> '' GROUP BY 1,2
  ),
  medians AS (
    SELECT lower(btrim(coalesce(l.brand,''))) || '|' || lower(btrim(coalesce(l.model,''))) AS key,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price_ils))::numeric AS med
    FROM public.listings l
    WHERE l.status = 'available' AND l.brand IS NOT NULL
    GROUP BY 1 HAVING count(*) >= 2
  ),
  cand AS (
    SELECT
      l.*, s.verified AS s_verified, s.trust_score AS s_trust, c.name_ar AS cat_name, m.med,
      (l.seller_id IN (SELECT f.seller_id FROM followed f)) AS is_followed,
      sb.n AS brand_hits,
      (EXISTS (SELECT 1 FROM seed_models sm WHERE sm.brand = lower(btrim(l.brand)) AND sm.model = lower(btrim(l.model)))) AS model_hit,
      sc.n AS cat_hits,
      (v_region_key IS NOT NULL AND public.region_key(l.region) = v_region_key) AS in_region,
      extract(epoch FROM (now() - coalesce(l.published_at, l.created_at))) / 86400.0 AS age_days
    FROM public.listings l
    JOIN public.sellers s ON s.id = l.seller_id
    LEFT JOIN public.categories c ON c.id = l.category_id
    LEFT JOIN medians m ON m.key = lower(btrim(coalesce(l.brand,''))) || '|' || lower(btrim(coalesce(l.model,'')))
    LEFT JOIN seed_brands sb ON sb.brand = lower(btrim(l.brand))
    LEFT JOIN seed_cats sc ON sc.category_id = l.category_id
    WHERE l.status = 'available'
      AND (l.stock_quantity IS NULL OR l.stock_quantity > 0)
      AND NOT (l.id = ANY(v_viewed))
      AND l.id NOT IN (SELECT listing_id FROM saved)
      AND (v_uid IS NULL OR l.seller_id IS DISTINCT FROM public.get_seller_id(v_uid))
  ),
  scored AS (
    SELECT
      cd.*,
      ( CASE WHEN cd.is_followed THEN 0.30 ELSE 0 END
      + CASE WHEN cd.model_hit THEN 0.35 WHEN cd.brand_hits IS NOT NULL THEN 0.25 ELSE 0 END
      + CASE WHEN cd.cat_hits IS NOT NULL THEN least(0.20, 0.10 + 0.03 * cd.cat_hits) ELSE 0 END
      + CASE WHEN cd.in_region THEN 0.12 ELSE 0 END
      + 0.15 * least(1.0, (least(100, greatest(0, coalesce(cd.s_trust, 50))) + CASE WHEN coalesce(cd.s_verified,false) THEN 10 ELSE 0 END) / 100.0)
      + 0.10 * exp(-cd.age_days / 30.0)
      + 0.08 * ( 0.5 * least(1.0, ln(greatest(0, coalesce(cd.view_count,0)) + 1) / ln(1001))
               + 0.5 * least(1.0, ln(greatest(0, coalesce(cd.save_count,0)) + 1) / ln(101)) )
      + 0.10 * CASE WHEN cd.med IS NULL OR cd.med <= 0 THEN 0.5
                    WHEN cd.price_ils / cd.med <= 1.0 THEN least(1.0, 0.8 + (1 - cd.price_ils / cd.med) * 0.4)
                    ELSE greatest(0.2, 1 - least(0.7, ((cd.price_ils / cd.med) - 1) * 0.7)) END
      + CASE WHEN coalesce(cd.featured,false) THEN 0.05 ELSE 0 END
      + CASE WHEN coalesce(array_length(cd.images,1),0) >= 2 THEN 0.03 ELSE 0 END
      )::numeric AS sc,
      CASE
        WHEN cd.is_followed THEN 'followed_seller'
        WHEN cd.model_hit OR cd.brand_hits IS NOT NULL THEN 'viewed_brand'
        WHEN cd.cat_hits IS NOT NULL THEN 'viewed_category'
        WHEN cd.in_region THEN 'popular_in_region'
        WHEN coalesce(cd.s_verified,false) THEN 'verified_seller'
        WHEN cd.med IS NOT NULL AND cd.price_ils <= cd.med THEN 'good_price'
        WHEN cd.age_days <= 7 THEN 'fresh'
        WHEN coalesce(cd.view_count,0) >= 50 OR coalesce(cd.save_count,0) >= 5 THEN 'trending'
        ELSE 'none'
      END AS rsn,
      CASE
        WHEN cd.is_followed THEN NULL
        WHEN cd.model_hit OR cd.brand_hits IS NOT NULL THEN cd.brand
        WHEN cd.cat_hits IS NOT NULL THEN cd.cat_name
        WHEN cd.in_region THEN cd.region
        ELSE NULL
      END AS rsn_val
    FROM cand cd
  )
  SELECT
    s2.id, s2.title, s2.price_ils, s2.condition, s2.region, s2.images, s2.view_count, s2.save_count,
    s2.featured, s2.created_at, s2.published_at, s2.brand, s2.model, s2.category_id, s2.seller_id,
    s2.s_verified, s2.discount_percent, s2.discount_end_at, s2.stock_quantity,
    s2.sc, s2.rsn, s2.rsn_val
  FROM scored s2
  ORDER BY s2.sc DESC, s2.id
  LIMIT v_lim;
END;
$function$;