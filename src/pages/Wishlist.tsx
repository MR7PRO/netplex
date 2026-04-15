import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import Layout from "@/components/layout/Layout";
import ListingCard from "@/components/listings/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SavedListing {
  id: string;
  listing: {
    id: string;
    title: string;
    price_ils: number;
    images: string[] | null;
    region: string;
    condition: string | null;
    view_count: number | null;
    featured: boolean | null;
  };
}

const WishlistPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSaved = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("saved_listings")
        .select("id, listing:listings!saved_listings_listing_id_fkey(id, title, price_ils, images, region, condition, view_count, featured)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setItems((data as unknown as SavedListing[]) || []);
      setLoading(false);
    };
    fetchSaved();
  }, [user]);

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center" dir="rtl">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">قائمة الأمنيات</h1>
          <p className="text-muted-foreground mb-6">سجل دخول لعرض المنتجات المحفوظة</p>
          <Button onClick={() => navigate("/auth")}>تسجيل الدخول</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">قائمة الأمنيات</h1>
          <span className="text-muted-foreground text-sm">({items.length})</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">لم تحفظ أي منتجات بعد</p>
            <Button onClick={() => navigate("/search")}>تصفح المنتجات</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ListingCard
                key={item.id}
                id={item.listing.id}
                title={item.listing.title}
                price={item.listing.price_ils}
                image={item.listing.images?.[0] || undefined}
                region={item.listing.region}
                condition={item.listing.condition || undefined}
                viewCount={item.listing.view_count || 0}
                featured={item.listing.featured || false}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WishlistPage;
