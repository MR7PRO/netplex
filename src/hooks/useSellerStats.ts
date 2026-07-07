import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SellerStats {
  soldCount: number;
  availableCount: number;
  reviewCount: number;
  averageRating: number;
  hasPhotos: boolean;
  memberSinceMonths: number;
}

/**
 * Aggregated performance stats used to award seller achievement badges.
 */
export function useSellerStats(sellerId?: string, createdAt?: string | null) {
  return useQuery<SellerStats>({
    queryKey: ["seller-stats", sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const [soldRes, availRes, reviewsRes, listingsRes] = await Promise.all([
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", sellerId!)
          .eq("status", "sold"),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", sellerId!)
          .eq("status", "available"),
        supabase
          .from("reviews")
          .select("rating")
          .eq("seller_id", sellerId!),
        supabase
          .from("listings")
          .select("images")
          .eq("seller_id", sellerId!)
          .limit(10),
      ]);

      const ratings = (reviewsRes.data || []).map((r: any) => r.rating);
      const avg = ratings.length
        ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        : 0;
      const hasPhotos =
        (listingsRes.data || []).filter(
          (l: any) => Array.isArray(l.images) && l.images.length >= 2
        ).length >= 3;

      let months = 0;
      if (createdAt) {
        const diff = Date.now() - new Date(createdAt).getTime();
        months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
      }

      return {
        soldCount: soldRes.count || 0,
        availableCount: availRes.count || 0,
        reviewCount: ratings.length,
        averageRating: avg,
        hasPhotos,
        memberSinceMonths: months,
      };
    },
  });
}
