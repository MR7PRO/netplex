import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PriceStats {
  sample_count: number;
  price_min: number | null;
  price_max: number | null;
  price_median: number | null;
  price_p25: number | null;
  price_p75: number | null;
}

export type PriceLabel = "great_deal" | "fair" | "high" | "unknown";

export function getPriceLabel(price: number, stats: PriceStats): PriceLabel {
  if (!stats.price_p25 || !stats.price_p75 || stats.sample_count < 3) return "unknown";
  if (price <= stats.price_p25) return "great_deal";
  if (price <= stats.price_p75) return "fair";
  return "high";
}

export function usePriceStats(brand: string | null, model: string | null, condition: string | null) {
  return useQuery({
    queryKey: ["price-stats", brand, model, condition],
    queryFn: async (): Promise<PriceStats> => {
      const { data, error } = await supabase.rpc("get_price_stats", {
        p_brand: brand || "",
        p_model: model || "",
        p_condition: condition as any,
      });

      if (error) {
        console.error("Error fetching price stats:", error);
        return { sample_count: 0, price_min: null, price_max: null, price_median: null, price_p25: null, price_p75: null };
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row || { sample_count: 0, price_min: null, price_max: null, price_median: null, price_p25: null, price_p75: null };
    },
    enabled: !!(brand || model),
    staleTime: 5 * 60 * 1000,
  });
}
