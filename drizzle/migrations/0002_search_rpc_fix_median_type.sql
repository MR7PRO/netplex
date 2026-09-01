CREATE OR REPLACE FUNCTION public.search_listings_ranked(
  p_query text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_conditions text[] DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort text DEFAULT 'best-match',
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price_ils numeric,
  condition item_condition,
  region text,
  images text[],
  view_count integer,
  save_count integer,
  whatsapp_click_count integer,
  featured boolean,
  created_at timestamptz,
  published_at timestamptz,
  brand text,
  model text,
  seller_id uuid,
  seller_shop_name text,
  seller_verified boolean,
  seller_trust_score integer,
  category_name_ar text,
  category_slug text,
  median_price numeric,
  relevance numeric,
  rank numeric,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_q text := nullif(btrim(coalesce(p_query, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_cat uuid;
  v_ts tsquery;
BEGIN
  IF p_category_slug IS NOT NULL AND btrim(p_category_slug) <> '' THEN
    SELECT c.id INTO v_cat FROM public.categories c WHERE c.slug = p_category_slug;
    IF v_cat IS NULL THEN
      RETURN;
    END IF;
  END IF;

  IF v_q IS NOT NULL THEN
    BEGIN
      v_ts := plainto_tsquery('simple', v_q);
    EXCEPTION WHEN others THEN
      v_ts := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH medians AS (
    SELECT lower(btrim(coalesce(l.brand,''))) || '|' || lower(btrim(coalesce(l.model,''))) AS key,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price_ils))::numeric AS med
    FROM public.listings l
    WHERE l.status = 'available'
      AND l.brand IS NOT NULL
      AND l.published_at >= now() - interval '30 days'
    GROUP BY 1
    HAVING count(*) >= 2
  ),
  base AS (
    SELECT
      l.*,
      s.id AS s_id, s.shop_name AS s_shop, s.verified AS s_verified, s.trust_score AS s_trust,
      c.name_ar AS c_name, c.slug AS c_slug,
      m.med AS med_price,
      CASE WHEN v_q IS NULL THEN 0::numeric ELSE (
          (CASE WHEN l.title ILIKE '%' || v_q || '%' THEN 1.0 ELSE 0 END)
        + (CASE WHEN coalesce(l.brand,'') ILIKE '%' || v_q || '%'
                  OR coalesce(l.model,'') ILIKE '%' || v_q || '%' THEN 0.6 ELSE 0 END)
        + (CASE WHEN coalesce(l.description,'') ILIKE '%' || v_q || '%' THEN 0.25 ELSE 0 END)
        + (CASE WHEN v_ts IS NOT NULL AND to_tsvector('simple',
              coalesce(l.title,'') || ' ' || coalesce(l.brand,'') || ' ' ||
              coalesce(l.model,'') || ' ' || coalesce(l.description,'')) @@ v_ts
             THEN 0.5 ELSE 0 END)
        + (0.6 * greatest(
              similarity(coalesce(l.title,''), v_q),
              similarity(coalesce(l.brand,'') || ' ' || coalesce(l.model,''), v_q)))
      )::numeric END AS rel
    FROM public.listings l
    JOIN public.sellers s ON s.id = l.seller_id
    LEFT JOIN public.categories c ON c.id = l.category_id
    LEFT JOIN medians m
      ON m.key = lower(btrim(coalesce(l.brand,''))) || '|' || lower(btrim(coalesce(l.model,'')))
    WHERE l.status = 'available'
      AND (v_cat IS NULL OR l.category_id = v_cat)
      AND (p_region IS NULL OR p_region = '' OR l.region = p_region)
      AND (p_conditions IS NULL OR array_length(p_conditions, 1) IS NULL
           OR l.condition::text = ANY (p_conditions))
      AND (p_brand IS NULL OR p_brand = '' OR l.brand = p_brand)
      AND (p_model IS NULL OR p_model = '' OR l.model = p_model)
      AND (p_min_price IS NULL OR l.price_ils >= p_min_price)
      AND (p_max_price IS NULL OR l.price_ils <= p_max_price)
      AND (
        v_q IS NULL
        OR l.title ILIKE '%' || v_q || '%'
        OR coalesce(l.brand,'') ILIKE '%' || v_q || '%'
        OR coalesce(l.model,'') ILIKE '%' || v_q || '%'
        OR coalesce(l.description,'') ILIKE '%' || v_q || '%'
        OR (v_ts IS NOT NULL AND to_tsvector('simple',
              coalesce(l.title,'') || ' ' || coalesce(l.brand,'') || ' ' ||
              coalesce(l.model,'') || ' ' || coalesce(l.description,'')) @@ v_ts)
        OR word_similarity(v_q, coalesce(l.title,'')) > 0.5
        OR similarity(coalesce(l.brand,'') || ' ' || coalesce(l.model,''), v_q) > 0.35
      )
  ),
  scored AS (
    SELECT b.*,
      (
        0.35 * least(1.0, (least(100, greatest(0, coalesce(b.s_trust, 50)))
                           + CASE WHEN coalesce(b.s_verified,false) THEN 10 ELSE 0 END) / 100.0)
      + 0.20 * least(1.0, (
            (CASE WHEN length(b.title) > 10 THEN 1 ELSE 0 END)
          + (CASE WHEN length(coalesce(b.description,'')) > 50 THEN 1
                  WHEN length(coalesce(b.description,'')) > 20 THEN 0.5 ELSE 0 END)
          + (CASE WHEN coalesce(array_length(b.images,1),0) >= 3 THEN 2
                  WHEN coalesce(array_length(b.images,1),0) = 2 THEN 1.5
                  WHEN coalesce(array_length(b.images,1),0) = 1 THEN 1 ELSE 0 END)
          + (CASE WHEN b.brand IS NOT NULL THEN 0.5 ELSE 0 END)
          + (CASE WHEN b.model IS NOT NULL THEN 0.5 ELSE 0 END)
          + (CASE WHEN b.condition IS NOT NULL THEN 0.5 ELSE 0 END)
        ) / 6.0)
      + 0.15 * exp(-1 * (extract(epoch FROM (now() - coalesce(b.published_at, b.created_at, now()))) / 86400.0) / 30.0)
      + 0.20 * (CASE
            WHEN b.med_price IS NULL OR b.med_price <= 0 THEN 0.5
            WHEN b.price_ils / b.med_price <= 1.0
              THEN least(1.0, 0.8 + (1 - (b.price_ils / b.med_price)) * 0.4)
            ELSE greatest(0.2, 1 - least(0.7, ((b.price_ils / b.med_price) - 1) * 0.7))
          END)
      + 0.10 * (
            0.40 * least(1.0, ln(greatest(0, coalesce(b.view_count,0)) + 1) / ln(1001))
          + 0.35 * least(1.0, ln(greatest(0, coalesce(b.save_count,0)) + 1) / ln(101))
          + 0.25 * least(1.0, ln(greatest(0, coalesce(b.whatsapp_click_count,0)) + 1) / ln(51))
        )
      + (CASE WHEN coalesce(b.featured,false) THEN 0.15 ELSE 0 END)
      + (CASE WHEN v_q IS NULL THEN 0 ELSE 0.5 * least(1.0, b.rel / 2.0) END)
      )::numeric AS score
    FROM base b
  )
  SELECT
    sc.id, sc.title, sc.description, sc.price_ils, sc.condition, sc.region, sc.images,
    sc.view_count, sc.save_count, sc.whatsapp_click_count, sc.featured,
    sc.created_at, sc.published_at, sc.brand, sc.model,
    sc.s_id, sc.s_shop, sc.s_verified, sc.s_trust,
    sc.c_name, sc.c_slug, sc.med_price::numeric, sc.rel::numeric, sc.score::numeric,
    count(*) OVER () AS total_count
  FROM scored sc
  ORDER BY
    CASE WHEN p_sort = 'price-low' THEN sc.price_ils END ASC NULLS LAST,
    CASE WHEN p_sort = 'price-high' THEN sc.price_ils END DESC NULLS LAST,
    CASE WHEN p_sort = 'newest' THEN coalesce(sc.published_at, sc.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort = 'most-viewed' THEN coalesce(sc.view_count, 0) END DESC NULLS LAST,
    CASE WHEN p_sort = 'most-saved' THEN coalesce(sc.save_count, 0) END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('price-low','price-high','newest','most-viewed','most-saved')
         THEN sc.score END DESC NULLS LAST,
    sc.id
  LIMIT v_lim OFFSET v_off;
END;
$$;

REVOKE ALL ON FUNCTION public.search_listings_ranked(text,text,text,text[],text,text,numeric,numeric,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_listings_ranked(text,text,text,text[],text,text,numeric,numeric,text,integer,integer) TO anon, authenticated, service_role;