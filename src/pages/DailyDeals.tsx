import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import ListingCard from "@/components/listings/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Tag } from "lucide-react";
import { useMedianPrices } from "@/hooks/useMedianPrices";
import { getMedianPriceKey } from "@/lib/ranking";

const DailyDealsPage: React.FC = () => {
  const { data: medianPrices } = useMedianPrices();

  const { data: deals, isLoading } = useQuery({
    queryKey: ["daily-deals", medianPrices],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data) return [];

      // Score: bigger of explicit discount or below-median %
      const scored = data
        .map((l: any) => {
          const key = getMedianPriceKey(l.brand, l.model);
          const median = key && medianPrices ? medianPrices[key] : null;
          const belowMedianPct = median && median > l.price_ils
            ? Math.round((1 - l.price_ils / median) * 100)
            : 0;
          const dealPct = Math.max(l.discount_percent || 0, belowMedianPct);
          return { ...l, dealPct };
        })
        .filter((l: any) => l.dealPct >= 10)
        .sort((a: any, b: any) => b.dealPct - a.dealPct)
        .slice(0, 30);

      return scored;
    },
    enabled: !!medianPrices,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-3">
            <Flame className="h-5 w-5" />
            <span className="font-semibold">صفقات اليوم</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">أفضل العروض في غزة</h1>
          <p className="text-muted-foreground">منتجات بأسعار أقل من سعر السوق أو خصومات خاصة</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : deals && deals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {deals.map((l: any) => (
              <div key={l.id} className="relative">
                <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-lg">
                  <Tag className="h-3 w-3" />
                  -{l.dealPct}%
                </div>
                <ListingCard
                  id={l.id}
                  title={l.title}
                  price={l.price_ils}
                  image={l.images?.[0]}
                  region={l.region}
                  condition={l.condition || undefined}
                  viewCount={l.view_count || 0}
                  featured={l.featured || false}
                  discountPercent={l.discount_percent}
                  discountEndAt={l.discount_end_at}
                  stockQuantity={l.stock_quantity}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Tag className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p>لا توجد صفقات حالياً، تحقق لاحقاً</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DailyDealsPage;
