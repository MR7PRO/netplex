import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import ListingCard from "@/components/listings/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const FollowingFeed: React.FC = () => {
  const { user } = useAuth();

  const { data: followedSellers } = useQuery({
    queryKey: ["my-followed-sellers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("seller_follows")
        .select("seller_id")
        .eq("follower_id", user.id);
      return data?.map((r) => r.seller_id) || [];
    },
    enabled: !!user,
  });

  const { data: sellers } = useQuery({
    queryKey: ["followed-sellers-info", followedSellers],
    queryFn: async () => {
      if (!followedSellers?.length) return [];
      const { data } = await supabase
        .from("sellers")
        .select("id, shop_name, region, verified")
        .in("id", followedSellers);
      return data || [];
    },
    enabled: !!followedSellers?.length,
  });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["followed-sellers-feed", followedSellers],
    queryFn: async () => {
      if (!followedSellers?.length) return [];
      const { data } = await supabase
        .from("listings")
        .select("*")
        .in("seller_id", followedSellers)
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!followedSellers?.length,
  });

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center" dir="rtl">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">سجّل الدخول لعرض متابعاتك</h1>
          <Button asChild className="btn-brand mt-4"><Link to="/auth">تسجيل الدخول</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">متابعاتي</h1>
        </div>

        {sellers && sellers.length > 0 && (
          <Card className="p-4 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Store className="h-4 w-4" />البائعون الذين تتابعهم ({sellers.length})</h3>
            <div className="flex flex-wrap gap-2">
              {sellers.map((s) => (
                <Link key={s.id} to={`/seller/${s.id}`} className="px-3 py-1.5 rounded-full bg-secondary text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  {s.shop_name || "بائع"}
                </Link>
              ))}
            </div>
          </Card>
        )}

        <h2 className="text-lg font-semibold mb-4">آخر المنتجات</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : listings && listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {listings.map((l: any) => (
              <ListingCard
                key={l.id}
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
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">لا تتابع أي بائع بعد</p>
            <Button asChild variant="outline"><Link to="/search">تصفح البائعين</Link></Button>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default FollowingFeed;
