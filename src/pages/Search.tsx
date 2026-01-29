import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, MapPin, Heart, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getRegionLabel, getConditionLabel } from "@/lib/constants";
import { SignedImage } from "@/components/SignedImage";
import { SearchFiltersSheet, SearchFilters } from "@/components/search/SearchFiltersSheet";
import { ListingBadges } from "@/components/listings/ListingBadges";
import { calculateListingRank, getMedianPriceKey, RankingResult } from "@/lib/ranking";
import { useMedianPrices } from "@/hooks/useMedianPrices";
import type { Database } from "@/integrations/supabase/types";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price_ils: number;
  condition: string | null;
  region: string;
  images: string[];
  view_count: number | null;
  save_count: number | null;
  whatsapp_click_count: number | null;
  featured: boolean | null;
  created_at: string | null;
  published_at: string | null;
  brand: string | null;
  model: string | null;
  seller: {
    id: string;
    shop_name: string | null;
    verified: boolean | null;
    trust_score: number | null;
  } | null;
  category: {
    name_ar: string;
    slug: string;
  } | null;
  // Computed fields
  rank?: number;
  rankingResult?: RankingResult;
}

interface Category {
  id: string;
  slug: string;
  name_ar: string;
}

const SORT_OPTIONS = [
  { value: "best-match", label_ar: "الأفضل تطابقاً" },
  { value: "newest", label_ar: "الأحدث" },
  { value: "price-low", label_ar: "السعر: الأقل" },
  { value: "price-high", label_ar: "السعر: الأعلى" },
];

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Median prices for fair price calculation
  const { data: medianPrices } = useMedianPrices();

  // Query state
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "best-match");
  
  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    category: searchParams.get("category") || "",
    region: searchParams.get("region") || "",
    conditions: searchParams.get("condition")?.split(",").filter(Boolean) || [],
    priceRange: [
      parseInt(searchParams.get("minPrice") || "0"),
      parseInt(searchParams.get("maxPrice") || "50000"),
    ],
    brand: searchParams.get("brand") || "",
    model: searchParams.get("model") || "",
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name_ar")
        .order("sort_order");
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Fetch brands and models for filters
  useEffect(() => {
    const fetchBrandsModels = async () => {
      const { data } = await supabase
        .from("listings")
        .select("brand, model")
        .eq("status", "available")
        .not("brand", "is", null);
      
      if (data) {
        const uniqueBrands = [...new Set(data.map(d => d.brand).filter(Boolean) as string[])].sort();
        setBrands(uniqueBrands);
        
        // If a brand is selected, filter models to that brand
        if (filters.brand) {
          const brandModels = data
            .filter(d => d.brand === filters.brand && d.model)
            .map(d => d.model as string);
          setModels([...new Set(brandModels)].sort());
        } else {
          const allModels = [...new Set(data.map(d => d.model).filter(Boolean) as string[])].sort();
          setModels(allModels);
        }
      }
    };
    fetchBrandsModels();
  }, [filters.brand]);

  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      
      let queryBuilder = supabase
        .from("listings")
        .select(`
          id, title, description, price_ils, condition, region, images, 
          view_count, save_count, whatsapp_click_count, featured, created_at, published_at,
          brand, model,
          seller:sellers!inner(id, shop_name, verified, trust_score),
          category:categories(name_ar, slug)
        `)
        .eq("status", "available");

      // Apply text search (Arabic/English)
      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`);
      }
      
      // Apply filters
      if (filters.category) {
        queryBuilder = queryBuilder.eq("category.slug", filters.category);
      }
      if (filters.region) {
        queryBuilder = queryBuilder.eq("region", filters.region);
      }
      if (filters.conditions.length > 0) {
        queryBuilder = queryBuilder.in("condition", filters.conditions as Database["public"]["Enums"]["item_condition"][]);
      }
      if (filters.brand) {
        queryBuilder = queryBuilder.eq("brand", filters.brand);
      }
      if (filters.model) {
        queryBuilder = queryBuilder.eq("model", filters.model);
      }
      queryBuilder = queryBuilder
        .gte("price_ils", filters.priceRange[0])
        .lte("price_ils", filters.priceRange[1]);

      // Apply DB-level sorting for simple sorts
      switch (sortBy) {
        case "price-low":
          queryBuilder = queryBuilder.order("price_ils", { ascending: true });
          break;
        case "price-high":
          queryBuilder = queryBuilder.order("price_ils", { ascending: false });
          break;
        case "newest":
          queryBuilder = queryBuilder.order("published_at", { ascending: false, nullsFirst: false });
          break;
        default:
          // best-match will be sorted client-side
          queryBuilder = queryBuilder.order("published_at", { ascending: false });
      }

      const { data, error } = await queryBuilder.limit(50);
      
      if (error) {
        console.error("Error fetching listings:", error);
        setListings([]);
      } else {
        setListings((data || []) as unknown as Listing[]);
      }
      setLoading(false);
    };

    fetchListings();
  }, [query, filters, sortBy]);

  // Apply ranking algorithm
  const rankedListings = useMemo(() => {
    if (!listings.length) return [];
    
    const withRanking = listings.map(listing => {
      const medianKey = getMedianPriceKey(listing.brand, listing.model);
      const medianPrice = medianKey && medianPrices ? medianPrices[medianKey] : null;
      
      const rankingResult = calculateListingRank({
        sellerTrustScore: listing.seller?.trust_score || 50,
        sellerVerified: listing.seller?.verified || false,
        title: listing.title,
        description: listing.description,
        images: listing.images || [],
        brand: listing.brand,
        model: listing.model,
        condition: listing.condition,
        publishedAt: listing.published_at,
        createdAt: listing.created_at,
        viewCount: listing.view_count || 0,
        saveCount: listing.save_count || 0,
        whatsappClickCount: listing.whatsapp_click_count || 0,
        price: listing.price_ils,
        medianPrice,
        featured: listing.featured || false,
      });
      
      return {
        ...listing,
        rank: rankingResult.score,
        rankingResult,
      };
    });
    
    // Sort by ranking score for "best-match"
    if (sortBy === "best-match") {
      withRanking.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    }
    
    return withRanking;
  }, [listings, medianPrices, sortBy]);

  // Update URL params
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (filters.category) params.set("category", filters.category);
    if (filters.region) params.set("region", filters.region);
    if (filters.conditions.length > 0) params.set("condition", filters.conditions.join(","));
    if (filters.priceRange[0] > 0) params.set("minPrice", filters.priceRange[0].toString());
    if (filters.priceRange[1] < 50000) params.set("maxPrice", filters.priceRange[1].toString());
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.model) params.set("model", filters.model);
    if (sortBy !== "best-match") params.set("sort", sortBy);
    setSearchParams(params);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setQuery("");
    setFilters({
      category: "",
      region: "",
      conditions: [],
      priceRange: [0, 50000],
      brand: "",
      model: "",
    });
    setSortBy("best-match");
    setSearchParams(new URLSearchParams());
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form 
            onSubmit={(e) => { e.preventDefault(); applyFilters(); }}
            className="flex-1"
          >
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن منتجات... | Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-10"
                dir="auto"
              />
            </div>
          </form>

          <div className="flex gap-2">
            <SearchFiltersSheet
              filters={filters}
              onFiltersChange={setFilters}
              onApply={applyFilters}
              onClear={clearFilters}
              categories={categories}
              brands={brands}
              models={models}
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
            />

            <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4">
          <p className="text-muted-foreground">
            {loading ? "جاري البحث..." : `${rankedListings.length} نتيجة`}
          </p>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : rankedListings.length === 0 ? (
          <div className="text-center py-16">
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground mb-4">جرب تغيير معايير البحث</p>
            <Button variant="outline" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rankedListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="group rounded-xl border bg-card overflow-hidden card-hover relative"
              >
                {listing.featured && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-primary text-primary-foreground">مميز</Badge>
                  </div>
                )}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {listing.images?.[0] ? (
                    <SignedImage
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          لا توجد صورة
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      لا توجد صورة
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {listing.title}
                  </h3>
                  
                  {/* Ranking Badges */}
                  {listing.rankingResult && (
                    <ListingBadges
                      verifiedSeller={listing.rankingResult.badges.verifiedSeller}
                      fairPrice={listing.rankingResult.badges.fairPrice}
                      hotDeal={listing.rankingResult.badges.hotDeal}
                      className="mb-2"
                      compact
                    />
                  )}
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {getRegionLabel(listing.region)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {formatPrice(listing.price_ils)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-3 w-3" />
                        {listing.view_count || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" />
                        {listing.save_count || 0}
                      </span>
                    </div>
                  </div>
                  {listing.condition && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {getConditionLabel(listing.condition)}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchPage;
