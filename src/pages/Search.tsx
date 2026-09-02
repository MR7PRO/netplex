import React, { useState, useEffect, useMemo, useRef } from "react";
import { AskNetPlexButton } from "@/components/chat/AskNetPlexButton";
import { CompareBar } from "@/components/compare/CompareBar";
import { useCompare } from "@/contexts/CompareContext";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, MapPin, Heart, Eye, GitCompareArrows, Camera, Loader2, AlertTriangle } from "lucide-react";
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
import { EmptyState } from "@/components/EmptyState";
import { SmartSearchInput } from "@/components/search/SmartSearchInput";
import { FilterChips } from "@/components/search/FilterChips";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { ViewModeToggle, type ViewMode } from "@/components/search/ViewModeToggle";
import { NearMeChip } from "@/components/search/NearMeChip";
import { useUserRegion } from "@/hooks/useUserRegion";
import { ListingBadges } from "@/components/listings/ListingBadges";
import { calculateListingRank, RankingResult } from "@/lib/ranking";
import { useSearchListings, useBrandModels, MAX_PRICE, type RankedListing } from "@/hooks/useSearchListings";
import { SEO } from "@/components/seo/SEO";

type Listing = RankedListing & { rankingResult: RankingResult };

interface Category {
  id: string;
  slug: string;
  name_ar: string;
}

const SORT_OPTIONS = [
  { value: "best-match", label_ar: "⭐ الأفضل تطابقاً" },
  { value: "newest", label_ar: "🆕 الأحدث" },
  { value: "price-low", label_ar: "⬇️ الأرخص أولاً" },
  { value: "price-high", label_ar: "⬆️ الأغلى أولاً" },
  { value: "most-viewed", label_ar: "👁️ الأكثر مشاهدة" },
  { value: "most-saved", label_ar: "❤️ الأكثر حفظاً" },
];

const VIEW_MODE_KEY = "netplex_view_mode";

