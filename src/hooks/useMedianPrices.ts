import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MedianPriceMap, getMedianPriceKey } from "@/lib/ranking";

/**
 * Fetch median prices for brand+model combinations from last 30 days
 * Returns a map of "brand|model" -> median price
 */
export function useMedianPrices() {
  return useQuery({
    queryKey: ["median-prices"],
    queryFn: async (): Promise<MedianPriceMap> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Fetch all available listings with brand/model from last 30 days
      const { data, error } = await supabase
        .from("listings")
        .select("brand, model, price_ils")
        .eq("status", "available")
        .not("brand", "is", null)
        .gte("published_at", thirtyDaysAgo.toISOString());
      
      if (error) {
        console.error("Error fetching median prices:", error);
        return {};
      }
      
      // Group by brand+model and calculate medians
      const priceGroups: Record<string, number[]> = {};
      
      for (const listing of data || []) {
        const key = getMedianPriceKey(listing.brand, listing.model);
        if (!key) continue;
        
        if (!priceGroups[key]) {
          priceGroups[key] = [];
        }
        priceGroups[key].push(listing.price_ils);
      }
      
      // Calculate median for each group
      const medianPrices: MedianPriceMap = {};
      
      for (const [key, prices] of Object.entries(priceGroups)) {
        if (prices.length < 2) continue; // Need at least 2 listings for meaningful median
        
        prices.sort((a, b) => a - b);
        const mid = Math.floor(prices.length / 2);
        medianPrices[key] = prices.length % 2 === 0
          ? (prices[mid - 1] + prices[mid]) / 2
          : prices[mid];
      }
      
      return medianPrices;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
