import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SearchFilters } from "@/components/search/SearchFiltersSheet";

export const SEARCH_PAGE_SIZE = 24;
export const MAX_PRICE = 50000;

export interface RankedListing {
  id: string;
  title: string;
  description: string | null;
  price_ils: number;
  condition: string | null;
  region: string;
  images: string[] | null;
  view_count: number | null;
  save_count: number | null;
  whatsapp_click_count: number | null;
  featured: boolean | null;
  created_at: string | null;
  published_at: string | null;
  brand: string | null;
  model: string | null;
  seller_id: string;
  seller_shop_name: string | null;
  seller_verified: boolean | null;
  seller_trust_score: number | null;
  category_name_ar: string | null;
  category_slug: string | null;
  median_price: number | null;
  relevance: number;
  rank: number;
  total_count: number;
}

export interface SearchPage {
  items: RankedListing[];
  total: number;
  offset: number;
}

interface Params {
  query: string;
  filters: SearchFilters;
  sortBy: string;
}

/** Server-side ranked, paginated listing search (RPC `search_listings_ranked`). */
export function useSearchListings({ query, filters, sortBy }: Params) {
  const q = query.trim().slice(0, 120);
  return useInfiniteQuery<SearchPage>({
    queryKey: ["search-listings", q, filters, sortBy],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error } = await supabase.rpc("search_listings_ranked", {
        p_query: q || null,
        p_category_slug: filters.category || null,
        p_region: filters.region || null,
        p_conditions: filters.conditions.length ? filters.conditions : null,
        p_brand: filters.brand || null,
        p_model: filters.model || null,
        p_min_price: filters.priceRange[0] > 0 ? filters.priceRange[0] : null,
        p_max_price: filters.priceRange[1] < MAX_PRICE ? filters.priceRange[1] : null,
        p_sort: sortBy,
        p_limit: SEARCH_PAGE_SIZE,
        p_offset: offset,
      });
      if (error) throw error;
      const items = (data ?? []) as unknown as RankedListing[];
      return { items, total: Number(items[0]?.total_count ?? 0), offset };
    },
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return last.items.length === SEARCH_PAGE_SIZE && next < last.total ? next : undefined;
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

/** Distinct brand/model facets for filter dropdowns (RPC `listing_brand_models`). */
export function useBrandModels() {
  return useQuery({
    queryKey: ["listing-brand-models"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listing_brand_models");
      if (error) throw error;
      return (data ?? []) as { brand: string | null; model: string | null }[];
    },
    staleTime: 5 * 60_000,
  });
}
