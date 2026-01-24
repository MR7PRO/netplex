import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, SlidersHorizontal, X, MapPin, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getRegionLabel, getConditionLabel, REGIONS, CONDITION_OPTIONS } from "@/lib/constants";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
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
  featured: boolean | null;
  created_at: string | null;
  seller: {
    id: string;
    shop_name: string | null;
    verified: boolean | null;
    whatsapp: string | null;
  } | null;
  category: {
    name_ar: string;
    slug: string;
  } | null;
}

interface Category {
  id: string;
  slug: string;
  name_ar: string;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { addItem, isInCart } = useCart();
  const { toast } = useToast();

  // Filter states
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    searchParams.get("condition")?.split(",").filter(Boolean) || []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseInt(searchParams.get("minPrice") || "0"),
    parseInt(searchParams.get("maxPrice") || "50000"),
  ]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");

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

  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      
      let queryBuilder = supabase
        .from("listings")
        .select(`
          id, title, description, price_ils, condition, region, images, 
          view_count, save_count, featured, created_at,
          seller:sellers!inner(id, shop_name, verified, whatsapp),
          category:categories(name_ar, slug)
        `)
        .eq("status", "available");

      // Apply filters
      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }
      if (selectedCategory) {
        queryBuilder = queryBuilder.eq("category.slug", selectedCategory);
      }
      if (selectedRegion) {
        queryBuilder = queryBuilder.eq("region", selectedRegion);
      }
      if (selectedConditions.length > 0) {
        queryBuilder = queryBuilder.in("condition", selectedConditions as Database["public"]["Enums"]["item_condition"][]);
      }
      queryBuilder = queryBuilder
        .gte("price_ils", priceRange[0])
        .lte("price_ils", priceRange[1]);

      // Apply sorting
      switch (sortBy) {
        case "price-low":
          queryBuilder = queryBuilder.order("price_ils", { ascending: true });
          break;
        case "price-high":
          queryBuilder = queryBuilder.order("price_ils", { ascending: false });
          break;
        case "popular":
          queryBuilder = queryBuilder.order("view_count", { ascending: false, nullsFirst: false });
          break;
        default:
          queryBuilder = queryBuilder.order("created_at", { ascending: false });
      }

      const { data, error } = await queryBuilder.limit(50);
      
      if (error) {
        console.error("Error fetching listings:", error);
      } else {
        setListings((data || []) as unknown as Listing[]);
      }
      setLoading(false);
    };

    fetchListings();
  }, [query, selectedCategory, selectedRegion, selectedConditions, priceRange, sortBy]);

  // Update URL params
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedConditions.length > 0) params.set("condition", selectedConditions.join(","));
    if (priceRange[0] > 0) params.set("minPrice", priceRange[0].toString());
    if (priceRange[1] < 50000) params.set("maxPrice", priceRange[1].toString());
    if (sortBy !== "newest") params.set("sort", sortBy);
    setSearchParams(params);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setSelectedRegion("");
    setSelectedConditions([]);
    setPriceRange([0, 50000]);
    setSortBy("newest");
    setSearchParams(new URLSearchParams());
  };

  const handleAddToCart = (listing: Listing) => {
    addItem({
      id: listing.id,
      title: listing.title,
      price_ils: listing.price_ils,
      image: listing.images?.[0] || null,
      seller_name: listing.seller?.shop_name || "بائع",
      seller_whatsapp: listing.seller?.whatsapp || null,
    });
    toast({ title: "تمت الإضافة للسلة" });
  };

  const activeFiltersCount = [
    selectedCategory,
    selectedRegion,
    selectedConditions.length > 0,
    priceRange[0] > 0 || priceRange[1] < 50000,
  ].filter(Boolean).length;

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
                placeholder="ابحث عن منتجات..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </form>

          <div className="flex gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <SlidersHorizontal className="h-4 w-4 ml-2" />
                  فلترة
                  {activeFiltersCount > 0 && (
                    <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>فلترة النتائج</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">القسم</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الأقسام" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الأقسام</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>
                            {cat.name_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">المنطقة</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع المناطق" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع المناطق</SelectItem>
                        {REGIONS.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">الحالة</label>
                    <div className="space-y-2">
                      {CONDITION_OPTIONS.map((condition) => (
                        <div key={condition.value} className="flex items-center gap-2">
                          <Checkbox
                            id={condition.value}
                            checked={selectedConditions.includes(condition.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedConditions([...selectedConditions, condition.value]);
                              } else {
                                setSelectedConditions(selectedConditions.filter(c => c !== condition.value));
                              }
                            }}
                          />
                          <label htmlFor={condition.value} className="text-sm cursor-pointer">
                            {condition.label_ar}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      نطاق السعر: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                    </label>
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      min={0}
                      max={50000}
                      step={100}
                      className="mt-4"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={applyFilters} className="flex-1 btn-brand">
                      تطبيق
                    </Button>
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={(value) => { setSortBy(value); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="price-low">السعر: الأقل</SelectItem>
                <SelectItem value="price-high">السعر: الأعلى</SelectItem>
                <SelectItem value="popular">الأكثر مشاهدة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-muted-foreground">
            {loading ? "جاري البحث..." : `${listings.length} نتيجة`}
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
        ) : listings.length === 0 ? (
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
            {listings.map((listing) => (
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
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
