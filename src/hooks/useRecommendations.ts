import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useUserRegion } from "@/hooks/useUserRegion";
import {
  diversifyRecommendations,
  type RecommendedListing,
} from "@/lib/recommendations";

const CANDIDATE_POOL = 60;

/**
 * Personalized "Recommended for you" feed.
 * Server ranks candidates from existing signals (viewed ids, saved, follows,
 * region, trust, price, freshness); client applies diversity re-ranking.
 * Falls back gracefully to trending/verified/fresh for anonymous users.
 */
export function useRecommendations(limit = 8) {
  const { user } = useAuth();
  const { items: recent } = useRecentlyViewed();
  const { region } = useUserRegion();

  const viewedIds = useMemo(() => recent.slice(0, 10).map((r) => r.id), [recent]);
  // Stable key so we don't refetch on every render.
  const viewedKey = viewedIds.join(",");

  const query = useQuery({
    queryKey: ["recommendations", user?.id ?? "anon", viewedKey, region],
    queryFn: async (): Promise<RecommendedListing[]> => {
      const { data, error } = await supabase.rpc("get_recommendations", {
        p_viewed_ids: viewedIds.length ? viewedIds : null,
        p_region: region || null,
        p_limit: CANDIDATE_POOL,
      });
      if (error) throw error;
      return (data ?? []) as unknown as RecommendedListing[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const items = useMemo(
    () => diversifyRecommendations(query.data ?? [], limit),
    [query.data, limit]
  );

  const personalized = !!user || viewedIds.length > 0;

  return { items, isLoading: query.isLoading, isError: query.isError, personalized };
}
