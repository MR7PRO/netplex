import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "@/components/listings/ListingCard";

interface SimilarProductsProps {
  listingId: string;
  categoryId: string | null;
  brand: string | null;
  region: string;
}

interface SimilarListing {
  id: string;
  title: string;
  price_ils: number;
  images: string[] | null;
  region: string;
  condition: string | null;
  view_count: number | null;
  featured: boolean | null;
  seller: { verified: boolean | null; trust_score: number | null } | null;
}

export const SimilarProducts: React.FC<SimilarProductsProps> = ({
  listingId,
  categoryId,
  brand,
  region,
}) => {
  const [listings, setListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("listings")
        .select("id, title, price_ils, images, region, condition, view_count, featured, seller:sellers!listings_seller_id_fkey(verified, trust_score)")
        .eq("status", "available")
        .neq("id", listingId)
        .limit(6);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      } else if (brand) {
        query = query.ilike("brand", brand);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setListings(data as unknown as SimilarListing[]);
      } else if (categoryId || brand) {
        // Fallback: same region
        const { data: fallback } = await supabase
          .from("listings")
          .select("id, title, price_ils, images, region, condition, view_count, featured, seller:sellers!listings_seller_id_fkey(verified, trust_score)")
          .eq("status", "available")
          .eq("region", region)
          .neq("id", listingId)
          .limit(6);
        setListings((fallback as unknown as SimilarListing[]) || []);
      }
      setLoading(false);
    };
    fetch();
  }, [listingId, categoryId, brand, region]);

  if (loading || listings.length === 0) return null;

  return (
    <div className="mt-12" dir="rtl">
      <h2 className="text-xl font-bold mb-6">قد يعجبك أيضاً</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
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
        ))}
      </div>
    </div>
  );
};