const SearchPage: React.FC = () => {
  const { addItem: addCompare, removeItem: removeCompare, isComparing, isFull: compareFull } = useCompare();
  const [searchParams, setSearchParams] = useSearchParams();
  const { region: userRegion } = useUserRegion();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || "grid";
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

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
      parseInt(searchParams.get("maxPrice") || String(MAX_PRICE)),
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

  // Brand/model facets (server-side distinct)
  const { data: brandModels } = useBrandModels();
  const brands = useMemo(
    () => [...new Set((brandModels ?? []).map((d) => d.brand).filter(Boolean) as string[])].sort(),
    [brandModels]
  );
  const models = useMemo(() => {
    const rows = (brandModels ?? []).filter((d) => d.model && (!filters.brand || d.brand === filters.brand));
    return [...new Set(rows.map((d) => d.model as string))].sort();
  }, [brandModels, filters.brand]);

  // Server-side ranked + paginated search
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSearchListings({ query, filters, sortBy });

  const total = data?.pages[0]?.total ?? 0;
  const loading = isLoading || (isFetching && !isFetchingNextPage && !data);

  // Badges only for rows on screen, using server-provided median price
  const rankedListings = useMemo<Listing[]>(() => {
    const rows = data?.pages.flatMap((p) => p.items) ?? [];
    return rows.map((listing) => ({
      ...listing,
      rankingResult: calculateListingRank({
        sellerTrustScore: listing.seller_trust_score ?? 50,
        sellerVerified: listing.seller_verified ?? false,
        title: listing.title,
        description: listing.description,
        images: listing.images ?? [],
        brand: listing.brand,
        model: listing.model,
        condition: listing.condition,
        publishedAt: listing.published_at,
        createdAt: listing.created_at,
        viewCount: listing.view_count ?? 0,
        saveCount: listing.save_count ?? 0,
        whatsappClickCount: listing.whatsapp_click_count ?? 0,
        price: listing.price_ils,
        medianPrice: listing.median_price,
        featured: listing.featured ?? false,
      }),
    }));
  }, [data]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      <SEO
        title={query ? `بحث: ${query} — NetPlex` : "تصفح المنتجات — NetPlex"}
        description={
          query
            ? `نتائج البحث عن "${query}" في NetPlex — تصفح إعلانات مُدققة لبيع وشراء الإلكترونيات في قطاع غزة.`
            : "تصفح آلاف الإعلانات المُدققة في NetPlex — فلتر حسب القسم، المنطقة، الحالة، والسعر بالشيكل."
        }
      />
      <div className="container mx-auto px-4 py-6">
        <h1 className="sr-only">{query ? `نتائج البحث عن ${query}` : "نتائج البحث في NetPlex"}</h1>
        {/* Search Header */}
        <div className="space-y-3 mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <SmartSearchInput
              value={query}
              onChange={setQuery}
              onSubmit={applyFilters}
              placeholder="ابحث عن منتجات... | Search products..."
              className="flex-1"
            />

            <Button asChild variant="outline" size="icon" title="بحث بالصورة" className="shrink-0">
              <Link to="/image-search"><Camera className="h-4 w-4" /></Link>
            </Button>


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
                <SelectTrigger className="w-44">
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

              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* Filter chips + Save search */}
          <div className="flex items-center gap-2 flex-wrap">
            <NearMeChip
              active={!!filters.region && filters.region === userRegion}
              onToggle={(r) => {
                setFilters({ ...filters, region: r });
                const params = new URLSearchParams(searchParams);
                if (r) params.set("region", r);
                else params.delete("region");
                setSearchParams(params);
              }}
            />
            <FilterChips filters={filters} onChange={setFilters} onApply={applyFilters} />
            <SaveSearchButton query={query} filters={filters} />
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
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
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
          <EmptyState
            icon={SearchIcon}
            title="لا توجد نتائج مطابقة"
            description="جرّب تعديل الفلاتر أو البحث بكلمات مختلفة، أو امسح الفلاتر لعرض كل المنتجات."
            actionLabel="مسح الفلاتر"
            onAction={clearFilters}
          />
        ) : (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              : "flex flex-col gap-3"
          }>
            {rankedListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className={
                  viewMode === "grid"
                    ? "group rounded-lg border bg-card overflow-hidden card-hover relative"
                    : "group rounded-lg border bg-card overflow-hidden card-hover relative flex gap-3"
                }
              >
                {listing.featured && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-primary text-primary-foreground">مميز</Badge>
                  </div>
                )}
                {/* Compare button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isComparing(listing.id)) {
                      removeCompare(listing.id);
                    } else {
                      addCompare({
                        id: listing.id,
                        title: listing.title,
                        price_ils: listing.price_ils,
                        condition: listing.condition,
                        region: listing.region,
                        brand: listing.brand,
                        model: listing.model,
                        image: listing.images?.[0] || null,
                        sellerVerified: listing.seller_verified || false,
                        sellerTrustScore: listing.seller_trust_score,
                        sellerName: listing.seller_shop_name,
                      });
                    }
                  }}
                  disabled={compareFull && !isComparing(listing.id)}
                  className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isComparing(listing.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/80 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  } ${compareFull && !isComparing(listing.id) ? "opacity-40 cursor-not-allowed" : ""}`}
                  title="قارن"
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </button>
                <div className={
                  viewMode === "grid"
                    ? "aspect-square bg-muted relative overflow-hidden"
                    : "w-28 h-28 sm:w-32 sm:h-32 shrink-0 bg-muted relative overflow-hidden"
                }>
                  {listing.images?.[0] ? (
                    <SignedImage
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          لا توجد صورة
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      لا توجد صورة
                    </div>
                  )}
                </div>
                <div className={viewMode === "grid" ? "p-3" : "p-3 flex-1 min-w-0"}>
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

        {/* Pagination: infinite scroll sentinel + manual fallback */}
        {!loading && rankedListings.length > 0 && (
          <div ref={sentinelRef} className="flex flex-col items-center justify-center py-8 gap-2">
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل المزيد...
              </span>
            ) : hasNextPage ? (
              <Button variant="outline" onClick={() => fetchNextPage()} className="min-h-[44px]">
                حمّل المزيد ({total - rankedListings.length} متبقية)
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">وصلت لنهاية النتائج</span>
            )}
          </div>
        )}
      </div>
      <CompareBar />
      <AskNetPlexButton />
    </Layout>
  );
};

export default SearchPage;
