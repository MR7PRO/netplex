-- Create ranking function for search results
-- Formula: rank = 0.35*trust + 0.20*quality + 0.15*recency + 0.20*price_fair + 0.10*engagement + promoted_bonus

CREATE OR REPLACE FUNCTION public.calculate_listing_rank(
  p_trust_score INTEGER,
  p_view_count INTEGER,
  p_save_count INTEGER,
  p_created_at TIMESTAMP WITH TIME ZONE,
  p_is_promoted BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trust_score NUMERIC;
  quality_score NUMERIC;
  recency_score NUMERIC;
  engagement_score NUMERIC;
  promoted_bonus NUMERIC;
  final_rank NUMERIC;
BEGIN
  -- Trust score (0-100 normalized to 0-1)
  trust_score := COALESCE(p_trust_score, 50) / 100.0;
  
  -- Quality score based on views (logarithmic scale, max at 1000 views)
  quality_score := LEAST(1.0, LN(GREATEST(1, COALESCE(p_view_count, 0) + 1)) / LN(1001));
  
  -- Recency score (exponential decay over 30 days)
  recency_score := EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(p_created_at, NOW()))) / (30 * 24 * 3600));
  
  -- Engagement score based on saves (logarithmic scale)
  engagement_score := LEAST(1.0, LN(GREATEST(1, COALESCE(p_save_count, 0) + 1)) / LN(101));
  
  -- Promoted bonus
  promoted_bonus := CASE WHEN p_is_promoted THEN 0.15 ELSE 0 END;
  
  -- Final rank calculation
  final_rank := (0.35 * trust_score) + 
                (0.20 * quality_score) + 
                (0.15 * recency_score) + 
                (0.20 * 0.5) +  -- price_fair placeholder (would need market analysis)
                (0.10 * engagement_score) + 
                promoted_bonus;
  
  RETURN final_rank;
END;
$$;