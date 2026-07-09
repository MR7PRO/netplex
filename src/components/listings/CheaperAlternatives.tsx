import React, { useEffect, useState } from "react";
import { TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "@/components/listings/ListingCard";

interface CheaperAlternativesProps {
  listingId: string;
  currentPrice: number;
  categoryId: string | null;
  brand: string | null;
  model: string | null;
}

interface Row {
  id: string;
  title: string;
  price_ils: number;
  images: string[] | null;
  region: string;
  condition: string | null;
  view_count: number | null;
  featured: boolean | null;
  seller: { verified: boolean | null } | null;
}

export const CheaperAlternatives: React.FC<CheaperAlternativesProps> = ({
  listingId,
  currentPrice,
  categoryId,
  brand,
  model,
}) => {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    const run = async () => {
      const base = supabase
        .from("listings")
        .select("id, title, price_ils, images, region, condition, view_count, featured, seller:sellers!listings_seller_id_fkey(verified)")
        .eq("status", "available")
        .neq("id", listingId)
        .lt("price_ils", currentPrice)
        .order("price_ils", { ascending: true })
        .limit(4);

      // Prefer same model, then brand, then category
      let query = base;
      if (model) query = query.ilike("model", model);
      else if (brand) query = query.ilike("brand", brand);
      else if (categoryId) query = query.eq("category_id", categoryId);

      const { data } = await query;
      let rows = (data as unknown as Row[]) || [];

      if (rows.length === 0 && (brand || categoryId)) {
        const fallback = supabase
          .from("listings")
          .select("id, title, price_ils, images, region, condition, view_count, featured, seller:sellers!listings_seller_id_fkey(verified)")
          .eq("status", "available")
          .neq("id", listingId)
          .lt("price_ils", currentPrice)
          .order("price_ils", { ascending: true })
          .limit(4);
        const q2 = brand ? fallback.ilike("brand", brand) : fallback.eq("category_id", categoryId!);
        const { data: d2 } = await q2;
        rows = (d2 as unknown as Row[]) || [];
      }

      setItems(rows);
    };
    run();
  }, [listingId, currentPrice, categoryId, brand, model]);

  if (items.length === 0) return null;

  return (
    <div className="mt-8" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">منتجات مشابهة بسعر أقل</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((l) => {
          const savings = currentPrice - l.price_ils;
          return (
            <div key={l.id} className="relative">
              <ListingCard
                id={l.id}
                title={l.title}
                price={l.price_ils}
                image={l.images?.[0] || undefined}
                region={l.region}
                condition={l.condition || undefined}
                viewCount={l.view_count || 0}
                featured={l.featured || false}
                verifiedSeller={l.seller?.verified || false}
              />
              <div className="absolute top-2 right-2 z-10 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                وفّر ₪{savings.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheaperAlternatives;
